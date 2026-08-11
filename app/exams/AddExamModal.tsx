"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LEVELS = [
  "Applied Knowledge",
  "Applied Skills",
  "Strategic Professional",
  "Essentials",
] as const;

const STATUSES = ["not_started", "in_progress", "scheduled", "passed", "failed"] as const;

export default function AddExamModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [examModule, setExamModule] = useState("");
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [status, setStatus] = useState<string>("not_started");
  const [nextSitting, setNextSitting] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("exams").insert({
      user_id: userId,
      exam_module: examModule,
      level,
      status,
      next_sitting: nextSitting || null,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    setExamModule("");
    setLevel(LEVELS[0]);
    setStatus("not_started");
    setNextSitting("");
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90"
      >
        + Add Exam
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md p-6 border border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-on-surface">Add Exam</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Exam module (e.g. Financial Management)"
                value={examModule}
                onChange={(e) => setExamModule(e.target.value)}
                className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
              />
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm bg-surface-container-lowest"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm bg-surface-container-lowest"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">
                  Next sitting date (optional)
                </label>
                <input
                  type="date"
                  value={nextSitting}
                  onChange={(e) => setNextSitting(e.target.value)}
                  className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary rounded-md py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add exam"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
