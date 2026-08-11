"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PostAnnouncementForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("announcements").insert({
      author_id: userId,
      title,
      body,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setTitle("");
    setBody("");
    setOpen(false);
    router.refresh();
  };

  if (!open) {
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
    <form
      onSubmit={handleSubmit}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-4 space-y-3"
    >
      <input
        type="text"
        required
        placeholder="Title (e.g. 'December exam deadline')"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
      />
      <textarea
        required
        placeholder="Details..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium px-4 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
