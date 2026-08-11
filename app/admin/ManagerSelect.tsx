"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ManagerOption = { id: string; first_name: string; last_name: string };

export default function ManagerSelect({
  userId,
  currentManagerId,
  managers,
}: {
  userId: string;
  currentManagerId: string | null;
  managers: ManagerOption[];
}) {
  const [managerId, setManagerId] = useState(currentManagerId ?? "");
  const router = useRouter();
  const supabase = createClient();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newManagerId = e.target.value || null;
    setManagerId(newManagerId ?? "");
    await supabase
      .from("profiles")
      .update({ manager_id: newManagerId })
      .eq("id", userId);
    router.refresh();
  };

  return (
    <select
      value={managerId}
      onChange={handleChange}
      className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest"
    >
      <option value="">No manager</option>
      {managers
        .filter((m) => m.id !== userId)
        .map((m) => (
          <option key={m.id} value={m.id}>
            {m.first_name} {m.last_name}
          </option>
        ))}
    </select>
  );
}
