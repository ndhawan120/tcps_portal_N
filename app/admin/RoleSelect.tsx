"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [role, setRole] = useState(currentRole);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setRole(newRole);
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    router.refresh();
  };

  return (
    <select
      value={role}
      onChange={handleChange}
      className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest"
    >
      <option value="employee">Employee</option>
      <option value="manager">Manager</option>
      <option value="admin">Admin</option>
    </select>
  );
}
