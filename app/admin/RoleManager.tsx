"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BASE_ROLES = ["employee", "manager", "admin"] as const;

type CustomRole = { id: string; name: string; slug: string; base_role: string };

export default function RoleManager() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [name, setName] = useState("");
  const [baseRole, setBaseRole] = useState<(typeof BASE_ROLES)[number]>("employee");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from("custom_roles").select("id,name,slug,base_role").order("name");
    setRoles(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const createRole = async () => {
    const clean = name.trim().replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, " ");
    if (!clean) return setError("Enter a role name using letters and numbers only.");
    setSaving(true); setError(null);
    const slug = clean.toLowerCase().replace(/\s+/g, "-");
    const { error: insertError } = await supabase.from("custom_roles").insert({ name: clean, slug, base_role: baseRole });
    setSaving(false);
    if (insertError) { setError(insertError.code === "23505" ? "A role with this name already exists." : insertError.message); return; }
    setName("");
    await load();
  };

  const deleteRole = async (role: CustomRole) => {
    if (!window.confirm(`Delete the custom role “${role.name}”? Users assigned to it will return to the standard ${role.base_role} role.`)) return;
    const { error: deleteError } = await supabase.from("custom_roles").delete().eq("id", role.id);
    if (deleteError) { setError(deleteError.message); return; }
    await load();
  };

  return <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
      <div><h2 className="text-lg font-bold text-on-surface">Roles & Access</h2><p className="text-xs text-on-surface-variant mt-1 max-w-2xl">Create a custom role name while inheriting an existing access tier. This keeps permissions safe: Employee, Manager and Admin remain the underlying security levels.</p></div>
      <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto"><input value={name} onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))} placeholder="New role name" maxLength={60} className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm" /><select value={baseRole} onChange={(e) => setBaseRole(e.target.value as (typeof BASE_ROLES)[number])} className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm"><option value="employee">Employee access</option><option value="manager">Manager access</option><option value="admin">Admin access</option></select><button type="button" onClick={createRole} disabled={saving} className="rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Adding..." : "+ Add role"}</button></div>
    </div>
    {error && <p className="mt-3 text-xs text-error">{error}</p>}
    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {roles.map((role) => <div key={role.id} className="border border-outline-variant rounded-lg p-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-on-surface">{role.name}</p><p className="text-[11px] text-on-surface-variant capitalize">{role.base_role} access</p></div><button type="button" onClick={() => deleteRole(role)} className="text-xs font-medium text-error hover:underline">Delete</button></div>)}
      {roles.length === 0 && <p className="text-xs text-on-surface-variant">No custom roles created yet.</p>}
    </div>
  </section>;
}
