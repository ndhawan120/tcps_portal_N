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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newManagerId = e.target.value || null;
    setManagerId(newManagerId ?? "");
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ manager_id: newManagerId })
      .eq("id", userId);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  };

  return (
    <div>
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
      {error && <p className="text-[10px] text-error mt-0.5 max-w-[140px]">{error}</p>}
    </div>
  );
}
