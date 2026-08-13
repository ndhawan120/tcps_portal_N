"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  href: string;
  created_at: string;
};

function timeAgo(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,message,href,created_at")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(25);
    const next = (data ?? []) as Notification[];
    setItems(next);
    setUnreadCount(next.length);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("notifications-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    const timer = window.setInterval(load, 30000);
    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((current) => current.filter((item) => item.id !== id));
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    setItems([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#5d4038] hover:bg-[#f0f0f0]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-[#fafafa]" aria-hidden="true" />}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-outline-variant bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <div><p className="font-semibold text-on-surface">Notifications</p><p className="text-xs text-on-surface-variant">{unreadCount} unread</p></div>
              {unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">Mark all read</button>}
            </div>
            <div className="max-h-[min(70vh,480px)] overflow-y-auto">
              {items.length === 0 ? <div className="px-5 py-10 text-center text-sm text-on-surface-variant">You're all caught up.</div> : items.map((item) => (
                <Link key={item.id} href={item.href} onClick={() => markRead(item.id)} className="block border-b border-outline-variant px-4 py-3 hover:bg-surface-container">
                  <div className="flex items-start gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><p className="text-sm font-semibold text-on-surface">{item.title}</p>{item.message && <p className="mt-0.5 text-xs leading-5 text-on-surface-variant">{item.message}</p>}<p className="mt-1 text-[11px] text-on-surface-variant">{timeAgo(item.created_at)}</p></div></div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
