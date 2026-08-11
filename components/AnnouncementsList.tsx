"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
};

export default function AnnouncementsList({
  announcements,
  compact = false,
  currentUserId,
  canDeleteAny = false,
}: {
  announcements: Announcement[];
  compact?: boolean;
  currentUserId?: string;
  canDeleteAny?: boolean;
}) {
  const [filter, setFilter] = useState("all");
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
    if (!confirm("Delete this update?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    router.refresh();
  };

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex justify-end">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs border border-outline-variant rounded-md px-2 py-1.5 bg-surface-container-lowest"
          >
            <option value="all">All time</option>
            {monthOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className={`bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-y-auto ${
          compact ? "max-h-72" : "max-h-[32rem]"
        }`}
      >
        {filtered.length === 0 && (
          <p className="p-5 text-sm text-on-surface-variant">
            No updates {filter !== "all" ? "for this month" : "yet"}.
          </p>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-on-surface">{a.title}</p>
              {(canDeleteAny || a.author_id === currentUserId) && (
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-xs text-on-surface-variant hover:text-error shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1 whitespace-pre-wrap">
              {a.body}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-2">
              {a.author_name} ·{" "}
              {new Date(a.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
