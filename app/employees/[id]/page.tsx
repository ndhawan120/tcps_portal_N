import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";
import { ACCA_EXAMS } from "@/lib/accaExams";

export default async function EmployeeDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: viewer } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!viewer || (viewer.role !== "admin" && viewer.role !== "manager")) redirect("/dashboard");

  const { data: employee } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!employee) notFound();
  if (viewer.role === "manager" && employee.manager_id !== viewer.id) redirect("/employees");

  const [{ data: objectives }, { data: exams }, { data: manager }] = await Promise.all([
    supabase.from("per_objectives").select("*").eq("user_id", employee.id).order("objective_number"),
    supabase.from("exams").select("*").eq("user_id", employee.id),
    employee.manager_id ? supabase.from("profiles").select("first_name,last_name").eq("id", employee.manager_id).single() : Promise.resolve({ data: null }),
  ]);

  const approved = (objectives ?? []).filter(o => o.status === "approved").length;
  const pending = (objectives ?? []).filter(o => o.status === "pending_approval").length;
  const passed = (exams ?? []).filter(e => e.status === "passed").length;
  const perPct = Math.round((approved / 22) * 100);
  const examPct = Math.round((passed / 13) * 100);

  const examMap = Object.fromEntries((exams ?? []).map(e => [e.exam_module, e]));
  const objectiveMap = Object.fromEntries((objectives ?? []).map(o => [o.objective_number, o]));

  return <div>
    <Nav role={viewer.role} name={`${viewer.first_name ?? ""} ${viewer.last_name ?? ""}`} />
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6"><div><Link href="/employees" className="text-xs text-primary hover:underline">← Back to employees</Link><h1 className="text-2xl font-bold text-on-surface mt-2">{employee.first_name} {employee.last_name}</h1><p className="text-sm text-on-surface-variant">{employee.email}</p></div><a href={`/employees/export?user_id=${employee.id}`} className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary">Download Excel</a></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Info label="Department" value={employee.department ?? "—"} /><Info label="Role" value={employee.role} /><Info label="Manager" value={manager ? `${manager.first_name} ${manager.last_name}` : "—"} /><Info label="Account status" value={String(employee.status).replaceAll("_", " ")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ProgressCard label="PER Progress" value={approved} total={22} percent={perPct} detail={`${pending} pending approval`} />
        <ProgressCard label="Exam Progress" value={passed} total={13} percent={examPct} detail={`${(exams ?? []).filter(e => e.status === "in_progress").length} in progress`} />
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6"><h2 className="text-lg font-bold text-on-surface mb-4">PER Objectives</h2><div className="divide-y divide-outline-variant">{ACCA_OBJECTIVES.map(o => { const row = objectiveMap[o.number]; return <div key={o.number} className="py-3 flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-on-surface">{o.number}. {o.title}</p><p className="text-xs text-on-surface-variant">{row?.evidence_notes ?? "No evidence submitted"}</p></div><StatusPill status={row?.status ?? "not_started"} /></div>; })}</div></section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><h2 className="text-lg font-bold text-on-surface mb-4">Exams</h2><div className="divide-y divide-outline-variant">{ACCA_EXAMS.map(e => { const row = examMap[e.name]; return <div key={e.code} className="py-3 flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-on-surface">{e.code} — {e.name}</p><p className="text-xs text-on-surface-variant">Result: {row?.result ?? "No Result"}{row?.next_sitting ? ` · Next sitting: ${new Date(row.next_sitting).toLocaleDateString()}` : ""}</p></div><StatusPill status={row?.status ?? "not_started"} /></div>; })}</div></section>
    </main>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p><p className="text-sm font-semibold text-on-surface mt-1 capitalize">{value}</p></div>; }
function ProgressCard({ label, value, total, percent, detail }: { label: string; value: number; total: number; percent: number; detail: string }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><div className="flex justify-between"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p><span className="text-sm font-bold text-primary">{percent}%</span></div><p className="text-3xl font-extrabold text-primary mt-1">{value}/{total}</p><div className="h-3 rounded-full bg-surface-container overflow-hidden mt-3"><div className="h-full bg-primary" style={{ width: `${Math.min(100, percent)}%` }} /></div><p className="text-xs text-on-surface-variant mt-2">{detail}</p></div>; }
