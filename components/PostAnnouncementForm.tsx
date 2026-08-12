"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RichTextEditor from "./RichTextEditor";

type Props = {
  userId: string;
  editing?: {
    id: string;
    title: string;
    body: string;
  } | null;
  onCancelEdit?: () => void;
};

export default function PostAnnouncementForm({ userId, editing = null, onCancelEdit }: Props) {
  const [open, setOpen] = useState(Boolean(editing));
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (editing) {
      setOpen(true);
      setTitle(editing.title);
      setBody(editing.body);
    }
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanBody = body.trim();
    if (!title.trim() || !cleanBody || cleanBody === "<br>") {
      setError("Please enter both a title and update details.");
      setLoading(false);
      return;
    }

    const result = editing
      ? await supabase.from("announcements").update({ title: title.trim(), body: cleanBody }).eq("id", editing.id)
      : await supabase.from("announcements").insert({ author_id: userId, title: title.trim(), body: cleanBody });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setTitle("");
    setBody("");
    setOpen(false);
    onCancelEdit?.();
    router.refresh();
  };

  if (!open && !editing) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90"
      >
        + Post Update
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-on-surface">{editing ? "Edit Update" : "Post an Update"}</h2>
      </div>
      <input
        type="text"
        required
        placeholder="Title (e.g. December exam deadline)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm bg-background"
      />
      <RichTextEditor value={body} onChange={setBody} placeholder="Write your update. Use bold, lists, links and headings..." />
      {error && <p className="text-sm text-error bg-error-container/40 border border-error/30 rounded-md px-2 py-1.5">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50">
          {loading ? "Saving..." : editing ? "Save changes" : "Post"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setBody("");
            onCancelEdit?.();
          }}
          className="text-sm font-medium px-4 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
