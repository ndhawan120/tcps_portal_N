import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";

export default async function TeamReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "manager") redirect("/dashboard");
  const { data: employees } = await supabase.from("profiles").select("id,first_name,last_name").eq("role", "employee").eq("manager_id", user.id).eq("status", "active");
  const ids = (employees ?? []).map((p) => p.id);
  const { data: objectives } = ids.length ? await supabase.from("per_objectives").select("status").in("user_id", ids) : { data: [] as { status: string }[] };
  const { data: exams } = ids.length ? await supabase.from("exams").select("status,result").in("user_id", ids) : { data: [] as { status: string; result: string | null }[] };
  const per = { not_started: 0, draft: 0, pending_approval: 0, approved: 0, rejected: 0 };
  const exam = { not_started: 0, in_progress: 0, scheduled: 0, passed: 0, failed: 0 };
  for (const row of objectives ?? []) if (row.status in per) per[row.status as keyof typeof per]++;
  for (const row of exams ?? []) if (row.status in exam) exam[row.status as keyof typeof exam]++;
  return <div className="min-h-screen bg-[#f9f9f9]"><Nav role="manager" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="lg:ml-64 pt-[92px] px-6 pb-10"><div className="max-w-7xl mx-auto"><h1 className="text-3xl font-extrabold">Team Reports</h1><p className="text-sm text-on-surface-variant mt-1 mb-7">Reports are limited to employees assigned to you.</p><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Chart title="PER Objective Status" data={per}/><Chart title="Exam Status" data={exam}/></div></div></main></div>;
}
function Chart({ title, data }: { title: string; data: Record<string, number> }) { const max = Math.max(1, ...Object.values(data)); return <section className="bg-white border border-outline-variant rounded-xl p-5"><h2 className="text-lg font-bold mb-5">{title}</h2>{Object.entries(data).map(([key,value]) => <div key={key} className="mb-4"><div className="flex justify-between text-xs mb-1"><span className="capitalize">{key.replaceAll("_", " ")}</span><b>{value}</b></div><div className="h-3 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{width:`${(value/max)*100}%`}}/></div></div>)}</section>; }
