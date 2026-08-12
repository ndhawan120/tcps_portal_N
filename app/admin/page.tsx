import { createClient } from "@/lib/supabase/server";
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

  const { data: users } = await supabase.from("profiles").select("id,role,status");
  const people = users ?? [];
  const employees = people.filter((u) => u.role === "employee");
  const pendingUsers = people.filter((u) => u.status === "pending").length;
  const activeUsers = employees.filter((u) => u.status === "active").length;

  const { count: pendingPER } = await supabase
    .from("per_objectives")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_approval");

  return (
    <div>
      <RealtimeRefresh />
      <Nav role="admin" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Admin Panel</h1>
            <p className="text-sm text-on-surface-variant mt-1">Manage people, access, reporting relationships, approvals and company administration.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/employees" className="text-sm font-medium px-4 py-2 rounded-md border border-outline-variant">View People</Link>
            <AddUserModal />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <AdminStatCard label="Total Employees" value={employees.length} />
          <AdminStatCard label="Active Employees" value={activeUsers} />
          <AdminStatCard label="Pending Signups" value={pendingUsers} />
          <AdminStatCard label="Pending PER Approvals" value={pendingPER ?? 0} />
        </div>

        <RegistrationApproval />

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mt-6">
          <h2 className="text-lg font-bold text-on-surface">Administration</h2>
          <p className="text-sm text-on-surface-variant mt-1 mb-5">Use the dedicated areas below for access management, people actions and reporting.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AdminLink href="/admin/roles" title="Roles & Access" description="Manage roles and departments." primary />
            <AdminLink href="/employees" title="People" description="Search and manage employees and managers." />
            <AdminLink href="/approvals" title={`PER Approvals (${pendingPER ?? 0})`} description="Review submitted PER objectives." />
            <AdminLink href="/reports" title="Reports" description="View PER and exam reporting." />
          </div>
        </section>
      </main>
    </div>
  );
}

function AdminStatCard({ label, value }: { label: string; value: number }) {
  return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">{label}</p><p className="text-3xl font-extrabold text-primary">{value}</p></div>;
}

function AdminLink({ href, title, description, primary = false }: { href: string; title: string; description: string; primary?: boolean }) {
  return <Link href={href} className={`rounded-lg border p-4 transition hover:-translate-y-0.5 ${primary ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest"}`}><p className="text-sm font-semibold">{title}</p><p className={`text-xs mt-1 ${primary ? "opacity-90" : "text-on-surface-variant"}`}>{description}</p></Link>;
}
