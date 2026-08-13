import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";

const PER = ["not_started", "draft", "pending_approval", "approved", "rejected"];
const EXAMS = ["not_started", "in_progress", "scheduled", "passed", "failed"];

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) redirect("/dashboard");
  const people = profile.role === "admin" ? await supabase.from("profiles").select("id").eq("role", "employee").eq("status", "active") : await supabase.from("profiles").select("id").eq("role", "employee").eq("manager_id", user.id).eq("status", "active");
  const ids = (people.data ?? []).map((p) => p.id);
  const [{ data: objectives }, { data: exams }] = await Promise.all([
    ids.length ? supabase.from("per_objectives").select("status").in("user_id", ids) : Promise.resolve({ data: [] as { status: string }[] }),
    ids.length ? supabase.from("exams").select("status").in("user_id", ids) : Promise.resolve({ data: [] as { status: string }[] }),
  ]);
  const per: Record<string, number> = Object.fromEntries(PER.map((s) => [s, 0]));
  const exam: Record<string, number> = Object.fromEntries(EXAMS.map((s) => [s, 0]));
  for (const row of objectives ?? []) if (row.status in per) per[row.status]++;
  for (const row of exams ?? []) if (row.status in exam) exam[row.status]++;
  return <div className="min-h-screen bg-[#f9f9f9]"><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="lg:ml-64 pt-[92px] px-6 pb-10"><div className="max-w-7xl mx-auto space-y-7"><div><h1 className="text-3xl font-extrabold">{profile.role === "admin" ? "Organisation Reports" : "Team Reports"}</h1><p className="text-sm text-on-surface-variant mt-1">{profile.role === "admin" ? "Company-wide progress." : "Only your assigned employees are included."}</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Metric title="Employees" value={ids.length}/><Metric title="Pending PER" value={per.pending_approval}/><Metric title="Approved PER" value={per.approved}/><Metric title="Exams Passed" value={exam.passed}/></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Chart title="PER Objective Status" data={per}/><Chart title="Exam Status" data={exam}/></div></div></main></div>;
}
function Metric({ title, value }: { title: string; value: number }) { return <div className="bg-white border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase text-on-surface-variant">{title}</p><p className="text-2xl font-extrabold mt-2">{value}</p></div>; }
function Chart({ title, data }: { title: string; data: Record<string, number> }) { const max = Math.max(1, ...Object.values(data)); return <section className="bg-white border border-outline-variant rounded-xl p-5"><h2 className="text-lg font-bold mb-5">{title}</h2>{Object.entries(data).map(([key,value]) => <div key={key} className="mb-4"><div className="flex justify-between text-xs mb-1"><span className="capitalize">{key.replaceAll("_", " ")}</span><b>{value}</b></div><div className="h-3 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{width:`${(value/max)*100}%`}} /></div></div>)}</section>; }
