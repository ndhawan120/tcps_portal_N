import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import ExamsTracker from "./ExamsTracker";

export default async function ExamsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const [{ data: exams, error: examsError }, { data: objectives, error: objectivesError }] = await Promise.all([
    supabase.from("exams").select("id, exam_module, level, status, exam_date, next_sitting, result, created_at, updated_at").eq("user_id", user.id),
    supabase.from("per_objectives").select("objective_number, status, evidence_notes, submitted_at, approved_at").eq("user_id", user.id),
  ]);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()} />
      <main className="lg:ml-64 pt-0 lg:pt-[68px]">
        {(examsError || objectivesError) && (
          <div className="mx-4 sm:mx-6 lg:mx-10 mt-5 rounded-lg border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-error">
            Some qualification data could not be loaded. Please refresh and try again.
          </div>
        )}
        <ExamsTracker userId={user.id} exams={exams ?? []} objectives={objectives ?? []} />
      </main>
    </div>
  );
}
