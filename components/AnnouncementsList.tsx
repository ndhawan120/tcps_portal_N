"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PostAnnouncementForm from "./PostAnnouncementForm";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
};

function sanitizeHtml(html: string) {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "");
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "A", "IMG"]);
  doc.body.querySelectorAll("*").forEach((el) => {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }
    Array.from(el.attributes).forEach((attr) => {
      if (el.tagName === "A" && attr.name === "href" && /^https?:\/\//i.test(attr.value)) return;
      if (el.tagName === "IMG" && ["src", "alt", "width", "height", "style"].includes(attr.name)) return;
      el.removeAttribute(attr.name);
    });
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
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
  const router = useRouter();
  const supabase = createClient();

  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    announcements.forEach((a) => {
      const d = new Date(a.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      seen.set(key, label);
    });
    return Array.from(seen.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [announcements]);

  const filtered = announcements.filter((a) => {
    if (filter === "all") return true;
    const d = new Date(a.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return key === filter;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this update? This cannot be undone.")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      alert(`Could not delete the update: ${error.message}`);
      return;
    }
    router.refresh();
  };

  return (
    <div>
      {editing && !compact && <PostAnnouncementForm userId={currentUserId ?? ""} editing={{ id: editing.id, title: editing.title, body: editing.body }} onCancelEdit={() => setEditing(null)} />}

      {!compact && <div className="mb-3 flex justify-end"><select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-xs border border-outline-variant rounded-md px-2 py-1.5 bg-surface-container-lowest"><option value="all">All time</option>{monthOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>}

      <div className={`bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-y-auto ${compact ? "max-h-72" : "max-h-[32rem]"}`}>
        {filtered.length === 0 && <p className="p-5 text-sm text-on-surface-variant">No updates {filter !== "all" ? "for this month" : "yet"}.</p>}
        {filtered.map((a) => {
          const canManage = canEditAny || a.author_id === currentUserId;
          return (
            <div key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-on-surface">{a.title}</p>
                {canManage && !compact && <div className="flex items-center gap-2 shrink-0"><button onClick={() => setEditing(a)} className="text-xs font-medium text-primary hover:underline">Edit</button>{(canDeleteAny || a.author_id === currentUserId) && <button onClick={() => handleDelete(a.id)} className="text-xs font-medium text-error hover:underline">Delete</button>}</div>}
                {canManage && compact && (canDeleteAny || a.author_id === currentUserId) && <button onClick={() => handleDelete(a.id)} className="text-xs text-on-surface-variant hover:text-error shrink-0">✕</button>}
              </div>
              <div className="mt-2 prose prose-sm max-w-none text-on-surface [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_h4]:font-bold [&_h4]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:italic [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.body) }} />
              <p className="text-[11px] text-on-surface-variant mt-2">{a.author_name} · {new Date(a.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
