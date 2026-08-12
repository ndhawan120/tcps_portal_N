"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav({ role, name }: { role: string; name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    ...(role === "admin"
      ? [
          { href: "/employees", label: "People" },
          { href: "/approvals", label: "Approvals" },
          { href: "/reports", label: "Reports" },
        ]
      : role === "manager"
      ? [
          { href: "/progress", label: "My Progress" },
          { href: "/manager", label: "Team" },
          { href: "/approvals", label: "Approvals" },
        ]
      : [{ href: "/progress", label: "My Progress" }]),
    { href: "/announcements", label: "Updates" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className="flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant px-6 py-3">
      <div className="flex items-center gap-8 min-w-0">
        <Link href="/dashboard" className="text-lg font-extrabold text-primary shrink-0">
          TC Group
        </Link>
        <div className="flex gap-5 flex-wrap">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  active ? "text-primary" : "text-on-surface hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <Link href="/profile" className="text-sm text-on-surface-variant hover:text-primary">
          {name}
        </Link>
        <button onClick={handleLogout} className="text-sm font-medium text-primary hover:underline">
          Log out
        </button>
      </div>
    </nav>
  );
}
