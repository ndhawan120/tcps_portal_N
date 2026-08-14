"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PostAnnouncementForm from "./PostAnnouncementForm";
import { createClient } from "@/lib/supabase/client";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author_name: string;
  source_type?: "tcps" | "acca";
  source_url?: string | null;
  excerpt?: string | null;
};

function sanitizeHtml(html: string) {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "");
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "A", "IMG"]);
  doc.body.querySelectorAll("*").forEach((el) => {
    if (!allowed.has(el.tagName)) { el.replaceWith(...Array.from(el.childNodes)); return; }
    Array.from(el.attributes).forEach((attr) => {
      if (el.tagName === "A" && attr.name === "href" && /^https?:\/\//i.test(attr.value)) return;
      if (el.tagName === "IMG" && ["src", "alt", "width", "height", "style"].includes(attr.name)) return;
      el.removeAttribute(attr.name);
    });
    if (el.tagName === "A") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src") || "";
      if (!src.startsWith("https://") && !src.startsWith("http://") && !src.startsWith("data:image/")) el.remove();
    }
  });
  return doc.body.innerHTML;
}

export default function AnnouncementsList({ announcements, compact = false, currentUserId, canEditAny = false, canDeleteAny = false }: { announcements: Announcement[]; compact?: boolean; currentUserId?: string; canEditAny?: boolean; canDeleteAny?: boolean }) {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    announcements.forEach((a) => {
      const d = new Date(a.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      seen.set(key, d.toLocaleDateString(undefined, { month: "long", year: "numeric" }));
    });
    return Array.from(seen.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [announcements]);

  const filtered = announcements.filter((a) => {
    if (filter === "all") return true;
    const d = new Date(a.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === filter;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this update? This cannot be undone.")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { alert(`Could not delete the update: ${error.message}`); return; }
    router.refresh();
  };

  return (
    <>
      <div>
        {editing && !compact && <PostAnnouncementForm userId={currentUserId ?? ""} editing={{ id: editing.id, title: editing.title, body: editing.body }} onCancelEdit={() => setEditing(null)} />}
        {!compact && <div className="mb-3 flex justify-end"><select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-xs border border-outline-variant rounded-md px-2 py-1.5 bg-surface-container-lowest"><option value="all">All time</option>{monthOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>}
        <div className={`bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-y-auto ${compact ? "max-h-72" : "max-h-[32rem]"}`}>
          {filtered.length === 0 && <p className="p-5 text-sm text-on-surface-variant">No updates {filter !== "all" ? "for this month" : "yet"}.</p>}
          {filtered.map((a) => {
            const canManage = canEditAny || a.author_id === currentUserId;
            const isAcca = a.source_type === "acca";
            return (
              <div key={a.id} className="p-4 hover:bg-surface-container/40 transition-colors cursor-pointer" onClick={() => setSelected(a)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelected(a); }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${isAcca ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"}`}>{isAcca ? "ACCA" : "TCPS"}</span></div><p className="text-sm font-semibold text-on-surface">{a.title}</p></div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>{canManage && !compact && <><button onClick={() => setEditing(a)} className="text-xs font-medium text-primary hover:underline">Edit</button>{(canDeleteAny || a.author_id === currentUserId) && <button onClick={() => handleDelete(a.id)} className="text-xs font-medium text-error hover:underline">Delete</button>}</>}{canManage && compact && (canDeleteAny || a.author_id === currentUserId) && <button onClick={() => handleDelete(a.id)} className="text-xs text-on-surface-variant hover:text-error shrink-0">✕</button>}</div>
                </div>
                <div className="relative mt-2 max-h-28 overflow-hidden"><div className="prose prose-sm max-w-none text-on-surface [&_p]:mb-2 [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.body) }} /><div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-container-lowest to-transparent" /></div>
                <p className="text-[11px] text-on-surface-variant mt-2">{a.author_name} · {new Date(a.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                {isAcca && a.source_url ? <a href={a.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex text-[11px] text-primary font-semibold mt-2 hover:underline">Read the full announcement on ACCA →</a> : null}
                {!isAcca && <p className="text-[11px] text-primary font-medium mt-2">Read full update →</p>}
              </div>
            );
          })}
        </div>
      </div>
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true" onClick={() => setSelected(null)}><div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between gap-4 p-5 border-b border-outline-variant"><div className="min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-primary/10 text-primary">{selected.source_type === "acca" ? "ACCA" : "TCPS"}</span></div><h2 className="text-xl font-bold text-on-surface">{selected.title}</h2><p className="text-xs text-on-surface-variant mt-1">{selected.author_name} · {new Date(selected.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p></div><button onClick={() => setSelected(null)} aria-label="Close announcement" className="shrink-0 w-9 h-9 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container text-lg">×</button></div><div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6 prose prose-sm sm:prose-base max-w-none text-on-surface" dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.body) }} />{selected.source_type === "acca" && selected.source_url && <div className="px-6 pb-6"><a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary">Read the full announcement on ACCA →</a></div>}</div></div>}
    </>
  );
}
