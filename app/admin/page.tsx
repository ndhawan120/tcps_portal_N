import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RoleSelect from "./RoleSelect";
import DepartmentSelect from "./DepartmentSelect";
import StatusSelect from "./StatusSelect";
import ManagerSelect from "./ManagerSelect";
import AddUserModal from "./AddUserModal";
import RegistrationApproval from "./RegistrationApproval";
import RealtimeRefresh from "@/components/RealtimeRefresh";

const PER_STATUSES = ["not_started", "draft", "pending_approval", "approved", "rejected"];
const EXAM_STATUSES = ["not_started", "in_progress", "scheduled", "passed", "failed"];
const EXAM_RESULTS = ["No Result", "Pass", "Fail", "Exempt"];

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: allUsers } = await supabase.from("profiles").select("*").order("last_name", { ascending: true });
  const users = allUsers ?? [];
  const employees = users.filter((u) => u.role === "employee");
  const employeeIds = employees.map((u) => u.id);
  const managers = users.filter((u) => u.role === "manager" || u.role === "admin");

  const [{ data: allObjectives }, { data: allExams }] = await Promise.all([
    employeeIds.length
      ? supabase.from("per_objectives").select("status").in("user_id", employeeIds)
      : Promise.resolve({ data: [] as { status: string }[] }),
    employeeIds.length
      ? supabase.from("exams").select("status,result").in("user_id", employeeIds)
      : Promise.resolve({ data: [] as { status: string; result: string | null }[] }),
  ]);

  const perCounts: Record<string, number> = Object.fromEntries(PER_STATUSES.map((status) => [status, 0]));
  const examCounts: Record<string, number> = Object.fromEntries(EXAM_STATUSES.map((status) => [status, 0]));
  const resultCounts: Record<string, number> = Object.fromEntries(EXAM_RESULTS.map((result) => [result, 0]));

  for (const objective of allObjectives ?? []) perCounts[objective.status] = (perCounts[objective.status] ?? 0) + 1;
  for (const exam of allExams ?? []) {
    examCounts[exam.status] = (examCounts[exam.status] ?? 0) + 1;
    const result = exam.result ?? "No Result";
    resultCounts[result] = (resultCounts[result] ?? 0) + 1;
  }

  const pendingUsers = employees.filter((u) => u.status === "pending").length;
  const activeUsers = employees.filter((u) => u.status === "active").length;
  const pendingPER = perCounts.pending_approval ?? 0;

  return (
    <div>
      <RealtimeRefresh />
      <Nav role="admin" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Admin Panel</h1>
            <p className="text-sm text-on-surface-variant mt-1">Manage employees, reporting relationships, approvals and company reporting.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/employees" className="text-sm font-medium px-4 py-2 rounded-md border border-outline-variant">View Employees</Link>
            <AddUserModal />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <AdminStatCard label="Total Employees" value={employees.length} />
          <AdminStatCard label="Active Employees" value={activeUsers} />
          <AdminStatCard label="Pending Signups" value={pendingUsers} />
          <AdminStatCard label="Pending PER Approvals" value={pendingPER} />
        </div>

        <RegistrationApproval />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StatusChart title="PER Objective Status" counts={perCounts} statuses={PER_STATUSES} />
          <StatusChart title="Exam Status" counts={examCounts} statuses={EXAM_STATUSES} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StatusChart title="Exam Result" counts={resultCounts} statuses={EXAM_RESULTS} />
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <h2 className="text-lg font-bold text-on-surface mb-2">Approval Workflow</h2>
            <p className="text-sm text-on-surface-variant mb-4">Submitted PER objectives appear in the approval queue. Managers see only their direct reports; admins can review all employee submissions.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/approvals" className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary">Open PER Approvals ({pendingPER})</Link>
              <Link href="/employees" className="text-sm font-semibold px-4 py-2 rounded-md border border-outline-variant">Employee Directory</Link>
            </div>
          </section>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <h2 className="text-lg font-bold text-on-surface">Employee Accounts</h2>
            <p className="text-xs text-on-surface-variant mt-1">Manage access, role, department and immediate reporting manager.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                <tr><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Email</th><th className="text-left px-5 py-3">Department</th><th className="text-left px-5 py-3">Role</th><th className="text-left px-5 py-3">Manager</th><th className="text-left px-5 py-3">Status</th><th className="px-5 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap">{employee.first_name} {employee.last_name}</td>
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{employee.email}</td>
                    <td className="px-5 py-3"><DepartmentSelect userId={employee.id} currentDepartment={employee.department} /></td>
                    <td className="px-5 py-3"><RoleSelect userId={employee.id} currentRole={employee.role} /></td>
                    <td className="px-5 py-3"><ManagerSelect userId={employee.id} currentManagerId={employee.manager_id} managers={managers} /></td>
                    <td className="px-5 py-3"><StatusSelect userId={employee.id} currentStatus={employee.status} /></td>
                    <td className="px-5 py-3"><Link href={`/employees/${employee.id}`} className="text-xs font-medium text-primary hover:underline whitespace-nowrap">View profile →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function AdminStatCard({ label, value }: { label: string; value: number }) {
  return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">{label}</p><p className="text-3xl font-extrabold text-primary">{value}</p></div>;
}

function StatusChart({ title, counts, statuses }: { title: string; counts: Record<string, number>; statuses: string[] }) {
  const max = Math.max(1, ...statuses.map((status) => counts[status] ?? 0));
  return <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><h2 className="text-lg font-bold text-on-surface mb-5">{title}</h2><div className="space-y-4">{statuses.map((status) => { const count = counts[status] ?? 0; return <div key={status}><div className="flex justify-between text-xs mb-1"><span className="capitalize">{status.replaceAll("_", " ")}</span><span className="font-semibold">{count}</span></div><div className="h-3 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(count / max) * 100}%` }} /></div></div>; })}</div></section>;
}
