"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StatusSelect({ userId, currentStatus }: { userId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next !== status) setPendingStatus(next);
  };

  const confirm = async () => {
    if (!pendingStatus) return;
    setSaving(true);
    setError(null);
    const next = pendingStatus;
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", userId);
    setSaving(false);
    if (error) {
      setError(error.message);
      setPendingStatus(null);
      return;
    }
    setStatus(next);
    setPendingStatus(null);
    router.refresh();
  };

  return (
    <div>
      <select value={pendingStatus ?? status} onChange={handleChange} disabled={saving} className={`text-xs border rounded-md px-2 py-1 font-medium disabled:opacity-50 ${status === "active" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-outline-variant bg-surface-container text-on-surface-variant"}`}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {error && <p className="text-[10px] text-error mt-0.5 max-w-[180px]">{error}</p>}

      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="status-confirm-title">
          <div className="w-full max-w-md rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xl p-6">
            <h3 id="status-confirm-title" className="text-lg font-bold text-on-surface">Change account status?</h3>
            <p className="text-sm text-on-surface-variant mt-2">You are changing this account from <strong className="text-on-surface capitalize">{status}</strong> to <strong className="text-on-surface capitalize">{pendingStatus}</strong>.</p>
            {pendingStatus === "inactive" && <p className="text-xs mt-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2">The user will no longer be able to access the portal while inactive.</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setPendingStatus(null)} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirm} disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : pendingStatus === "inactive" ? "Deactivate user" : "Activate user"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
