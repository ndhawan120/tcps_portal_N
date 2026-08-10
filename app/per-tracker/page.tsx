import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import SubmitObjectiveButton from "./SubmitObjectiveButton";

export default async function PerTrackerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: objectives } = await supabase
    .from("per_objectives")
    .select("*")
    .eq("user_id", user.id)
    .order("objective_number");

  return (
    <div>
      <Nav role={profile?.role ?? "employee"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-6">PER Objectives</h1>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
          {(objectives ?? []).map((o) => (
            <div key={o.id} className="p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">
                  Objective {o.objective_number}: {o.title}
                </p>
                {o.evidence_notes && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    {o.evidence_notes}
                  </p>
                )}
                {o.submitted_at && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    Submitted {new Date(o.submitted_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <StatusPill status={o.status} />
              {(o.status === "not_started" || o.status === "draft") && (
                <SubmitObjectiveButton objectiveId={o.id} />
              )}
            </div>
          ))}
          {(!objectives || objectives.length === 0) && (
            <p className="p-5 text-sm text-on-surface-variant">
              No objectives yet. Ask an admin to set these up for your role.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
