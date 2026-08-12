import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RealtimeRefresh from "@/components/RealtimeRefresh";

const PER_STATUSES = ["not_started", "draft", "pending_approval", "approved", "rejected"];
const EXAM_STATUSES = ["not_started", "in_progress", "scheduled", "passed", "failed"];
const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

export default async function ManagerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || (profile.role !== "manager" && profile.role !== "admin")) redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  const teamQuery = isAdmin ? supabase.from("profiles").select("*").neq("id", user.id) : supabase.from("profiles").select("*").eq("manager_id", user.id);
  const { data: team } = await teamQuery;
  const teamIds = (team ?? []).map(t => t.id);

  const { data: allObjectives } = teamIds.length ? await supabase.from("per_objectives").select("user_id,status").in("user_id", teamIds) : { data: [] as any[] };
  const { data: allExams } = teamIds.length ? await supabase.from("exams").select("user_id,status").in("user_id", teamIds) : { data: [] as any[] };
  const { data: pending } = teamIds.length ? await supabase.from("per_objectives").select("id,user_id,objective_number,title,submitted_at").in("user_id", teamIds).eq("status", "pending_approval").order("submitted_at") : { data: [] as any[] };

  const perCounts: Record<string, number> = Object.fromEntries(PER_STATUSES.map(s => [s, 0]));
  const examCounts: Record<string, number> = Object.fromEntries(EXAM_STATUSES.map(s => [s, 0]));
  const progressByUser: Record<string, number> = {};
  const examsPassedByUser: Record<string, number> = {};
  for (const row of allObjectives ?? []) { perCounts[row.status] = (perCounts[row.status] ?? 0) + 1; if (row.status === "approved") progressByUser[row.user_id] = (progressByUser[row.user_id] ?? 0) + 1; }
  for (const row of allExams ?? []) { examCounts[row.status] = (examCounts[row.status] ?? 0) + 1; if (row.status === "passed") examsPassedByUser[row.user_id] = (examsPassedByUser[row.user_id] ?? 0) + 1; }
  const avgProgress = team?.length ? Math.round(team.reduce((sum, t) => sum + ((progressByUser[t.id] ?? 0) / TOTAL_OBJECTIVES) * 100, 0) / team.length) : 0;

  return <div><RealtimeRefresh /><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="max-w-7xl mx-auto px-6 py-8">
    <div className="flex items-center justify-between mb-1"><div><h1 className="text-2xl font-bold text-on-surface">{isAdmin ? "Company Reporting" : "Team Overview"}</h1><p className="text-sm text-on-surface-variant">{isAdmin ? "Overall reporting across employees." : "Only your immediate team is included."}</p></div><Link href="/employees" className="text-sm font-semibold text-primary hover:underline">{isAdmin ? "Employees →" : "My Team →"}</Link></div>
    <p className="text-sm text-on-surface-variant mb-8">Average PER progress: <span className="font-semibold text-primary">{avgProgress}%</span> · Pending approvals: <span className="font-semibold text-primary">{perCounts.pending_approval}</span></p>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"><StatusChart title="PER Objective Status" counts={perCounts} statuses={PER_STATUSES} /><StatusChart title="Exam Status" counts={examCounts} statuses={EXAM_STATUSES} /></div>

    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-8"><h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">Pending PER Approvals ({pending?.length ?? 0})</h2><div className="divide-y divide-outline-variant">{(pending ?? []).map(p => <div key={p.id} className="px-5 py-3 flex items-center justify-between"><div><p className="text-sm font-medium text-on-surface">Objective {p.objective_number}: {p.title}</p><p className="text-xs text-on-surface-variant">Submitted {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "—"}</p></div><Link href="/approvals" className="text-xs font-semibold text-primary hover:underline">Review →</Link></div>)}{(!pending || pending.length === 0) && <p className="px-5 py-4 text-sm text-on-surface-variant">No approvals pending right now.</p>}</div></section>

    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"><div className="px-5 pt-5 pb-3"><h2 className="text-lg font-bold text-on-surface">{isAdmin ? "Everyone" : "Team"}</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold"><tr><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">PER Progress</th><th className="text-left px-5 py-3">Exams Passed</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-outline-variant">{(team ?? []).map(t => { const approved = progressByUser[t.id] ?? 0; const passed = examsPassedByUser[t.id] ?? 0; const pct = Math.round((approved / TOTAL_OBJECTIVES) * 100); return <tr key={t.id}><td className="px-5 py-3 font-medium text-on-surface">{t.first_name} {t.last_name}</td><td className="px-5 py-3 text-on-surface-variant">{approved}/{TOTAL_OBJECTIVES} ({pct}%)</td><td className="px-5 py-3 text-on-surface-variant">{passed}/{TOTAL_EXAMS}</td><td className="px-5 py-3"><Link href={`/employees/${t.id}`} className="text-xs font-medium text-primary hover:underline">View details →</Link></td></tr>; })}{(!team || team.length === 0) && <tr><td colSpan={4} className="px-5 py-6 text-center text-on-surface-variant">{isAdmin ? "No other users yet." : "No direct reports assigned yet."}</td></tr>}</tbody></table></div></section>
  </main></div>;
}

function StatusChart({ title, counts, statuses }: { title: string; counts: Record<string, number>; statuses: string[] }) { const max = Math.max(1, ...statuses.map(s => counts[s] ?? 0)); return <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><h2 className="text-lg font-bold text-on-surface mb-5">{title}</h2><div className="space-y-4">{statuses.map(s => { const n = counts[s] ?? 0; return <div key={s}><div className="flex justify-between text-xs mb-1"><span className="capitalize">{s.replaceAll("_", " ")}</span><span className="font-semibold">{n}</span></div><div className="h-3 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div></div>; })}</div></section>; }
