"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Branding = { company_name: string; logo_url: string | null };

const icons: Record<string, React.ReactNode> = {
  Dashboard: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>,
  "My Progress": <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9m7 10V5m7 14v-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  Team: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M14 15c2.7-.7 5.2.8 6 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Approvals: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m8 12 2.2 2.2L16 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Reports: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V5h14v14H5Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 16v-3m4 3V8m4 8v-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  People: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 8h5M18.5 5.5V10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Admin: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.4-2.8 8-7 10-4.2-2-7-5.6-7-10V6l7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "Roles & Access": <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M13 9h7M17 6v6M4 20c.6-3.2 2.3-5 5-5s4.4 1.8 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Updates: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9h8M8 13h6M8 17h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Profile: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M5 20c.8-4 3-6 7-6s6.2 2 7 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
};

export default function Nav({ role, name }: { role: string; name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [branding, setBranding] = useState<Branding>({ company_name: "TC Professional Services", logo_url: null });

  useEffect(() => {
    let mounted = true;
    supabase.from("portal_settings").select("company_name,logo_url").eq("id", true).maybeSingle().then(({ data }) => {
      if (mounted && data) setBranding(data);
    });
    return () => { mounted = false; };
  }, []);

  const links = useMemo(() => [
    { href: "/dashboard", label: "Dashboard" },
    ...(role === "admin" ? [
      { href: "/employees", label: "People" },
      { href: "/approvals", label: "Approvals" },
      { href: "/reports", label: "Reports" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/roles", label: "Roles & Access" },
    ] : role === "manager" ? [
      { href: "/progress", label: "My Progress" },
      { href: "/manager", label: "Team" },
      { href: "/approvals", label: "Approvals" },
    ] : [{ href: "/progress", label: "My Progress" }]),
    { href: "/announcements", label: "Updates" },
    { href: "/profile", label: "Profile" },
  ], [role]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-[#191919] text-white lg:flex lg:flex-col border-r border-black/20">
        <div className="px-5 pt-5 pb-6">
          <Link href="/dashboard" className="block">
            <div className="h-12 flex items-center justify-center rounded-sm bg-black/40 overflow-hidden">
              {branding.logo_url ? <img src={branding.logo_url} alt={branding.company_name} className="max-h-10 max-w-[190px] object-contain" /> : <span className="text-lg font-extrabold tracking-tight text-primary">TC<span className="text-white">PS</span></span>}
            </div>
            <div className="mt-5">
              <p className="text-xl font-extrabold tracking-tight">TC Professional Services</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60 mt-1">Professional Development</p>
            </div>
          </Link>
        </div>
        <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition ${active ? "bg-primary text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
              <span className="w-5 h-5 shrink-0">{icons[link.label]}</span><span>{link.label}</span>
            </Link>;
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link href="/profile" className="flex items-center gap-3 rounded-md bg-white/5 p-3 hover:bg-white/10">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-sm font-bold">{name.trim().split(/\s+/).map((v) => v[0]).join("").slice(0,2).toUpperCase() || "U"}</div>
            <div className="min-w-0"><p className="text-sm font-semibold truncate">{name || "User"}</p><p className="text-[11px] text-white/55 capitalize">{role}</p></div>
          </Link>
          <button onClick={handleLogout} className="mt-2 w-full text-left px-3 py-2 text-xs font-semibold text-white/60 hover:text-white">Log out</button>
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-50 bg-[#191919] text-white px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-extrabold text-primary">TC Professional Services</Link>
        <Link href="/profile" className="text-xs text-white/75">{name}</Link>
      </div>

      <header className="hidden lg:flex fixed top-0 left-64 right-0 z-40 h-[68px] bg-[#fafafa] border-b border-[#e7bdb2] items-center justify-between px-10">
        <div className="w-full max-w-xl rounded-xl bg-[#f0f0f0] px-4 py-2.5 flex items-center gap-3 text-[#6b6b6b] text-sm"><svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>Search employees, roles, or status...</span></div>
        <div className="flex items-center gap-6 ml-6"><button className="text-[#5d4038] text-xl" aria-label="Notifications">♧</button><Link href="/profile" className="border-l border-[#e7bdb2] pl-6 text-sm font-semibold text-primary">Update Profile</Link></div>
      </header>
    </>
  );
}
