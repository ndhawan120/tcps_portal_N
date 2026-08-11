"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SubmitObjectiveButton({
  objectiveId,
}: {
  objectiveId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async () => {
    setLoading(true);
    await supabase
      .from("per_objectives")
      .update({ status: "pending_approval", submitted_at: new Date().toISOString() })
      .eq("id", objectiveId);
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={loading}
      className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "Submitting..." : "Submit for approval"}
    </button>
  );
}
