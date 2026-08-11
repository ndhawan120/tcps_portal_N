import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Nav from "@/components/Nav";
import ObjectivesList from "@/app/per-tracker/ObjectivesList";
import ExamsList from "@/app/exams/ExamsList";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

export default async function EmployeeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Viewing your own profile through this route just sends you to your own pages
  if (params.id === user.id) {
    redirect("/dashboard");
  }

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (viewerProfile?.role !== "manager" && viewerProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  // RLS restricts this to only profiles the viewer is actually allowed to see
  // (their own team if manager, anyone if admin) — returns null otherwise.
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!targetProfile) {
    notFound();
  }

  const { data: objectives } = await supabase
    .from("per_objectives")
    .select("objective_number, status, evidence_notes, submitted_at, approved_at")
    .eq("user_id", params.id);

  const { data: exams } = await supabase
    .from("exams")
    .select("exam_module, status, next_sitting, result")
    .eq("user_id", params.id);

  const existingByNumber = Object.fromEntries(
    (objectives ?? []).map((o) => [o.objective_number, o])
  );
  const existingByModule = Object.fromEntries(
    (exams ?? []).map((e) => [e.exam_module, e])
  );

  const approved = (objectives ?? []).filter((o) => o.status === "approved").length;
  const passed = (exams ?? []).filter((e) => e.status === "passed").length;

  return (
    <div>
      <Nav
        role={viewerProfile?.role ?? "manager"}
        name={`${viewerProfile?.first_name ?? ""} ${viewerProfile?.last_name ?? ""}`}
      />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">
          {targetProfile.first_name} {targetProfile.last_name}
        </h1>
        <p className="text-sm text-on-surface-variant mb-6">
          {targetProfile.email}
          {targetProfile.department ? ` · ${targetProfile.department}` : ""}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">
              PER Progress
            </p>
            <p className="text-3xl font-extrabold text-primary">
              {approved}/{TOTAL_OBJECTIVES}
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">
              Exams Passed
            </p>
            <p className="text-3xl font-extrabold text-primary">
              {passed}/{TOTAL_EXAMS}
            </p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-on-surface mb-3">PER Objectives</h2>
        <div className="mb-8">
          <ObjectivesList
            userId={params.id}
            existingByNumber={existingByNumber}
            readOnly
          />
        </div>

        <h2 className="text-lg font-bold text-on-surface mb-3">Exams</h2>
        <ExamsList userId={params.id} existingByModule={existingByModule} readOnly />
      </main>
    </div>
  );
}
