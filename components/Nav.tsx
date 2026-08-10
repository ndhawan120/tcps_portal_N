"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav({
  role,
  name,
}: {
  role: string;
  name: string;
}) {
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
  ];
  if (role === "manager" || role === "admin") {
    links.push({ href: "/manager", label: "Team" });
    links.push({ href: "/manager/approvals", label: "Approvals" });
  }
  if (role === "admin") {
    links.push({ href: "/admin", label: "Admin" });
  }

  return (
    <nav className="flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant px-6 py-3">
      <div className="flex items-center gap-8">
        <span className="text-lg font-extrabold text-primary">TC Group</span>
        <div className="flex gap-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-on-surface hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-on-surface-variant">{name}</span>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-primary hover:underline"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
