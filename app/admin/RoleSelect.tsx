"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { userId: string; currentRole: string };

export default function RoleSelect({ userId, currentRole }: Props) {
  const [role, setRole] = useState(currentRole);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    if (newRole !== role) setPendingRole(newRole);
  };

  const cancel = () => setPendingRole(null);

  const confirm = async () => {
    if (!pendingRole) return;
    setSaving(true);
    setError(null);
    const newRole = pendingRole;
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    setSaving(false);
    if (error) {
      setError(error.message);
      setPendingRole(null);
      return;
    }
    setRole(newRole);
    setPendingRole(null);
    router.refresh();
  };

  return (
    <div>
      <select value={pendingRole ?? role} onChange={handleSelect} disabled={saving} className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest disabled:opacity-50">
        <option value="employee">Employee</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
      {error && <p className="text-[10px] text-error mt-0.5 max-w-[180px]">{error}</p>}

      {pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="role-confirm-title">
          <div className="w-full max-w-md rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xl p-6">
            <h3 id="role-confirm-title" className="text-lg font-bold text-on-surface">Change user role?</h3>
            <p className="text-sm text-on-surface-variant mt-2">You are changing this user from <strong className="text-on-surface capitalize">{role}</strong> to <strong className="text-on-surface capitalize">{pendingRole}</strong>. This will immediately change their portal permissions and available features.</p>
            {pendingRole === "admin" && <p className="text-xs mt-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2">Admin access gives this user access to administrative areas and employee management.</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={cancel} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirm} disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : "Confirm change"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
