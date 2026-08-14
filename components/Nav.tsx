"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

type Branding = { company_name: string; logo_url: string | null };
type NavLink = { href: string; label: string; icon: string };

const SHARED_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/exams", label: "Exam / PER", icon: "menu_book" },
];
const FOOTER_LINKS: NavLink[] = [
  { href: "/announcements", label: "Updates", icon: "campaign" },
  { href: "/profile", label: "Profile", icon: "person" },
];

export default function Nav({ role, name }: { role: string; name: string }) {
  const router = useRouter(); const pathname = usePathname(); const supabase = createClient();
  const [branding, setBranding] = useState<Branding>({ company_name: "TC Professional Services", logo_url: null });
  const [mobileOpen, setMobileOpen] = useState(false); const [search, setSearch] = useState("");
  useEffect(() => { let mounted = true; supabase.from("portal_settings").select("company_name,logo_url").eq("id", true).maybeSingle().then(({ data }) => { if (mounted && data) setBranding(data); }); return () => { mounted = false; }; }, [supabase]);
  useEffect(() => setMobileOpen(false), [pathname]);

  const links = useMemo<NavLink[]>(() => {
    if (role === "admin") return [
      ...SHARED_LINKS,
      { href: "/team", label: "Team", icon: "groups" },
      { href: "/employees", label: "People", icon: "groups_2" },
      { href: "/approvals", label: "Approvals", icon: "fact_check" },
      { href: "/reports", label: "Reports", icon: "assessment" },
      { href: "/admin", label: "Admin", icon: "admin_panel_settings" },
      ...FOOTER_LINKS,
    ];
    if (role === "manager") return [...SHARED_LINKS, { href: "/team", label: "Team", icon: "groups" }, { href: "/approvals", label: "Approvals", icon: "fact_check" }, { href: "/reports", label: "Reports", icon: "assessment" }, ...FOOTER_LINKS];
    return [...SHARED_LINKS, { href: "/documents", label: "Documents", icon: "description" }, ...FOOTER_LINKS];
  }, [role]);

  const adminSubLinks: NavLink[] = [
    { href: "/admin/roles", label: "Roles & Access", icon: "manage_accounts" },
    { href: "/admin/branding", label: "Branding", icon: "palette" },
  ];
  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); };
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = name.trim().split(/\s+/).map((v) => v[0]).join("").slice(0, 2).toUpperCase() || "U";
  const submitSearch = (event: FormEvent) => { event.preventDefault(); const q = search.trim(); router.push(q ? `/exams?search=${encodeURIComponent(q)}` : "/exams"); };
  const navLink = (link: NavLink) => <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition ${isActive(link.href) ? "bg-primary text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><span className="material-symbols-outlined w-5 shrink-0 text-center text-[21px]" aria-hidden="true">{link.icon}</span><span>{link.label}</span></Link>;

  const navContent = <>
    {links.map(navLink)}
    {role === "admin" && <div className="mt-1 ml-3 border-l border-white/15 pl-2"><div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">Admin settings</div>{adminSubLinks.map(navLink)}</div>}
  </>;

  return <>
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-[#191919] text-white lg:flex lg:flex-col border-r border-black/20"><div className="px-5 pt-5 pb-6"><Link href="/dashboard" className="block"><div className="h-12 flex items-center justify-center rounded-sm bg-black/40 overflow-hidden">{branding.logo_url ? <img src={branding.logo_url} alt={branding.company_name} className="max-h-10 max-w-[190px] object-contain" /> : <span className="text-lg font-extrabold text-primary">TC<span className="text-white">PS</span></span>}</div><div className="mt-5"><p className="text-xl font-extrabold tracking-tight">{branding.company_name || "TC Professional Services"}</p><p className="text-[11px] uppercase tracking-[0.18em] text-white/60 mt-1">Professional Development</p></div></Link></div><nav className="px-3 space-y-1 flex-1 overflow-y-auto">{navContent}</nav><div className="mt-auto px-4 pb-4"><Link href="/profile" className="flex items-center gap-3 rounded-md bg-white/5 p-3 hover:bg-white/10"><div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-sm font-bold">{initials}</div><div className="min-w-0"><p className="text-sm font-semibold truncate">{name || "User"}</p><p className="text-[11px] text-white/55 capitalize">{role}</p></div></Link><button onClick={logout} className="mt-2 w-full text-left px-3 py-2 text-xs font-semibold text-white/60 hover:text-white">Log out</button></div></aside>
    <div className="lg:hidden sticky top-0 z-50 bg-[#191919] text-white px-4 py-3 flex items-center justify-between"><Link href="/dashboard" className="font-extrabold text-primary">TCPS</Link><div className="flex items-center gap-2"><NotificationBell /><button type="button" aria-label="Toggle navigation" onClick={() => setMobileOpen(v => !v)} className="h-9 w-9 border border-white/15 rounded-md">{mobileOpen ? "×" : "☰"}</button></div></div>
    {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />}
    <div className={`lg:hidden fixed left-0 right-0 top-[60px] z-50 bg-[#191919] px-3 pb-4 pt-3 shadow-xl ${mobileOpen ? "block" : "hidden"}`}><nav className="space-y-1">{navContent}<button type="button" onClick={logout} className="w-full rounded-md px-3 py-3 text-left text-sm font-semibold text-white/70">Log out</button></nav></div>
    <header className="hidden lg:flex fixed top-0 left-64 right-0 z-40 h-[68px] bg-[#fafafa] border-b border-[#e7bdb2] items-center justify-between px-10"><form onSubmit={submitSearch} className="w-full max-w-xl rounded-xl bg-[#f0f0f0] px-4 py-2.5 flex items-center gap-3"><span className="material-symbols-outlined text-[#6b6b6b] text-[21px]" aria-hidden="true">search</span><input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm" placeholder="Search exams or documents..." aria-label="Search exams or documents" /></form><div className="flex items-center gap-6 ml-6"><NotificationBell /><Link href="/profile" className="border-l border-[#e7bdb2] pl-6 text-sm font-semibold text-primary">Update Profile</Link></div></header>
  </>;
}
