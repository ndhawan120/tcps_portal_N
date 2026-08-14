"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CustomRole = { id: string; name: string; base_role: "employee" | "manager" | "admin"; is_active: boolean };
type Props = { userId: string; currentRole: string; currentCustomRoleId?: string | null };

const BASE_ROLES = ["employee", "manager", "admin"] as const;
const normalizeRoleName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export default function RoleSelect({ userId, currentRole, currentCustomRoleId }: Props) {
  const [role, setRole] = useState(currentRole);
  const [customRoleId, setCustomRoleId] = useState(currentCustomRoleId ?? null);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [pending, setPending] = useState<{ role: string; customRoleId: string | null; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("custom_roles")
      .select("id,name,base_role,is_active")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setCustomRoles(data ?? []));
  }, [supabase]);

  // Standard Employee / Manager / Admin are the single source of truth for the
  // built-in access tiers. A custom role with the same name is not shown again.
  const selectableCustomRoles = useMemo(
    () => customRoles.filter((item) => !BASE_ROLES.some((base) => normalizeRoleName(item.name) === normalizeRoleName(base))),
    [customRoles]
  );

  const selectedCustom = customRoleId ? customRoles.find((item) => item.id === customRoleId) : null;
  const selected = selectedCustom && !BASE_ROLES.some((base) => normalizeRoleName(selectedCustom.name) === normalizeRoleName(base))
    ? `custom:${customRoleId}`
    : role;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value.startsWith("custom:")) {
      const id = value.slice(7);
      const custom = selectableCustomRoles.find((item) => item.id === id);
      if (custom && (custom.id !== customRoleId || custom.base_role !== role)) {
        setPending({ role: custom.base_role, customRoleId: custom.id, label: custom.name });
      }
    } else if (value !== role || customRoleId) {
      setPending({ role: value, customRoleId: null, label: value });
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setSaving(true); setError(null);
    const { error: updateError } = await supabase.from("profiles").update({ role: pending.role, custom_role_id: pending.customRoleId }).eq("id", userId);
    setSaving(false);
    if (updateError) { setError(updateError.message); setPending(null); return; }
    setRole(pending.role); setCustomRoleId(pending.customRoleId); setPending(null); router.refresh();
  };

  return <div>
    <select value={pending ? (pending.customRoleId ? `custom:${pending.customRoleId}` : pending.role) : selected} onChange={handleSelect} disabled={saving} className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest disabled:opacity-50">
      <option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option>
      {selectableCustomRoles.length > 0 && <optgroup label="Custom roles">{selectableCustomRoles.map((item) => <option key={item.id} value={`custom:${item.id}`}>{item.name} ({item.base_role})</option>)}</optgroup>}
    </select>
    {error && <p className="text-[10px] text-error mt-0.5 max-w-[220px]">{error}</p>}
    {pending && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="role-confirm-title"><div className="w-full max-w-md rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xl p-6"><h3 id="role-confirm-title" className="text-lg font-bold text-on-surface">Change user role?</h3><p className="text-sm text-on-surface-variant mt-2">You are changing this user to <strong className="text-on-surface">{pending.label}</strong>. The underlying access tier will be <strong className="text-on-surface capitalize">{pending.role}</strong>.</p><div className="flex justify-end gap-2 mt-6"><button type="button" onClick={() => setPending(null)} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-md border border-outline-variant">Cancel</button><button type="button" onClick={confirm} disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-on-primary disabled:opacity-50">{saving ? "Saving..." : "Confirm change"}</button></div></div></div>}
  </div>;
}
