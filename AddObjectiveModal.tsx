"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";

export default function AddObjectiveModal({
  userId,
  existingNumbers,
}: {
  userId: string;
  existingNumbers: number[];
}) {
  const [open, setOpen] = useState(false);
  const available = useMemo(
    () => ACCA_OBJECTIVES.filter((o) => !existingNumbers.includes(o.number)),
    [existingNumbers]
  );
  const [selectedNumber, setSelectedNumber] = useState<number | "">(
    available[0]?.number ?? ""
  );
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const essentials = available.filter((o) => o.essential);
  const technical = available.filter((o) => !o.essential);

  const groupedTechnical = technical.reduce<Record<string, typeof technical>>(
    (acc, o) => {
      acc[o.category] ??= [];
      acc[o.category].push(o);
      return acc;
    },
    {}
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNumber === "") return;
    setLoading(true);
    setError(null);

    const chosen = ACCA_OBJECTIVES.find((o) => o.number === selectedNumber);
    if (!chosen) {
      setError("Please choose an objective");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("per_objectives").insert({
      user_id: userId,
      objective_number: chosen.number,
      title: chosen.title,
      evidence_notes: evidenceNotes || null,
      status: "draft",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    setEvidenceNotes("");
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={available.length === 0}
        className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
      >
        + Add Objective
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-lg p-6 border border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-on-surface">Add PER Objective</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              You need all 5 Essentials, plus any 4 of the 17 Technical objectives.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                value={selectedNumber}
                onChange={(e) => setSelectedNumber(Number(e.target.value))}
                className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm bg-surface-container-lowest"
              >
                {essentials.length > 0 && (
                  <optgroup label="Essentials (all 5 required)">
                    {essentials.map((o) => (
                      <option key={o.number} value={o.number}>
                        {o.number}. {o.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                {Object.entries(groupedTechnical).map(([category, objs]) => (
                  <optgroup key={category} label={`Technical — ${category}`}>
                    {objs.map((o) => (
                      <option key={o.number} value={o.number}>
                        {o.number}. {o.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <textarea
                placeholder="Evidence notes (optional — you can add these later)"
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={loading || selectedNumber === ""}
                className="w-full bg-primary text-on-primary rounded-md py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add objective"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
