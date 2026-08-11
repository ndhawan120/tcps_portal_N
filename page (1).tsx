import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import SubmitObjectiveButton from "./SubmitObjectiveButton";
import AddObjectiveModal from "./AddObjectiveModal";
import EvidenceNotesEditor from "./EvidenceNotesEditor";

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-on-surface">PER Objectives</h1>
          <AddObjectiveModal
            userId={user.id}
            existingNumbers={(objectives ?? []).map((o) => o.objective_number)}
          />
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
          {(objectives ?? []).map((o) => {
            const editable = o.status === "not_started" || o.status === "draft";
            return (
              <div key={o.id} className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-surface">
                    Objective {o.objective_number}: {o.title}
                  </p>
                  <EvidenceNotesEditor
                    objectiveId={o.id}
                    currentNotes={o.evidence_notes}
                    editable={editable}
                  />
                  {o.submitted_at && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Submitted {new Date(o.submitted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusPill status={o.status} />
                  {editable && <SubmitObjectiveButton objectiveId={o.id} />}
                </div>
              </div>
            );
          })}
          {(!objectives || objectives.length === 0) && (
            <p className="p-5 text-sm text-on-surface-variant">
              No objectives yet. Click &quot;+ Add Objective&quot; to add your first one.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
