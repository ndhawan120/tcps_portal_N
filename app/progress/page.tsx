import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import ObjectivesList from "../per-tracker/ObjectivesList";
import ExamsList from "../exams/ExamsList";

export default async function ProgressPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const [{ data: objectives }, { data: exams }] = await Promise.all([
    supabase
      .from("per_objectives")
      .select("id, objective_number, title, status, evidence_notes, submitted_at, approved_at, approved_by")
      .eq("user_id", user.id),
    supabase
      .from("exams")
      .select("exam_module, status, next_sitting, result")
      .eq("user_id", user.id),
  ]);

  const existingByNumber = Object.fromEntries((objectives ?? []).map((o) => [o.objective_number, o]));
  const existingByModule = Object.fromEntries((exams ?? []).map((e) => [e.exam_module, e]));
  const approved = (objectives ?? []).filter((o) => o.status === "approved").length;
  const passed = (exams ?? []).filter((e) => e.status === "passed" || e.result?.toLowerCase() === "pass").length;

  return (
    <div>
      <Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">My Progress</h1>
        <p className="text-sm text-on-surface-variant mb-6">Manage your PER objectives and ACCA exam progress from one place.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">PER Progress</p>
            <p className="text-3xl font-extrabold text-primary mt-1">{approved}/22</p>
            <p className="text-xs text-on-surface-variant mt-1">Approved objectives</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Exams Passed</p>
            <p className="text-3xl font-extrabold text-primary mt-1">{passed}/13</p>
            <p className="text-xs text-on-surface-variant mt-1">Passed papers</p>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-on-surface mb-1">PER Objectives</h2>
          <p className="text-sm text-on-surface-variant mb-4">Track evidence, submission and approval status.</p>
          <ObjectivesList userId={user.id} existingByNumber={existingByNumber} />
        </section>

        <section>
          <h2 className="text-xl font-bold text-on-surface mb-1">ACCA Exams</h2>
          <p className="text-sm text-on-surface-variant mb-4">Update exam status, sitting date and result.</p>
          <ExamsList userId={user.id} existingByModule={existingByModule} />
        </section>
      </main>
    </div>
  );
}
