"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EvidenceNotesEditor({
  objectiveId,
  currentNotes,
  editable,
}: {
  objectiveId: string;
  currentNotes: string | null;
  editable: boolean;
}) {
  const [notes, setNotes] = useState(currentNotes ?? "");
  const router = useRouter();
  const supabase = createClient();

  const handleBlur = async () => {
    if (!editable) return;
    await supabase
      .from("per_objectives")
      .update({ evidence_notes: notes || null })
      .eq("id", objectiveId);
    router.refresh();
  };

  if (!editable) {
    return notes ? (
      <p className="text-xs text-on-surface-variant mt-1">{notes}</p>
    ) : null;
  }

  return (
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={handleBlur}
      placeholder="Add evidence notes..."
      rows={2}
      className="w-full text-xs border border-outline-variant rounded-md px-2 py-1.5 mt-1 bg-surface-container-lowest"
    />
  );
}
