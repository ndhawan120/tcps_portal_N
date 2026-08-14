import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import AddUserModal from "./AddUserModal";
import RegistrationApproval from "./RegistrationApproval";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "admin" || profile.status !== "active") redirect("/dashboard");
  const { data: users } = await supabase.from("profiles").select("id,first_name,last_name,email,department,role,custom_role_id,manager_id,status,avatar_url,profile_slug").order("last_name", { ascending: true });
  const people = users ?? [];
  const totalMembers = people.length;
  const activeMembers = people.filter((u) => u.status === "active").length;
  const totalAdmins = people.filter((u) => u.role === "admin").length;
  const activeAdmins = people.filter((u) => u.role === "admin" && u.status === "active").length;
  const totalManagers = people.filter((u) => u.role === "manager").length;
  const activeManagers = people.filter((u) => u.role === "manager" && u.status === "active").length;
  const totalEmployees = people.filter((u) => u.role === "employee").length;
  const activeEmployees = people.filter((u) => u.role === "employee" && u.status === "active").length;
  const [{ count: pendingPER }, { data: exams }, { data: objectives }] = await Promise.all([
    supabase.from("per_objectives").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
    supabase.from("exams").select("user_id, result, status"),
    supabase.from("per_objectives").select("user_id, status"),
  ]);
  const passedExams = (exams ?? []).filter((e) => e.result === "pass").length;
  const examCount = (exams ?? []).length;
  const examPassRate = examCount ? Math.round((passedExams / examCount) * 100) : 0;
  const approvedPER = (objectives ?? []).filter((o) => o.status === "approved").length;
  const perCount = (objectives ?? []).length;
  const perApprovalRate = perCount ? Math.round((approvedPER / perCount) * 100) : 0;

  let lastSignIn: Record<string, string | null> = {};
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (key && url) {
      const admin = createSupabaseAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const authUser of data.users) {
        lastSignIn[authUser.id] = authUser.last_sign_in_at ?? null;
      }
    }
  } catch {
    lastSignIn = {};
  }

  const departmentMap: Record<string, { total: number; passed: number }> = {};
  for (const exam of exams ?? []) {
    const department = people.find((p) => p.id === exam.user_id)?.department || "Other";
    if (!departmentMap[department]) departmentMap[department] = { total: 0, passed: 0 };
    departmentMap[department].total += 1;
    if (exam.result === "pass") departmentMap[department].passed += 1;
  }
  const departmentStats = Object.entries(departmentMap)
    .map(([department, value]) => ({ department, rate: value.total ? Math.round((value.passed / value.total) * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 6);

  return <div><RealtimeRefresh /><Nav role="admin" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6"><div><h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Admin Dashboard</h1><p className="text-sm text-on-surface-variant mt-1">Organization-level overview. Use People for the complete office directory and Team for progress management.</p></div><div className="flex flex-wrap gap-2"><Link href="/employees/export" className="text-sm font-semibold px-4 py-2 rounded-md border border-outline-variant hover:bg-surface-container">Export Data</Link><AddUserModal /></div></div>
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><AdminStatCard label="Total Members" value={totalMembers} active={activeMembers} /><AdminStatCard label="Total Admins" value={totalAdmins} active={activeAdmins} /><AdminStatCard label="Total Managers" value={totalManagers} active={activeManagers} /><AdminStatCard label="Total Employees" value={totalEmployees} active={activeEmployees} /></section>
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"><ProgressCard label="Global PER Approval" value={perApprovalRate} /><ProgressCard label="Exam Pass Rate" value={examPassRate} /><div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-3">Pass Rates by Department</p>{departmentStats.length === 0 ? <p className="text-sm text-on-surface-variant">No exam results yet.</p> : <div className="space-y-2">{departmentStats.map((item) => <div key={item.department}><div className="flex justify-between text-xs mb-1"><span className="truncate pr-2">{item.department}</span><span className="font-semibold">{item.rate}%</span></div><div className="h-2 rounded-full bg-surface-container overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${item.rate}%` }} /></div></div>)}</div>}</div></section>
    <RegistrationApproval />
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mt-6"><h2 className="text-lg font-bold text-on-surface">Administration</h2><p className="text-sm text-on-surface-variant mt-1 mb-5">Use the dedicated areas below instead of duplicating detailed records on this dashboard.</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"><AdminLink href="/team" title="Team" description="View organization-wide team progress and employee status." primary /><AdminLink href="/employees" title="People" description={`View all ${totalMembers} office members: ${totalEmployees} employees, ${totalManagers} managers and ${totalAdmins} admins.`} /><AdminLink href="/admin/roles" title="Roles & Access" description="Manage roles and departments." /><AdminLink href="/admin/branding" title="Branding" description="Upload the TC Professional Services logo." /><AdminLink href="/approvals" title={`PER Approvals (${pendingPER ?? 0})`} description="Review submitted PER objectives." /><AdminLink href="/reports" title="Reports" description="View organization-level reporting." /></div></section>
  </main></div>;
}
function AdminStatCard({ label, value, active }: { label: string; value: number; active: number }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">{label}</p><p className="text-3xl font-extrabold text-primary">{value}</p><p className="text-xs font-semibold text-on-surface-variant mt-2"><span className="text-primary">{active}</span> Active</p></div>; }
function ProgressCard({ label, value }: { label: string; value: number }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p><span className="text-2xl font-extrabold text-primary">{value}%</span></div><div className="mt-4 h-3 rounded-full bg-surface-container overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} /></div></div>; }
function AdminLink({ href, title, description, primary = false }: { href: string; title: string; description: string; primary?: boolean }) { return <Link href={href} className={`rounded-lg border p-4 transition hover:-translate-y-0.5 ${primary ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest"}`}><p className="text-sm font-semibold">{title}</p><p className={`text-xs mt-1 ${primary ? "opacity-90" : "text-on-surface-variant"}`}>{description}</p></Link>; }
