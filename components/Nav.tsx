"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav({ role, name }: { role: string; name: string }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/per-tracker", label: "PER Objectives" },
    { href: "/exams", label: "Exams" },
    { href: "/announcements", label: "Updates" },
    { href: "/profile", label: "Profile" },
  ];

  if (role === "manager" || role === "admin") {
    links.push({ href: "/manager", label: "Team" });
    links.push({ href: "/manager/approvals", label: "Approvals" });
    links.push({ href: "/employees", label: role === "manager" ? "My Team" : "Employees" });
  }

  if (role === "admin") links.push({ href: "/admin", label: "Admin" });

  return (
    <nav className="flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant px-6 py-3">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-lg font-extrabold text-primary">TC Group</Link>
        <div className="flex gap-5 flex-wrap">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-medium text-on-surface hover:text-primary transition-colors">{link.label}</Link>)}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/profile" className="text-sm text-on-surface-variant hover:text-primary">{name}</Link>
        <button onClick={handleLogout} className="text-sm font-medium text-primary hover:underline">Log out</button>
      </div>
    </nav>
  );
}
