"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusPill from "@/components/StatusPill";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";

type ExistingRow = {
  status: string;
  evidence_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
};

export default function ObjectivesList({
  userId,
  existingByNumber,
}: {
  userId: string;
  existingByNumber: Record<number, ExistingRow>;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
      {ACCA_OBJECTIVES.map((obj) => (
        <ObjectiveRow
          key={obj.number}
          userId={userId}
          number={obj.number}
          title={obj.title}
          category={obj.category}
          essential={obj.essential}
          existing={existingByNumber[obj.number]}
        />
      ))}
    </div>
  );
}

function ObjectiveRow({
  userId,
  number,
  title,
  category,
  essential,
  existing,
}: {
  userId: string;
  number: number;
  title: string;
  category: string;
  essential: boolean;
  existing?: ExistingRow;
}) {
  const status = existing?.status ?? "not_started";
  const [notes, setNotes] = useState(existing?.evidence_notes ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const editable = status === "not_started" || status === "draft" || status === "rejected";

  const saveDraft = async () => {
    setSaving(true);
    await supabase.from("per_objectives").upsert(
      {
        user_id: userId,
        objective_number: number,
        title,
        evidence_notes: notes || null,
        status: "draft",
      },
      { onConflict: "user_id,objective_number" }
    );
    setSaving(false);
    router.refresh();
  };

  const submit = async () => {
    setSaving(true);
    await supabase.from("per_objectives").upsert(
      {
        user_id: userId,
        objective_number: number,
        title,
        evidence_notes: notes || null,
        status: "pending_approval",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,objective_number" }
    );
    setSaving(false);
    router.refresh();
  };

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-on-surface">
              {number}. {title}
            </p>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                essential
                  ? "bg-amber-100 text-amber-800"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {essential ? "Essential" : category}
            </span>
          </div>
          <div className="flex gap-4 text-xs text-on-surface-variant mt-1">
            <span>
              Applied:{" "}
              {existing?.submitted_at
                ? new Date(existing.submitted_at).toLocaleDateString()
                : "—"}
            </span>
            <span>
              Approved:{" "}
              {existing?.approved_at
                ? new Date(existing.approved_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {editable ? (
        <div className="mt-3 flex gap-2 items-start">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add evidence notes..."
            rows={2}
            className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1.5 bg-background"
          />
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      ) : (
        existing?.evidence_notes && (
          <p className="mt-2 text-xs text-on-surface-variant">{existing.evidence_notes}</p>
        )
      )}
    </div>
  );
}
