import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import EmployeeDirectory from "./EmployeeDirectory";
import { countPassedExams, TOTAL_EXAMS, TOTAL_OBJECTIVES } from "@/lib/progress";

export default async function EmployeesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (profile.role !== "admin" && profile.role !== "manager") redirect("/dashboard");

  let peopleQuery = supabase.from("profiles").select("*").order("last_name", { ascending: true });
  if (profile.role === "manager") peopleQuery = peopleQuery.eq("role", "employee").eq("manager_id", profile.id);
  const { data: people, error: peopleError } = await peopleQuery;
  const peopleList = people ?? [];
  const peopleIds = peopleList.map((person) => person.id);
  const [{ data: objectives }, { data: exams }] = await Promise.all([
    peopleIds.length ? supabase.from("per_objectives").select("user_id, objective_number, status").in("user_id", peopleIds) : Promise.resolve({ data: [] as any[] }),
    peopleIds.length ? supabase.from("exams").select("user_id, exam_module, status, result").in("user_id", peopleIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const objectivesByUser: Record<string, any[]> = {};
  for (const objective of objectives ?? []) (objectivesByUser[objective.user_id] ??= []).push(objective);
  const examsByUser: Record<string, any[]> = {};
  for (const exam of exams ?? []) (examsByUser[exam.user_id] ??= []).push(exam);
  const peopleRows = peopleList.map((person) => {
    const personObjectives = objectivesByUser[person.id] ?? [];
    const personExams = examsByUser[person.id] ?? [];
    const approvedPER = personObjectives.filter((item) => item.status === "approved").length;
    const pendingPER = personObjectives.filter((item) => item.status === "pending_approval").length;
    const passedExams = countPassedExams(personExams);
    return { ...person, approvedPER, pendingPER, passedExams, perProgress: Math.round((approvedPER / TOTAL_OBJECTIVES) * 100), examProgress: Math.round((passedExams / TOTAL_EXAMS) * 100) };
  });
  const totalMembers = peopleRows.length;
  const activeMembers = peopleRows.filter((person) => person.status === "active").length;
  const totalAdmins = peopleRows.filter((person) => person.role === "admin").length;
  const activeAdmins = peopleRows.filter((person) => person.role === "admin" && person.status === "active").length;
  const totalManagers = peopleRows.filter((person) => person.role === "manager").length;
  const activeManagers = peopleRows.filter((person) => person.role === "manager" && person.status === "active").length;
  const totalEmployees = peopleRows.filter((person) => person.role === "employee").length;
  const activeEmployees = peopleRows.filter((person) => person.role === "employee" && person.status === "active").length;
  const pendingPERApprovals = peopleRows.reduce((total, person) => total + person.pendingPER, 0);
  const { count: pendingRegistrations } = profile.role === "admin" ? await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending") : { count: 0 };

  return <div><RealtimeRefresh /><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()} /><main className="max-w-7xl mx-auto px-6 py-8">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-2xl font-bold text-on-surface">{profile.role === "admin" ? "People" : "Employees"}</h1><p className="text-sm text-on-surface-variant mt-1">{profile.role === "admin" ? "View every employee, manager, and admin in the office." : "View only your immediate team and their progress."}</p></div><a href="/employees/export" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-semibold hover:opacity-90">Download Excel</a></div>
    {profile.role === "admin" ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <StatCard label="Total Members" value={totalMembers} active={activeMembers} activeLabel="Active" />
      <StatCard label="Total Admins" value={totalAdmins} active={activeAdmins} activeLabel="Active" />
      <StatCard label="Total Managers" value={totalManagers} active={activeManagers} activeLabel="Active" />
      <StatCard label="Total Employees" value={totalEmployees} active={activeEmployees} activeLabel="Active" />
      <Link href="/approvals" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:border-primary transition block"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Pending Registrations</p><p className="text-3xl font-extrabold text-primary mt-1">{pendingRegistrations ?? 0}</p><p className="text-xs font-semibold text-on-surface-variant mt-2">{pendingRegistrations ? "Awaiting approval →" : "No pending requests"}</p></Link>
    </div> : <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"><StatCard label="Total Employees" value={totalEmployees} /><StatCard label="Active Employees" value={activeEmployees} /><StatCard label="Pending PER Approvals" value={pendingPERApprovals} /></div>}
    {peopleError && <div className="mb-6 rounded-lg border border-error/30 bg-error-container/40 px-4 py-3"><p className="text-sm font-semibold text-error">Could not load people.</p><p className="text-xs text-error mt-1">{peopleError.message}</p></div>}
    <EmployeeDirectory employees={peopleRows} isAdmin={profile.role === "admin"} />
  </main></div>;
}
function StatCard({ label, value, active, activeLabel = "" }: { label: string; value: number; active?: number; activeLabel?: string }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p><p className="text-3xl font-extrabold text-primary mt-1">{value}</p>{active !== undefined && <p className="text-xs font-semibold text-on-surface-variant mt-2"><span className="text-primary">{active}</span> {activeLabel}</p>}</div>; }
