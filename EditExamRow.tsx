"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUSES = ["not_started", "in_progress", "scheduled", "passed", "failed"] as const;

export default function EditExamRow({
  examId,
  currentStatus,
  currentResult,
}: {
  examId: string;
  currentStatus: string;
  currentResult: string | null;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [result, setResult] = useState(currentResult ?? "");
  const router = useRouter();
  const supabase = createClient();

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    await supabase.from("exams").update({ status: newStatus }).eq("id", examId);
    router.refresh();
  };

  const handleResultBlur = async () => {
    await supabase.from("exams").update({ result: result || null }).eq("id", examId);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Remove this exam record?")) return;
    await supabase.from("exams").delete().eq("id", examId);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={handleStatusChange}
        className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest capitalize"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Result"
        value={result}
        onChange={(e) => setResult(e.target.value)}
        onBlur={handleResultBlur}
        className="text-xs border border-outline-variant rounded-md px-2 py-1 w-20"
      />
      <button
        onClick={handleDelete}
        className="text-xs text-on-surface-variant hover:text-error"
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}
