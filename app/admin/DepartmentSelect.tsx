"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Department = { id: string; name: string; is_active: boolean };

export default function DepartmentSelect({
  userId,
  currentDepartment,
}: {
  userId: string;
  currentDepartment: string | null;
}) {
  const [department, setDepartment] = useState(currentDepartment ?? "");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadDepartments = async () => {
      const { data } = await supabase.from("departments").select("id,name,is_active").eq("is_active", true).order("name");
      const rows = data ?? [];
      if (currentDepartment && !rows.some((d) => d.name === currentDepartment)) {
        rows.push({ id: "current", name: currentDepartment, is_active: true });
      }
      setDepartments(rows);
    };
    loadDepartments();
  }, [currentDepartment]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDept = e.target.value;
    setDepartment(newDept);
    setError(null);
    const { error } = await supabase.from("profiles").update({ department: newDept || null }).eq("id", userId);
    if (error) {
      setError(error.message);
      setDepartment(currentDepartment ?? "");
      return;
    }
    router.refresh();
  };

  return (
    <div>
      <select value={department} onChange={handleChange} className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest">
        <option value="">—</option>
        {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
      </select>
      {error && <p className="text-[10px] text-error mt-0.5 max-w-[180px]">{error}</p>}
    </div>
  );
}
