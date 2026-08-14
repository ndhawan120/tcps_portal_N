import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import { ACCA_EXAMS } from "@/lib/accaExams";
import { countPassedExams, TOTAL_EXAMS, TOTAL_OBJECTIVES } from "@/lib/progress";

const PER_STATUSES = ["not_started", "draft", "pending_approval", "approved", "rejected"];
const EXAM_STATUSES = ["not_started", "in_progress", "scheduled", "passed", "failed"];
const EXAM_RESULTS = ["No Result", "Pass", "Fail", "Exempt"];
const slugify=(value:string)=>value.toLowerCase().trim().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const employeePath=(member:any)=>`/employees/${member.profile_slug||slugify(`${member.first_name??""} ${member.last_name??""}`)||member.id}`;

export default async function ManagerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || (profile.role !== "manager" && profile.role !== "admin")) redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  let teamQuery = supabase.from("profiles").select("*").eq("role", "employee").eq("status", "active");
  if (!isAdmin) teamQuery = teamQuery.eq("manager_id", user.id);

  const { data: team } = await teamQuery.order("last_name", { ascending: true });
  const teamMembers = team ?? [];
  const teamIds = teamMembers.map((member) => member.id);

  const [{ data: allObjectives }, { data: allExams }, { data: pending }] = await Promise.all([
    teamIds.length ? supabase.from("per_objectives").select("user_id,status").in("user_id", teamIds) : Promise.resolve({ data: [] as any[] }),
    teamIds.length ? supabase.from("exams").select("user_id,exam_module,status,result").in("user_id", teamIds) : Promise.resolve({ data: [] as any[] }),
    teamIds.length ? supabase.from("per_objectives").select("id,user_id,objective_number,title,submitted_at").in("user_id", teamIds).eq("status", "pending_approval").order("submitted_at", { ascending: true }) : Promise.resolve({ data: [] as any[] }),
  ]);

  const perCounts: Record<string, number> = Object.fromEntries(PER_STATUSES.map((status) => [status, 0]));
  const examCounts: Record<string, number> = Object.fromEntries(EXAM_STATUSES.map((status) => [status, 0]));
  const resultCounts: Record<string, number> = Object.fromEntries(EXAM_RESULTS.map((result) => [result, 0]));
  const progressByUser: Record<string, number> = {};
  const examsByUser: Record<string, any[]> = {};

  for (const row of allObjectives ?? []) {
    perCounts[row.status] = (perCounts[row.status] ?? 0) + 1;
    if (row.status === "approved") progressByUser[row.user_id] = (progressByUser[row.user_id] ?? 0) + 1;
  }

  for (const row of allExams ?? []) {
    examCounts[row.status] = (examCounts[row.status] ?? 0) + 1;
    const result = row.result ?? "No Result";
    resultCounts[result] = (resultCounts[result] ?? 0) + 1;
    (examsByUser[row.user_id] ??= []).push(row);
  }

  const avgProgress = teamMembers.length
    ? Math.round(teamMembers.reduce((sum, member) => sum + ((progressByUser[member.id] ?? 0) / TOTAL_OBJECTIVES) * 100, 0) / teamMembers.length)
    : 0;

  const passedExamCount = teamMembers.reduce((sum, member) => sum + countPassedExams(examsByUser[member.id] ?? []), 0);
  const totalExamSlots = teamMembers.length * TOTAL_EXAMS;
  const examOverallProgress = totalExamSlots ? Math.round((passedExamCount / totalExamSlots) * 100) : 0;

  return (
    <div>
      <RealtimeRefresh />
      <Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{isAdmin ? "Company Reporting" : "Team Overview"}</h1>
            <p className="text-sm text-on-surface-variant">{isAdmin ? "Overall reporting across active employees." : "Only your immediate active team is included."}</p>
          </div>
          <Link href="/employees" className="text-sm font-semibold text-primary hover:underline">{isAdmin ? "Employees →" : "My Team →"}</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-6">
          <MetricCard label="Team Members" value={teamMembers.length} />
          <MetricCard label="Average PER Progress" value={`${avgProgress}%`} />
          <MetricCard label="Pending PER Approvals" value={perCounts.pending_approval ?? 0} />
          <MetricCard label="Exam Progress" value={`${examOverallProgress}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StatusChart title="PER Objective Status" counts={perCounts} statuses={PER_STATUSES} />
          <StatusChart title="Exam Status" counts={examCounts} statuses={EXAM_STATUSES} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StatusChart title="Exam Result" counts={resultCounts} statuses={EXAM_RESULTS} />
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <h2 className="text-lg font-bold text-on-surface mb-2">PER Approval Queue</h2>
            <p className="text-sm text-on-surface-variant mb-4">Pending submissions from the employees in this reporting scope.</p>
            <Link href="/approvals" className="inline-flex text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary">Review Approvals ({pending?.length ?? 0})</Link>
          </section>
        </div>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-8">
          <h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">Pending PER Approvals ({pending?.length ?? 0})</h2>
          <div className="divide-y divide-outline-variant">
            {(pending ?? []).map((item) => {
              const employee = teamMembers.find((member) => member.id === item.user_id);
              return <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-on-surface">{employee ? `${employee.first_name} ${employee.last_name}` : "Employee"}</p><p className="text-xs text-on-surface-variant">Objective {item.objective_number}: {item.title}</p></div><Link href="/approvals" className="text-xs font-semibold text-primary hover:underline">Review →</Link></div>;
            })}
            {(!pending || pending.length === 0) && <p className="px-5 py-4 text-sm text-on-surface-variant">No approvals pending right now.</p>}
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h2 className="text-lg font-bold text-on-surface">{isAdmin ? "All Employees" : "My Team"}</h2></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold"><tr><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">PER Progress</th><th className="text-left px-5 py-3">Exams Passed</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-outline-variant">
            {teamMembers.map((member) => { const approved = progressByUser[member.id] ?? 0; const passed = countPassedExams(examsByUser[member.id] ?? []); const pct = Math.round((approved / TOTAL_OBJECTIVES) * 100); return <tr key={member.id}><td className="px-5 py-3 font-medium text-on-surface">{member.first_name} {member.last_name}</td><td className="px-5 py-3 text-on-surface-variant">{approved}/{TOTAL_OBJECTIVES} ({pct}%)</td><td className="px-5 py-3 text-on-surface-variant">{passed}/{TOTAL_EXAMS}</td><td className="px-5 py-3"><Link href={employeePath(member)} className="text-xs font-medium text-primary hover:underline">View details →</Link></td></tr>; })}
            {teamMembers.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-on-surface-variant">{isAdmin ? "No active employees yet." : "No active direct reports assigned yet."}</td></tr>}
          </tbody></table></div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">{label}</p><p className="text-3xl font-extrabold text-primary">{value}</p></div>; }
function StatusChart({ title, counts, statuses }: { title: string; counts: Record<string, number>; statuses: string[] }) { const max = Math.max(1, ...statuses.map((status) => counts[status] ?? 0)); return <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><h2 className="text-lg font-bold text-on-surface mb-5">{title}</h2><div className="space-y-4">{statuses.map((status) => { const count = counts[status] ?? 0; return <div key={status}><div className="flex justify-between text-xs mb-1"><span className="capitalize">{status.replaceAll("_", " ")}</span><span className="font-semibold">{count}</span></div><div className="h-3 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(count / max) * 100}%` }} /></div></div>; })}</div></section>; }
