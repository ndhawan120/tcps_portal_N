"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "./NotificationBell";

type Branding = { company_name: string; logo_url: string | null };

const icons: Record<string, string> = {
  Dashboard: "▦",
  Exams: "✓",
  "PER Objectives": "☑",
  Documents: "▤",
  Team: "♙",
  Approvals: "✓",
  Reports: "▥",
  People: "♙",
  Admin: "⚙",
  "Roles & Access": "⚿",
  Updates: "○",
  Profile: "◉",
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
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const links = useMemo(() => {
    const base = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/exams", label: "Exams" },
      { href: "/per-objectives", label: "PER Objectives" },
    ];

    if (role === "admin") {
      return [
        ...base,
        { href: "/employees", label: "People" },
        { href: "/approvals", label: "Approvals" },
        { href: "/reports", label: "Reports" },
        { href: "/admin", label: "Admin" },
        { href: "/admin/roles", label: "Roles & Access" },
        { href: "/announcements", label: "Updates" },
        { href: "/profile", label: "Profile" },
      ];
    }

    if (role === "manager") {
      return [
        ...base,
        { href: "/manager", label: "Team" },
        { href: "/approvals", label: "Approvals" },
        { href: "/reports", label: "Reports" },
        { href: "/announcements", label: "Updates" },
        { href: "/profile", label: "Profile" },
      ];
    }

    return [
      ...base,
      { href: "/documents", label: "Documents" },
      { href: "/announcements", label: "Updates" },
      { href: "/profile", label: "Profile" },
    ];
  }, [role]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = name.trim().split(/\s+/).map((v) => v[0]).join("").slice(0, 2).toUpperCase() || "U";

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = search.trim();
    router.push(q ? `/exams?search=${encodeURIComponent(q)}` : "/exams");
  };

  const navLink = (link: { href: string; label: string }) => (
    <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition ${isActive(link.href) ? "bg-primary text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
      <span className="w-5 text-center text-base shrink-0" aria-hidden="true">{icons[link.label] ?? "•"}</span>
      <span>{link.label}</span>
    </Link>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-[#191919] text-white lg:flex lg:flex-col border-r border-black/20">
        <div className="px-5 pt-5 pb-6">
          <Link href="/dashboard" className="block">
            <div className="h-12 flex items-center justify-center rounded-sm bg-black/40 overflow-hidden">
              {branding.logo_url ? <img src={branding.logo_url} alt={branding.company_name} className="max-h-10 max-w-[190px] object-contain" /> : <span className="text-lg font-extrabold text-primary">TC<span className="text-white">PS</span></span>}
            </div>
            <div className="mt-5">
              <p className="text-xl font-extrabold tracking-tight">{branding.company_name || "TC Professional Services"}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60 mt-1">Professional Development</p>
            </div>
          </Link>
        </div>
        <nav className="px-3 space-y-1 flex-1 overflow-y-auto">{links.map(navLink)}</nav>
        <div className="mt-auto px-4 pb-4">
          <Link href="/exams" className="block w-full bg-white text-black py-3 rounded-lg text-center text-xs font-bold hover:opacity-90">New Exam Entry</Link>
          <Link href="/profile" className="mt-3 flex items-center gap-3 rounded-md bg-white/5 p-3 hover:bg-white/10">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-sm font-bold">{initials}</div>
            <div className="min-w-0"><p className="text-sm font-semibold truncate">{name || "User"}</p><p className="text-[11px] text-white/55 capitalize">{role}</p></div>
          </Link>
          <button onClick={logout} className="mt-2 w-full text-left px-3 py-2 text-xs font-semibold text-white/60 hover:text-white">Log out</button>
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-50 bg-[#191919] text-white px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-extrabold text-primary">
          {branding.logo_url ? <img src={branding.logo_url} alt={branding.company_name} className="h-8 w-auto max-w-[150px] object-contain" /> : <span>TCPS</span>}
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((v) => !v)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-white hover:bg-white/10">{mobileOpen ? "×" : "☰"}</button>
        </div>
      </div>
      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <div className={`lg:hidden fixed left-0 right-0 top-[60px] z-50 border-t border-white/10 bg-[#191919] px-3 pb-4 pt-3 shadow-xl transition-transform ${mobileOpen ? "translate-y-0" : "-translate-y-[140%]"}`} aria-hidden={!mobileOpen}>
        <nav className="space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">{links.map(navLink)}<Link href="/exams" className="block mt-2 rounded-md bg-white px-3 py-3 text-center text-sm font-bold text-black">New Exam Entry</Link><button type="button" onClick={logout} className="w-full rounded-md px-3 py-3 text-left text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">Log out</button></nav>
      </div>

      <header className="hidden lg:flex fixed top-0 left-64 right-0 z-40 h-[68px] bg-[#fafafa] border-b border-[#e7bdb2] items-center justify-between px-10">
        <form onSubmit={submitSearch} className="w-full max-w-xl rounded-xl bg-[#f0f0f0] px-4 py-2.5 flex items-center gap-3 text-[#6b6b6b] text-sm">
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm text-on-surface" placeholder="Search exams or documents..." aria-label="Search exams or documents" />
        </form>
        <div className="flex items-center gap-6 ml-6"><NotificationBell /><Link href="/profile" className="border-l border-[#e7bdb2] pl-6 text-sm font-semibold text-primary">Update Profile</Link></div>
      </header>
    </>
  );
}
