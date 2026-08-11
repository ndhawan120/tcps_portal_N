"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ApproveButton({
  objectiveId,
  actorId,
}: {
  objectiveId: string;
  actorId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const decide = async (action: "approved" | "rejected") => {
    let comments: string | null = null;

    if (action === "rejected") {
      comments = window.prompt("Reason for rejecting this PER objective (optional):")?.trim() || null;
    }

    setLoading(true);
    setError(null);

    const { data: updated, error: updateError } = await supabase
      .from("per_objectives")
      .update({
        status: action,
        approved_at: action === "approved" ? new Date().toISOString() : null,
        approved_by: actorId,
      })
      .eq("id", objectiveId)
      .eq("status", "pending_approval")
      .select("id")
      .maybeSingle();

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    if (!updated) {
      setLoading(false);
      setError("This request is no longer pending. Refresh the page and try again.");
      return;
    }

    const { error: historyError } = await supabase.from("approval_history").insert({
      objective_id: objectiveId,
      actor_id: actorId,
      action,
      comments,
    });

    setLoading(false);

    if (historyError) {
      setError(historyError.message);
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => decide("approved")}
          disabled={loading}
          className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Approve"}
        </button>
        <button
          onClick={() => decide("rejected")}
          disabled={loading}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-error max-w-xs">Couldn&apos;t save: {error}</p>
      )}
    </div>
  );
}
