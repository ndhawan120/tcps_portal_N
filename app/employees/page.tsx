import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RealtimeRefresh from "@/components/RealtimeRefresh";
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

  return (
    <div>
      <RealtimeRefresh />
      <Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div><h1 className="text-2xl font-bold text-on-surface">Employees</h1><p className="text-sm text-on-surface-variant mt-1">{profile.role === "manager" ? "View only your immediate team and their progress." : "View employee information and company-wide progress."}</p></div>
          <a href="/employees/export" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-semibold hover:opacity-90">Download Excel</a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"><StatCard label="Total Employees" value={totalEmployees} /><StatCard label="Active Employees" value={activeEmployees} /><StatCard label="Pending PER Approvals" value={pendingPERApprovals} /></div>

        {employeesError && <div className="mb-6 rounded-lg border border-error/30 bg-error-container/40 px-4 py-3"><p className="text-sm font-semibold text-error">Could not load employees.</p><p className="text-xs text-error mt-1">{employeesError.message}</p></div>}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-5 py-5 border-b border-outline-variant"><h2 className="text-lg font-bold text-on-surface">Employee Directory</h2><p className="text-xs text-on-surface-variant mt-1">{totalEmployees} employee{totalEmployees === 1 ? "" : "s"} found</p></div>
          {employeeRows.length === 0 ? <div className="px-6 py-12 text-center"><p className="text-sm font-semibold text-on-surface">{profile.role === "manager" ? "No direct reports assigned yet." : "No employees found."}</p><p className="text-xs text-on-surface-variant mt-2">{profile.role === "manager" ? "Assign employees to this manager from the Admin panel." : "Employee accounts will appear here automatically."}</p></div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-container text-xs uppercase text-on-surface-variant"><tr><th className="text-left px-5 py-3">Employee</th><th className="text-left px-5 py-3">Department</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">PER</th><th className="text-left px-5 py-3">Exams</th><th className="text-left px-5 py-3">Pending</th><th className="text-left px-5 py-3"></th></tr></thead><tbody className="divide-y divide-outline-variant">
              {employeeRows.map((employee) => <tr key={employee.id} className="hover:bg-surface-container-low"><td className="px-5 py-4"><div className="flex items-center gap-3">{employee.avatar_url ? <img src={employee.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold text-on-surface-variant">{getInitials(employee.first_name, employee.last_name)}</div>}<div><p className="font-semibold text-on-surface">{employee.first_name} {employee.last_name}</p><p className="text-xs text-on-surface-variant">{employee.email}</p></div></div></td><td className="px-5 py-4 text-on-surface-variant">{employee.department || "—"}</td><td className="px-5 py-4"><span className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full capitalize ${employee.status === "active" ? "bg-green-100 text-green-800" : employee.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-surface-container text-on-surface-variant"}`}>{employee.status}</span></td><td className="px-5 py-4"><ProgressMini completed={employee.approvedPER} total={TOTAL_OBJECTIVES} percentage={employee.perProgress} /></td><td className="px-5 py-4"><ProgressMini completed={employee.passedExams} total={TOTAL_EXAMS} percentage={employee.examProgress} /></td><td className="px-5 py-4">{employee.pendingPER > 0 ? <span className="inline-flex text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">{employee.pendingPER}</span> : <span className="text-xs text-on-surface-variant">—</span>}</td><td className="px-5 py-4"><Link href={`/employee/${employee.id}`} className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">View profile →</Link></td></tr>)}
            </tbody></table></div>
          )}
        </div>
      </main>
    </div>
  );
}

function ProgressMini({ completed, total, percentage }: { completed: number; total: number; percentage: number }) { return <div className="min-w-[120px]"><div className="flex justify-between text-xs mb-1"><span className="text-on-surface-variant">{completed}/{total}</span><span className="font-semibold text-primary">{percentage}%</span></div><div className="h-2 bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} /></div></div>; }
function StatCard({ label, value }: { label: string; value: number }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p><p className="text-3xl font-extrabold text-primary mt-1">{value}</p></div>; }
function getInitials(firstName: string | null, lastName: string | null) { return `${firstName?.trim()?.charAt(0) ?? ""}${lastName?.trim()?.charAt(0) ?? ""}`.toUpperCase() || "U"; }
