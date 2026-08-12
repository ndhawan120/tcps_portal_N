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

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: allUsers }, { data: allObjectives }, { data: allExams }] = await Promise.all([
    supabase.from("profiles").select("*").order("last_name", { ascending: true }),
    supabase.from("per_objectives").select("status"),
    supabase.from("exams").select("status"),
  ]);
  const users = allUsers ?? [];
  const managers = users.filter(u => u.role === "manager" || u.role === "admin");
  const perCounts: Record<string, number> = Object.fromEntries(PER_STATUSES.map(s => [s, 0]));
  const examCounts: Record<string, number> = Object.fromEntries(EXAM_STATUSES.map(s => [s, 0]));
  for (const o of allObjectives ?? []) perCounts[o.status] = (perCounts[o.status] ?? 0) + 1;
  for (const e of allExams ?? []) examCounts[e.status] = (examCounts[e.status] ?? 0) + 1;
  const pendingUsers = users.filter(u => u.status === "pending" || u.status === "pending_approval").length;
  const activeUsers = users.filter(u => u.status === "active").length;
  const inactiveUsers = users.filter(u => u.status === "inactive" || u.status === "rejected").length;

  return <div><RealtimeRefresh /><Nav role="admin" name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} /><main className="max-w-7xl mx-auto px-6 py-8">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"><div><h1 className="text-2xl font-bold text-on-surface">Admin Panel</h1><p className="text-sm text-on-surface-variant mt-1">Manage users, reporting relationships and company-wide progress.</p></div><div className="flex gap-2"><Link href="/employees" className="text-sm font-medium px-4 py-2 rounded-md border border-outline-variant">View Employees</Link><AddUserModal /></div></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><AdminStatCard label="Total Users" value={users.length} /><AdminStatCard label="Active Users" value={activeUsers} /><AdminStatCard label="Pending Approval" value={pendingUsers} /><AdminStatCard label="Inactive / Rejected" value={inactiveUsers} /></div>
    <RegistrationApproval />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"><StatusChart title="PER Objective Status" counts={perCounts} statuses={PER_STATUSES} /><StatusChart title="Exam Status" counts={examCounts} statuses={EXAM_STATUSES} /></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"><Link href="/employees" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:bg-surface-container"><p className="text-sm font-bold text-on-surface">Employees</p><p className="text-xs text-on-surface-variant mt-1">Employee profiles, progress and exports.</p><p className="text-xs font-semibold text-primary mt-4">View employees →</p></Link><Link href="/approvals" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:bg-surface-container"><p className="text-sm font-bold text-on-surface">Approvals</p><p className="text-xs text-on-surface-variant mt-1">Review pending PER submissions.</p><p className="text-xs font-semibold text-primary mt-4">Review approvals →</p></Link><Link href="/manager" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:bg-surface-container"><p className="text-sm font-bold text-on-surface">Reporting</p><p className="text-xs text-on-surface-variant mt-1">Detailed team/company reporting.</p><p className="text-xs font-semibold text-primary mt-4">Open reporting →</p></Link></div>
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"><div className="px-5 pt-5 pb-4"><h2 className="text-lg font-bold text-on-surface">User Accounts</h2><p className="text-xs text-on-surface-variant mt-1">Manage account access, role, department and reporting manager.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold"><tr><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Email</th><th className="text-left px-5 py-3">Department</th><th className="text-left px-5 py-3">Role</th><th className="text-left px-5 py-3">Manager</th><th className="text-left px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-outline-variant">{users.map(u => <tr key={u.id}><td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap">{u.first_name} {u.last_name}</td><td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{u.email}</td><td className="px-5 py-3"><DepartmentSelect userId={u.id} currentDepartment={u.department} /></td><td className="px-5 py-3"><RoleSelect userId={u.id} currentRole={u.role} /></td><td className="px-5 py-3"><ManagerSelect userId={u.id} currentManagerId={u.manager_id} managers={managers} /></td><td className="px-5 py-3"><StatusSelect userId={u.id} currentStatus={u.status} /></td><td className="px-5 py-3"><Link href={`/employees/${u.id}`} className="text-xs font-medium text-primary hover:underline whitespace-nowrap">View profile →</Link></td></tr>)}</tbody></table></div></div>
  </main></div>;
}
function AdminStatCard({ label, value }: { label: string; value: number }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">{label}</p><p className="text-3xl font-extrabold text-primary">{value}</p></div>; }
function StatusChart({ title, counts, statuses }: { title: string; counts: Record<string, number>; statuses: string[] }) { const max = Math.max(1, ...statuses.map(s => counts[s] ?? 0)); return <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><h2 className="text-lg font-bold text-on-surface mb-5">{title}</h2><div className="space-y-4">{statuses.map(s => { const n = counts[s] ?? 0; return <div key={s}><div className="flex justify-between text-xs mb-1"><span className="capitalize">{s.replaceAll("_", " ")}</span><span className="font-semibold">{n}</span></div><div className="h-3 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div></div>; })}</div></section>; }
