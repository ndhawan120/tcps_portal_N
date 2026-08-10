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
  const router = useRouter();
  const supabase = createClient();

  const decide = async (action: "approved" | "rejected") => {
    setLoading(true);
    await supabase
      .from("per_objectives")
      .update({
        status: action,
        approved_at: action === "approved" ? new Date().toISOString() : null,
        approved_by: actorId,
      })
      .eq("id", objectiveId);

    await supabase.from("approval_history").insert({
      objective_id: objectiveId,
      actor_id: actorId,
      action,
    });

    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => decide("approved")}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => decide("rejected")}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
