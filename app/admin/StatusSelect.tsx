"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StatusSelect({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setError(null);
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", userId);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  };

  return (
    <div>
      <select
        value={status}
        onChange={handleChange}
        className={`text-xs border rounded-md px-2 py-1 font-medium ${
          status === "active"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-outline-variant bg-surface-container text-on-surface-variant"
        }`}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {error && <p className="text-[10px] text-error mt-0.5 max-w-[140px]">{error}</p>}
    </div>
  );
}
