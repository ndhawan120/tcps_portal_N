import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

const PER = ["not_started", "draft", "pending_approval", "approved", "rejected"];
const EXAMS = ["not_started", "in_progress", "scheduled", "passed", "failed"];

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role) || profile.status !== "active") redirect("/dashboard");
  const peopleQuery = profile.role === "admin" ? supabase.from("profiles").select("id,department").eq("role", "employee").eq("status", "active") : supabase.from("profiles").select("id,department").eq("role", "employee").eq("manager_id", user.id).eq("status", "active");
  const { data: people } = await peopleQuery;
  const ids = (people ?? []).map((p) => p.id);
  const [{ data: objectives }, { data: exams }] = await Promise.all([
    ids.length ? supabase.from("per_objectives").select("status,user_id").in("user_id", ids) : Promise.resolve({ data: [] as { status: string; user_id: string }[] }),
    ids.length ? supabase.from("exams").select("status,result,user_id").in("user_id", ids) : Promise.resolve({ data: [] as { status: string; result: string | null; user_id: string }[] }),
  ]);
  const per: Record<string, number> = Object.fromEntries(PER.map((s) => [s, 0]));
  const exam: Record<string, number> = Object.fromEntries(EXAMS.map((s) => [s, 0]));
  for (const row of objectives ?? []) if (row.status in per) per[row.status]++;
  for (const row of exams ?? []) if (row.status in exam) exam[row.status]++;
  const passed = (exams ?? []).filter((e) => e.result === "pass").length;
  const examPassRate = exams?.length ? Math.round((passed / exams.length) * 100) : 0;
  const approved = per.approved ?? 0;
  const perApprovalRate = objectives?.length ? Math.round((approved / objectives.length) * 100) : 0;
  const departments = Array.from(new Set((people ?? []).map((p) => p.department).filter(Boolean))) as string[];

  return <div className="min-h-screen bg-[#f9f9f9]"><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="lg:ml-64 pt-[92px] px-4 sm:px-6 pb-10"><div className="max-w-7xl mx-auto space-y-7">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><div><h1 className="text-3xl font-extrabold">{profile.role === "admin" ? "Organisation Reports" : "Team Reports"}</h1><p className="text-sm text-on-surface-variant mt-1">{profile.role === "admin" ? "Organisation-wide performance analysis for active employees." : "Performance analysis for your assigned employees only."}</p></div><div className="flex items-center gap-3"><a href="/reports/export" className="inline-flex items-center rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold hover:opacity-90">Generate Report</a><Link href="/team" className="text-sm font-semibold text-primary hover:underline">Back to {profile.role === "admin" ? "Workforce" : "Team"} →</Link></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Metric title="Active Employees" value={ids.length}/><Metric title="PER Approval Rate" value={`${perApprovalRate}%`}/><Metric title="Exam Pass Rate" value={`${examPassRate}%`}/><Metric title="Departments" value={departments.length}/></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Chart title="PER Objective Distribution" data={per}/><Chart title="Exam Status Distribution" data={exam}/></div>
    <section className="bg-white border border-outline-variant rounded-xl p-5"><div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-bold">Report Actions</h2><p className="text-xs text-on-surface-variant mt-1">Generate an Excel report containing employee-level PER and exam summaries.</p></div><Link href="/employees" className="text-xs font-semibold text-primary hover:underline">Open People →</Link></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Link href="/team" className="rounded-lg border border-outline-variant p-4 hover:border-primary"><p className="text-sm font-semibold">Workforce / Team</p><p className="text-xs text-on-surface-variant mt-1">Manage people and progress.</p></Link><Link href="/approvals" className="rounded-lg border border-outline-variant p-4 hover:border-primary"><p className="text-sm font-semibold">Approvals</p><p className="text-xs text-on-surface-variant mt-1">Review pending PER submissions.</p></Link><Link href="/employees" className="rounded-lg border border-outline-variant p-4 hover:border-primary"><p className="text-sm font-semibold">People Directory</p><p className="text-xs text-on-surface-variant mt-1">Open employee profiles and organisation records.</p></Link></div></section>
  </div></main></div>;
}
function Metric({ title, value }: { title: string; value: string | number }) { return <div className="bg-white border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase text-on-surface-variant">{title}</p><p className="text-2xl font-extrabold mt-2 text-primary">{value}</p></div>; }
function Chart({ title, data }: { title: string; data: Record<string, number> }) { const max = Math.max(1, ...Object.values(data)); return <section className="bg-white border border-outline-variant rounded-xl p-5"><h2 className="text-lg font-bold mb-5">{title}</h2>{Object.entries(data).map(([key,value]) => <div key={key} className="mb-4"><div className="flex justify-between text-xs mb-1"><span className="capitalize text-on-surface-variant">{key.replaceAll("_", " ")}</span><b>{value}</b></div><div className="h-3 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width:`${(value/max)*100}%`}} /></div></div>)}</section>; }
