import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import RealtimeRefresh from "@/components/RealtimeRefresh";

const PER_STATUSES = ["not_started", "draft", "pending_approval", "approved", "rejected"];
const EXAM_STATUSES = ["not_started", "in_progress", "scheduled", "passed", "failed"];
const EXAM_RESULTS = ["No Result", "Pass", "Fail", "Exempt"];

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: employees } = await supabase.from("profiles").select("id").eq("role", "employee");
  const ids = (employees ?? []).map((employee) => employee.id);

  const [{ data: objectives }, { data: exams }] = await Promise.all([
    ids.length ? supabase.from("per_objectives").select("status").in("user_id", ids) : Promise.resolve({ data: [] as { status: string }[] }),
    ids.length ? supabase.from("exams").select("status,result").in("user_id", ids) : Promise.resolve({ data: [] as { status: string; result: string | null }[] }),
  ]);

  const perCounts: Record<string, number> = Object.fromEntries(PER_STATUSES.map((status) => [status, 0]));
  const examCounts: Record<string, number> = Object.fromEntries(EXAM_STATUSES.map((status) => [status, 0]));
  const resultCounts: Record<string, number> = Object.fromEntries(EXAM_RESULTS.map((result) => [result, 0]));

  for (const row of objectives ?? []) perCounts[row.status] = (perCounts[row.status] ?? 0) + 1;
  for (const row of exams ?? []) {
    examCounts[row.status] = (examCounts[row.status] ?? 0) + 1;
    const result = row.result ?? "No Result";
    resultCounts[result] = (resultCounts[result] ?? 0) + 1;
  }

  return (
    <div>
      <RealtimeRefresh />
      <Nav role="admin" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface">Reports</h1>
        <p className="text-sm text-on-surface-variant mt-1 mb-8">Company-wide employee progress and status reporting.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StatusChart title="PER Objective Status" counts={perCounts} statuses={PER_STATUSES} />
          <StatusChart title="Exam Status" counts={examCounts} statuses={EXAM_STATUSES} />
          <StatusChart title="Exam Result" counts={resultCounts} statuses={EXAM_RESULTS} />
        </div>
      </main>
    </div>
  );
}

function StatusChart({ title, counts, statuses }: { title: string; counts: Record<string, number>; statuses: string[] }) {
  const max = Math.max(1, ...statuses.map((status) => counts[status] ?? 0));
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <h2 className="text-lg font-bold text-on-surface mb-5">{title}</h2>
      <div className="space-y-4">
        {statuses.map((status) => {
          const count = counts[status] ?? 0;
          return (
            <div key={status}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize">{status.replaceAll("_", " ")}</span>
                <span className="font-semibold">{count}</span>
              </div>
              <div className="h-3 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
