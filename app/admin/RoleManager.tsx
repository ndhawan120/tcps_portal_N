"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BASE_ROLES = ["employee", "manager", "admin"] as const;
type CustomRole = { id: string; name: string; slug: string; base_role: string; is_active: boolean };
type Department = { id: string; name: string; slug: string; is_active: boolean };

const cleanName = (value: string) => value.trim().replace(/[^a-zA-Z0-9 &-]/g, "").replace(/\s+/g, " ").replace(/^[-& ]+|[-& ]+$/g, "");
const cleanRoleName = (value: string) => value.trim().replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, " ");
const slugify = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const normalizeRoleName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const isBuiltInRoleName = (value: string) => BASE_ROLES.some((base) => normalizeRoleName(value) === normalizeRoleName(base));

export default function RoleManager() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roleName, setRoleName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [baseRole, setBaseRole] = useState<(typeof BASE_ROLES)[number]>("employee");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [editingBaseRole, setEditingBaseRole] = useState<(typeof BASE_ROLES)[number]>("employee");
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    const [{ data: roleData }, { data: departmentData }] = await Promise.all([
      supabase.from("custom_roles").select("id,name,slug,base_role,is_active").order("name"),
      supabase.from("departments").select("id,name,slug,is_active").order("name"),
    ]);
    setRoles(roleData ?? []);
    setDepartments(departmentData ?? []);
  };

  useEffect(() => { load(); }, []);

  const createRole = async () => {
    const clean = cleanRoleName(roleName);
    if (!clean) return setError("Enter a role name using letters and numbers only.");
    if (isBuiltInRoleName(clean)) return setError("Employee, Manager and Admin are standard roles. Use a different custom role name.");
    setSaving(true); setError(null);
    const { error: insertError } = await supabase.from("custom_roles").insert({ name: clean, slug: slugify(clean), base_role: baseRole, is_active: true });
    setSaving(false);
    if (insertError) { setError(insertError.code === "23505" ? "A role with this name already exists." : insertError.message); return; }
    setRoleName("");
    await load();
  };

  const saveRole = async (role: CustomRole) => {
    const clean = cleanRoleName(editingRoleName);
    if (!clean) return setError("Enter a valid role name.");
    if (isBuiltInRoleName(clean)) return setError("Employee, Manager and Admin are reserved standard roles. Use a different custom role name.");
    setSaving(true); setError(null);
    const { error: updateError } = await supabase.from("custom_roles").update({ name: clean, slug: slugify(clean), base_role: editingBaseRole }).eq("id", role.id);
    setSaving(false);
    if (updateError) { setError(updateError.code === "23505" ? "A role with this name already exists." : updateError.message); return; }
    setEditingRoleId(null);
    setEditingRoleName("");
    await load();
  };

  const toggleRole = async (role: CustomRole) => {
    if (!window.confirm(`${role.is_active ? "Disable" : "Enable"} the role “${role.name}”?`)) return;
    setError(null);
    const { error: updateError } = await supabase.from("custom_roles").update({ is_active: !role.is_active }).eq("id", role.id);
    if (updateError) { setError(updateError.message); return; }
    await load();
  };

  const deleteRole = async (role: CustomRole) => {
    if (!window.confirm(`Delete the custom role “${role.name}”? Users assigned to it will return to the standard ${role.base_role} role.`)) return;
    setError(null);
    const { error: deleteError } = await supabase.from("custom_roles").delete().eq("id", role.id);
    if (deleteError) { setError(deleteError.message); return; }
    await load();
  };

  const createDepartment = async () => {
    const clean = cleanName(departmentName);
    if (!clean) return setError("Enter a department name using letters, numbers, spaces, & or hyphens.");
    setSaving(true); setError(null);
    const { error: insertError } = await supabase.from("departments").insert({ name: clean, slug: slugify(clean), is_active: true });
    setSaving(false);
    if (insertError) { setError(insertError.code === "23505" ? "A department with this name already exists." : insertError.message); return; }
    setDepartmentName("");
    await load();
  };

  const saveDepartment = async (department: Department) => {
    const clean = cleanName(editingDepartmentName);
    if (!clean) return setError("Enter a valid department name.");
    setSaving(true); setError(null);
    const { error: updateError } = await supabase.from("departments").update({ name: clean, slug: slugify(clean) }).eq("id", department.id);
    if (!updateError && clean !== department.name) {
      const { error: profileError } = await supabase.from("profiles").update({ department: clean }).eq("department", department.name);
      if (profileError) { setSaving(false); setError(profileError.message); return; }
    }
    setSaving(false);
    if (updateError) { setError(updateError.code === "23505" ? "A department with this name already exists." : updateError.message); return; }
    setEditingDepartmentId(null);
    setEditingDepartmentName("");
    await load();
  };

  const toggleDepartment = async (department: Department) => {
    setError(null);
    const { error: updateError } = await supabase.from("departments").update({ is_active: !department.is_active }).eq("id", department.id);
    if (updateError) { setError(updateError.message); return; }
    await load();
  };

  const deleteDepartment = async (department: Department) => {
    if (!window.confirm(`Delete the department “${department.name}”?`)) return;
    const { count, error: countError } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("department", department.name);
    if (countError) { setError(countError.message); return; }
    if ((count ?? 0) > 0) { setError(`Cannot delete ${department.name} because ${count} employee(s) are still assigned to it. Reassign them first.`); return; }
    const { error: deleteError } = await supabase.from("departments").delete().eq("id", department.id);
    if (deleteError) { setError(deleteError.message); return; }
    await load();
  };

  return <div className="space-y-6">
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div><h2 className="text-lg font-bold text-on-surface">Roles</h2><p className="text-xs text-on-surface-variant mt-1 max-w-2xl">Create a custom role name while inheriting an existing access tier. Employee, Manager and Admin remain the underlying security levels.</p></div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto"><input value={roleName} onChange={(e) => setRoleName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))} placeholder="New role name" maxLength={60} className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm" /><select value={baseRole} onChange={(e) => setBaseRole(e.target.value as (typeof BASE_ROLES)[number])} className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm"><option value="employee">Employee access</option><option value="manager">Manager access</option><option value="admin">Admin access</option></select><button type="button" onClick={createRole} disabled={saving} className="rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Adding..." : "+ Add role"}</button></div>
      </div>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">{roles.map((role) => <div key={role.id} className="border border-outline-variant rounded-lg p-3"><div className="flex items-center justify-between gap-3">{editingRoleId === role.id ? <div className="flex flex-1 flex-col sm:flex-row gap-2"><input value={editingRoleName} onChange={(e) => setEditingRoleName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))} className="flex-1 rounded-md border border-outline-variant bg-background px-2 py-1 text-sm" /><select value={editingBaseRole} onChange={(e) => setEditingBaseRole(e.target.value as (typeof BASE_ROLES)[number])} className="rounded-md border border-outline-variant bg-background px-2 py-1 text-sm"><option value="employee">Employee access</option><option value="manager">Manager access</option><option value="admin">Admin access</option></select></div> : <div><p className="text-sm font-semibold text-on-surface">{role.name}</p><p className="text-[11px] text-on-surface-variant">{role.is_active ? "Active" : "Inactive"} · <span className="capitalize">{role.base_role}</span> access</p></div>}<div className="flex items-center gap-2 shrink-0">{editingRoleId === role.id ? <><button type="button" disabled={saving} onClick={() => saveRole(role)} className="text-xs font-semibold text-primary">Save</button><button type="button" onClick={() => setEditingRoleId(null)} className="text-xs text-on-surface-variant">Cancel</button></> : <><button type="button" onClick={() => { setEditingRoleId(role.id); setEditingRoleName(role.name); setEditingBaseRole(role.base_role as (typeof BASE_ROLES)[number]); }} className="text-xs font-medium text-primary">Edit</button><button type="button" onClick={() => toggleRole(role)} className="text-xs font-medium text-on-surface-variant">{role.is_active ? "Disable" : "Enable"}</button><button type="button" onClick={() => deleteRole(role)} className="text-xs font-medium text-error">Delete</button></>}</div></div></div>)}{roles.length === 0 && <p className="text-xs text-on-surface-variant">No custom roles created yet.</p>}</div>
    </section>

    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div><h2 className="text-lg font-bold text-on-surface">Departments</h2><p className="text-xs text-on-surface-variant mt-1 max-w-2xl">Create and manage the departments available in the employee directory. Deleting a department is blocked while employees are assigned to it.</p></div>
        <div className="flex gap-2 w-full lg:w-auto"><input value={departmentName} onChange={(e) => setDepartmentName(e.target.value.replace(/[^a-zA-Z0-9 &-]/g, ""))} placeholder="New department" maxLength={80} className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm" /><button type="button" onClick={createDepartment} disabled={saving} className="rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Adding..." : "+ Add department"}</button></div>
      </div>
      {departments.length > 0 ? <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">{departments.map((department) => <div key={department.id} className="border border-outline-variant rounded-lg p-3"><div className="flex items-center justify-between gap-3">{editingDepartmentId === department.id ? <input value={editingDepartmentName} onChange={(e) => setEditingDepartmentName(e.target.value.replace(/[^a-zA-Z0-9 &-]/g, ""))} className="flex-1 rounded-md border border-outline-variant bg-background px-2 py-1 text-sm" /> : <div><p className="text-sm font-semibold text-on-surface">{department.name}</p><p className="text-[11px] text-on-surface-variant">{department.is_active ? "Active" : "Inactive"}</p></div>}<div className="flex items-center gap-2">{editingDepartmentId === department.id ? <><button type="button" disabled={saving} onClick={() => saveDepartment(department)} className="text-xs font-semibold text-primary">Save</button><button type="button" onClick={() => setEditingDepartmentId(null)} className="text-xs text-on-surface-variant">Cancel</button></> : <><button type="button" onClick={() => { setEditingDepartmentId(department.id); setEditingDepartmentName(department.name); }} className="text-xs font-medium text-primary">Edit</button><button type="button" onClick={() => toggleDepartment(department)} className="text-xs font-medium text-on-surface-variant">{department.is_active ? "Disable" : "Enable"}</button><button type="button" onClick={() => deleteDepartment(department)} className="text-xs font-medium text-error">Delete</button></>}</div></div></div>)}</div> : <p className="mt-5 text-xs text-on-surface-variant">No departments found. Add the first department above.</p>}
    </section>

    {error && <p className="text-xs text-error">{error}</p>}
  </div>;
}
