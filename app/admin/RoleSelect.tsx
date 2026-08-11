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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setRole(newRole);
    setError(null);
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  };

  return (
    <div>
      <select
        value={role}
        onChange={handleChange}
        className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest"
      >
        <option value="employee">Employee</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
      {error && <p className="text-[10px] text-error mt-0.5 max-w-[140px]">{error}</p>}
    </div>
  );
}
