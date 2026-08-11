"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENTS } from "@/lib/departments";

export default function DepartmentSelect({
  userId,
  currentDepartment,
}: {
  userId: string;
  currentDepartment: string | null;
}) {
  const [department, setDepartment] = useState(currentDepartment ?? "");
  const router = useRouter();
  const supabase = createClient();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDept = e.target.value;
    setDepartment(newDept);
    await supabase.from("profiles").update({ department: newDept }).eq("id", userId);
    router.refresh();
  };

  return (
    <select
      value={department}
      onChange={handleChange}
      className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest"
    >
      <option value="">—</option>
      {DEPARTMENTS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
