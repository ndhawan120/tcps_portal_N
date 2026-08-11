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
  const router = useRouter();
  const supabase = createClient();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    await supabase.from("profiles").update({ status: newStatus }).eq("id", userId);
    router.refresh();
  };

  return (
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
  );
}
