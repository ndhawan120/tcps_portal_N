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
  const { data: profile } = await supabase.from("profiles").select("first_name,last_name,role,status").eq("id", user.id).single();
  if (profile?.role !== "admin" || profile.status !== "active") redirect("/dashboard");
  const { data: pendingUsers } = await supabase.from("profiles").select("id").eq("status", "pending");
  return <div><RealtimeRefresh /><Nav role="admin" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Administration</p><h1 className="text-2xl sm:text-3xl font-bold text-on-surface mt-1">Admin Panel</h1><p className="text-sm text-on-surface-variant mt-1">Manage office configuration, access, people and operational workflows.</p></div><AddUserModal /></div>
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <AdminLink href="/employees" title="People" icon="groups_2" description="Complete office directory for employees, managers and admins." />
      <AdminLink href="/team" title="Team / Workforce" icon="groups" description="Monitor active employee progress and team relationships." />
      <AdminLink href="/approvals" title="Approvals" icon="fact_check" description="Review organisation-wide PER approval work." />
      <AdminLink href="/reports" title="Reports" icon="assessment" description="Open organisation-wide analytics and KPIs." />
      <AdminLink href="/admin/roles" title="Roles & Access" icon="manage_accounts" description="Manage business role names and active departments." />
      <AdminLink href="/admin/branding" title="Branding" icon="palette" description="Manage the portal company branding." />
    </section>
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-on-surface">Pending registrations</h2><p className="text-sm text-on-surface-variant mt-1">New accounts waiting for administrator action.</p></div><Link href="/admin?registrations=1" className="text-sm font-semibold text-primary hover:underline">{pendingUsers?.length ?? 0} pending</Link></div><RegistrationApproval /></section>
    <section className="bg-primary/5 border border-primary/20 rounded-xl p-5"><h2 className="text-sm font-bold uppercase tracking-widest text-primary">Where information belongs</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm"><div><p className="font-semibold text-on-surface">Dashboard</p><p className="text-on-surface-variant mt-1">Summary and next actions, not configuration records.</p></div><div><p className="font-semibold text-on-surface">Admin</p><p className="text-on-surface-variant mt-1">Configuration and administrative entry points.</p></div><div><p className="font-semibold text-on-surface">People / Team</p><p className="text-on-surface-variant mt-1">People records and workforce progress.</p></div></div></section>
  </main></div>;
}
function AdminLink({ href, title, icon, description }: { href: string; title: string; icon: string; description: string }) { return <Link href={href} className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary hover:-translate-y-0.5 transition"><div className="flex items-center gap-3"><span className="material-symbols-outlined text-primary" aria-hidden="true">{icon}</span><p className="text-sm font-bold text-on-surface">{title}</p></div><p className="text-xs text-on-surface-variant mt-3 leading-5">{description}</p><span className="inline-block text-xs font-semibold text-primary mt-4">Open →</span></Link>; }
