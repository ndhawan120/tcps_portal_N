import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import { countPassedExams, TOTAL_EXAMS, TOTAL_OBJECTIVES } from "@/lib/progress";

const PER_STATUSES = ["not_started", "draft", "pending_approval", "approved", "rejected"];
const EXAM_STATUSES = ["not_started", "in_progress", "scheduled", "passed", "failed"];
const employeePath = (member: any) => member.profile_slug ? `/employees/${member.profile_slug}` : "/employees";

export default async function TeamPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || (profile.role !== "manager" && profile.role !== "admin") || profile.status !== "active") redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  let teamQuery = supabase.from("profiles").select("id,first_name,last_name,department,job_title,manager_id,profile_slug,status").eq("role", "employee").eq("status", "active");
  if (!isAdmin) teamQuery = teamQuery.eq("manager_id", user.id);
  const { data: team } = await teamQuery.order("last_name", { ascending: true });
  const teamMembers = team ?? [];
  const teamIds = teamMembers.map((member) => member.id);

  const [{ data: allObjectives }, { data: allExams }, { data: pending }] = await Promise.all([
    teamIds.length ? supabase.from("per_objectives").select("user_id,status").in("user_id", teamIds) : Promise.resolve({ data: [] as any[] }),
    teamIds.length ? supabase.from("exams").select("user_id,status,result").in("user_id", teamIds) : Promise.resolve({ data: [] as any[] }),
    teamIds.length ? supabase.from("per_objectives").select("id,user_id,objective_number,title,submitted_at").in("user_id", teamIds).eq("status", "pending_approval").order("submitted_at", { ascending: true }) : Promise.resolve({ data: [] as any[] }),
  ]);

  const perCounts: Record<string, number> = Object.fromEntries(PER_STATUSES.map((status) => [status, 0]));
  const examCounts: Record<string, number> = Object.fromEntries(EXAM_STATUSES.map((status) => [status, 0]));
  const progressByUser: Record<string, number> = {};
  const examsByUser: Record<string, any[]> = {};
  for (const row of allObjectives ?? []) { perCounts[row.status] = (perCounts[row.status] ?? 0) + 1; if (row.status === "approved") progressByUser[row.user_id] = (progressByUser[row.user_id] ?? 0) + 1; }
  for (const row of allExams ?? []) { examCounts[row.status] = (examCounts[row.status] ?? 0) + 1; (examsByUser[row.user_id] ??= []).push(row); }

  const avgProgress = teamMembers.length ? Math.round(teamMembers.reduce((sum, member) => sum + ((progressByUser[member.id] ?? 0) / TOTAL_OBJECTIVES) * 100, 0) / teamMembers.length) : 0;
  const passedExamCount = teamMembers.reduce((sum, member) => sum + countPassedExams(examsByUser[member.id] ?? []), 0);
  const totalExamSlots = teamMembers.length * TOTAL_EXAMS;
  const examOverallProgress = totalExamSlots ? Math.round((passedExamCount / totalExamSlots) * 100) : 0;
  const atRisk = teamMembers.filter((member) => ((progressByUser[member.id] ?? 0) / TOTAL_OBJECTIVES) < 0.25).slice(0, 5);

  return <div><RealtimeRefresh /><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6"><div><h1 className="text-2xl sm:text-3xl font-bold text-on-surface">{isAdmin ? "Workforce Overview" : "Team Overview"}</h1><p className="text-sm text-on-surface-variant mt-1">{isAdmin ? "Manage workforce visibility, team relationships and employee progress." : "Manage your direct reports and the actions that need attention."}</p></div><Link href="/employees" className="text-sm font-semibold text-primary hover:underline">{isAdmin ? "Open People →" : "Open My Team →"}</Link></div>

    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><MetricCard label={isAdmin ? "Active Employees" : "Team Members"} value={teamMembers.length} /><MetricCard label="Average PER Progress" value={`${avgProgress}%`} /><MetricCard label="Pending PER Approvals" value={perCounts.pending_approval ?? 0} href="/approvals" /><MetricCard label="Exam Progress" value={`${examOverallProgress}%`} /></section>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <section className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-bold text-on-surface">Team Progress</h2><p className="text-xs text-on-surface-variant mt-1">Use Reports for detailed analysis; this view is focused on action.</p></div><Link href="/reports" className="text-xs font-semibold text-primary hover:underline">Open Reports →</Link></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><StatusChart title="PER Status" counts={perCounts} statuses={PER_STATUSES} /><StatusChart title="Exam Status" counts={examCounts} statuses={EXAM_STATUSES} /></div></section>
      <section className="bg-error/5 border border-error/20 rounded-xl p-5"><div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold uppercase tracking-wide text-error">Needs Attention</h2><span className="text-xs font-semibold text-error">{atRisk.length}</span></div>{atRisk.length ? <div className="space-y-3">{atRisk.map((member) => <div key={member.id} className="bg-white border border-outline-variant rounded-lg p-3">{member.profile_slug ? <Link href={employeePath(member)} className="text-sm font-semibold text-on-surface hover:text-primary">{member.first_name} {member.last_name}</Link> : <span className="text-sm font-semibold text-on-surface">{member.first_name} {member.last_name}</span>}<p className="text-xs text-error mt-1">PER progress below 25%</p>{member.profile_slug && <Link href={employeePath(member)} className="text-xs font-semibold text-primary hover:underline mt-2 inline-block">View employee →</Link>}</div>)}</div> : <p className="text-sm text-on-surface-variant">No employees currently need attention.</p>}</section>
    </div>

    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-6"><div className="px-5 pt-5 pb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold text-on-surface">PER Approval Queue</h2><p className="text-xs text-on-surface-variant mt-1">Only pending submissions from this reporting scope.</p></div><Link href="/approvals" className="inline-flex text-xs font-semibold px-3 py-2 rounded-md bg-primary text-on-primary">Review Approvals ({pending?.length ?? 0})</Link></div><div className="divide-y divide-outline-variant">{(pending ?? []).slice(0, 6).map((item) => { const employee = teamMembers.find((member) => member.id === item.user_id); return <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4"><div>{employee?.profile_slug ? <Link href={employeePath(employee)} className="text-sm font-medium text-on-surface hover:text-primary">{`${employee.first_name} ${employee.last_name}`}</Link> : <span className="text-sm font-medium text-on-surface">Employee</span>}<p className="text-xs text-on-surface-variant">Objective {item.objective_number}: {item.title}</p></div><Link href="/approvals" className="text-xs font-semibold text-primary hover:underline">Review →</Link></div>; })}{(!pending || pending.length === 0) && <p className="px-5 py-5 text-sm text-on-surface-variant">No approvals pending right now.</p>}</div></section>

    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"><div className="px-5 pt-5 pb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold text-on-surface">{isAdmin ? "Active Employees" : "My Team"}</h2><p className="text-xs text-on-surface-variant mt-1">Open an employee profile for detailed progress and actions.</p></div><Link href="/employees" className="text-xs font-semibold text-primary hover:underline">People →</Link></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold"><tr><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Department</th><th className="text-left px-5 py-3">PER Progress</th><th className="text-left px-5 py-3">Exams Passed</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-outline-variant">{teamMembers.map((member) => { const approved = progressByUser[member.id] ?? 0; const passed = countPassedExams(examsByUser[member.id] ?? []); const pct = Math.round((approved / TOTAL_OBJECTIVES) * 100); return <tr key={member.id} className="hover:bg-surface-container-low"><td className="px-5 py-3 font-medium text-on-surface">{member.profile_slug ? <Link href={employeePath(member)} className="hover:text-primary">{member.first_name} {member.last_name}</Link> : <span>{member.first_name} {member.last_name}</span>}</td><td className="px-5 py-3 text-on-surface-variant">{member.department || "—"}</td><td className="px-5 py-3 text-on-surface-variant">{approved}/{TOTAL_OBJECTIVES} ({pct}%)</td><td className="px-5 py-3 text-on-surface-variant">{passed}/{TOTAL_EXAMS}</td><td className="px-5 py-3">{member.profile_slug && <Link href={employeePath(member)} className="text-xs font-medium text-primary hover:underline">View details →</Link>}</td></tr>; })}{teamMembers.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-on-surface-variant">{isAdmin ? "No active employees yet." : "No active direct reports assigned yet."}</td></tr>}</tbody></table></div></section>
  </main></div>;
}
function MetricCard({ label, value, href }: { label: string; value: string | number; href?: string }) { const content = <><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">{label}</p><p className="text-3xl font-extrabold text-primary">{value}</p></>; return href ? <Link href={href} className="block bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:border-primary transition">{content}</Link> : <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">{content}</div>; }
function StatusChart({ title, counts, statuses }: { title: string; counts: Record<string, number>; statuses: string[] }) { const max = Math.max(1, ...statuses.map((status) => counts[status] ?? 0)); return <section><h3 className="text-sm font-bold text-on-surface mb-4">{title}</h3><div className="space-y-3">{statuses.map((status) => { const count = counts[status] ?? 0; return <div key={status}><div className="flex justify-between text-xs mb-1"><span className="capitalize text-on-surface-variant">{status.replaceAll("_", " ")}</span><span className="font-semibold text-on-surface">{count}</span></div><div className="h-2.5 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(count / max) * 100}%` }} /></div></div>; })}</div></section>; }
