"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "./NotificationBell";

type Branding = { company_name: string; logo_url: string | null };

const icons: Record<string, React.ReactNode> = {
  Dashboard: <span>▦</span>,
  "My Progress": <span>▥</span>,
  Team: <span>♧</span>,
  Approvals: <span>✓</span>,
  Reports: <span>▤</span>,
  People: <span>♙</span>,
  Admin: <span>◈</span>,
  "Roles & Access": <span>⚿</span>,
  Updates: <span>▤</span>,
  Profile: <span>○</span>,
};

export default function Nav({ role, name }: { role: string; name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [branding, setBranding] = useState<Branding>({ company_name: "TC Professional Services", logo_url: null });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.from("portal_settings").select("company_name,logo_url").eq("id", true).maybeSingle().then(({ data }) => {
      if (mounted && data) setBranding(data);
    });
    return () => { mounted = false; };
  }, [supabase]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const links = useMemo(() => {
    const base = [{ href: "/dashboard", label: "Dashboard" }];
    if (role === "admin") {
      return [...base, { href: "/employees", label: "People" }, { href: "/approvals", label: "Approvals" }, { href: "/reports", label: "Reports" }, { href: "/admin", label: "Admin" }, { href: "/admin/roles", label: "Roles & Access" }, { href: "/announcements", label: "Updates" }, { href: "/profile", label: "Profile" }];
    }
    if (role === "manager") {
      return [...base, { href: "/progress", label: "My Progress" }, { href: "/manager", label: "Team" }, { href: "/approvals", label: "Approvals" }, { href: "/announcements", label: "Updates" }, { href: "/profile", label: "Profile" }];
    }
    return [...base, { href: "/progress", label: "My Progress" }, { href: "/announcements", label: "Updates" }, { href: "/profile", label: "Profile" }];
  }, [role]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = name.trim().split(/\s+/).map((value) => value[0]).join("").slice(0, 2).toUpperCase() || "U";
  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); };
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = search.trim();
    router.push(value ? `/employees?search=${encodeURIComponent(value)}` : "/employees");
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-[#191919] text-white lg:flex lg:flex-col border-r border-black/20">
        <div className="px-5 pt-5 pb-6">
          <Link href="/dashboard" className="block">
            <div className="h-12 flex items-center justify-center rounded-sm bg-black/40 overflow-hidden">
              {branding.logo_url ? <img src={branding.logo_url} alt={branding.company_name} className="max-h-10 max-w-[190px] object-contain" /> : <span className="text-lg font-extrabold text-primary">TC<span className="text-white">PS</span></span>}
            </div>
            <div className="mt-5">
              <p className="text-xl font-extrabold tracking-tight">TC Professional Services</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60 mt-1">Professional Development</p>
            </div>
          </Link>
        </div>
        <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
          {links.map((link) => <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition ${isActive(link.href) ? "bg-primary text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><span className="w-5 h-5 shrink-0">{icons[link.label]}</span><span>{link.label}</span></Link>)}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link href="/profile" className="flex items-center gap-3 rounded-md bg-white/5 p-3 hover:bg-white/10"><div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-sm font-bold">{initials}</div><div className="min-w-0"><p className="text-sm font-semibold truncate">{name || "User"}</p><p className="text-[11px] text-white/55 capitalize">{role}</p></div></Link>
          <button onClick={logout} className="mt-2 w-full text-left px-3 py-2 text-xs font-semibold text-white/60 hover:text-white">Log out</button>
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-50 bg-[#191919] text-white px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <Link href="/dashboard" className="font-extrabold text-primary">{branding.logo_url ? <img src={branding.logo_url} alt={branding.company_name} className="h-8 max-w-[150px] object-contain" /> : <span>TCPS</span>}</Link>
        <div className="flex items-center gap-2"><NotificationBell /><button type="button" onClick={() => setMobileOpen((value) => !value)} className="h-9 w-9 rounded-md border border-white/15" aria-label="Toggle navigation">{mobileOpen ? "×" : "☰"}</button></div>
      </div>

      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />}
      <div className={`lg:hidden fixed left-0 right-0 top-[60px] z-50 bg-[#191919] px-3 pb-4 pt-3 shadow-xl ${mobileOpen ? "translate-y-0" : "-translate-y-[140%]"}`}>
        <nav className="space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">
          {links.map((link) => <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold ${isActive(link.href) ? "bg-primary text-white" : "text-white/80 hover:bg-white/10"}`}><span className="h-5 w-5">{icons[link.label]}</span><span>{link.label}</span></Link>)}
        </nav>
        <button type="button" onClick={logout} className="w-full rounded-md px-3 py-3 text-left text-sm font-semibold text-white/70">Log out</button>
      </div>

      <header className="hidden lg:flex fixed top-0 left-64 right-0 z-40 h-[68px] bg-[#fafafa] border-b border-[#e7bdb2] items-center justify-between px-10">
        <form onSubmit={submitSearch} className="w-full max-w-xl rounded-xl bg-[#f0f0f0] px-4 py-2.5 flex items-center gap-3 text-sm"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees, roles, or status..." aria-label="Global search" className="w-full bg-transparent outline-none" /></form>
        <div className="flex items-center gap-6 ml-6"><NotificationBell /><Link href="/profile" className="border-l border-[#e7bdb2] pl-6 text-sm font-semibold text-primary">Update Profile</Link></div>
      </header>
    </>
  );
}
