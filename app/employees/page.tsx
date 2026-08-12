import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  let employeeQuery = supabase.from("profiles").select("*").eq("role", "employee").order("last_name", { ascending: true });
  if (profile.role === "manager") employeeQuery = employeeQuery.eq("manager_id", profile.id);
  const { data: employees, error: employeesError } = await employeeQuery;
  const employeeList = employees ?? [];
  const employeeIds = employeeList.map((employee) => employee.id);
  const [{ data: objectives }, { data: exams }] = await Promise.all([
    employeeIds.length ? supabase.from("per_objectives").select("user_id, objective_number, status").in("user_id", employeeIds) : Promise.resolve({ data: [] as any[] }),
    employeeIds.length ? supabase.from("exams").select("user_id, exam_module, status, result").in("user_id", employeeIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const objectivesByUser: Record<string, any[]> = {};
  for (const objective of objectives ?? []) (objectivesByUser[objective.user_id] ??= []).push(objective);
  const examsByUser: Record<string, any[]> = {};
  for (const exam of exams ?? []) (examsByUser[exam.user_id] ??= []).push(exam);
  const employeeRows = employeeList.map((employee) => {
    const employeeObjectives = objectivesByUser[employee.id] ?? [];
    const employeeExams = examsByUser[employee.id] ?? [];
    const approvedPER = employeeObjectives.filter((item) => item.status === "approved").length;
    const pendingPER = employeeObjectives.filter((item) => item.status === "pending_approval").length;
    const passedExams = countPassedExams(employeeExams);
    return { ...employee, approvedPER, pendingPER, passedExams, perProgress: Math.round((approvedPER / TOTAL_OBJECTIVES) * 100), examProgress: Math.round((passedExams / TOTAL_EXAMS) * 100) };
  });
  const totalEmployees = employeeRows.length;
  const activeEmployees = employeeRows.filter((employee) => employee.status === "active").length;
  const pendingPERApprovals = employeeRows.reduce((total, employee) => total + employee.pendingPER, 0);

  return <div><RealtimeRefresh /><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()} /><main className="max-w-7xl mx-auto px-6 py-8">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-2xl font-bold text-on-surface">Employees</h1><p className="text-sm text-on-surface-variant mt-1">{profile.role === "manager" ? "View only your immediate team and their progress." : "View employee information and company-wide progress."}</p></div><a href="/employees/export" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-semibold hover:opacity-90">Download Excel</a></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"><StatCard label="Total Employees" value={totalEmployees} /><StatCard label="Active Employees" value={activeEmployees} /><StatCard label="Pending PER Approvals" value={pendingPERApprovals} /></div>
    {employeesError && <div className="mb-6 rounded-lg border border-error/30 bg-error-container/40 px-4 py-3"><p className="text-sm font-semibold text-error">Could not load employees.</p><p className="text-xs text-error mt-1">{employeesError.message}</p></div>}
    <EmployeeDirectory employees={employeeRows} isAdmin={profile.role === "admin"} />
  </main></div>;
}

function StatCard({ label, value }: { label: string; value: number }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p><p className="text-3xl font-extrabold text-primary mt-1">{value}</p></div>; }
