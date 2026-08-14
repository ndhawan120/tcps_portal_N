"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleSelect from "./RoleSelect";
import DepartmentSelect from "./DepartmentSelect";
import StatusSelect from "./StatusSelect";

type Person = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  department: string | null;
  role: string;
  custom_role_id?: string | null;
  manager_id: string | null;
  status: string;
  avatar_url: string | null;
  profile_slug?: string | null;
  last_sign_in_at?: string | null;
};

type Manager = { id: string; first_name: string; last_name: string };

const PAGE_SIZE = 10;

export default function PeopleAccess({ people, managers }: { people: Person[]; managers: Manager[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => {
      const name = `${person.first_name ?? ""} ${person.last_name ?? ""}`.toLowerCase();
      return (
        (!q || name.includes(q) || (person.email ?? "").toLowerCase().includes(q) || (person.department ?? "").toLowerCase().includes(q)) &&
        (roleFilter === "all" || person.role === roleFilter) &&
        (statusFilter === "all" || person.status === statusFilter)
      );
    });
  }, [people, query, roleFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const clear = () => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); };
  const updateFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Name", "Email", "Department", "Role", "Status", "Last Login"],
      ...filtered.map((p) => [
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(), p.email, p.department, p.role, p.status,
        p.last_sign_in_at ? new Date(p.last_sign_in_at).toISOString() : "Never",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "tcps-user-management.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/users/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: form.get("first_name"), last_name: form.get("last_name"), department: form.get("department") || null, joining_date: form.get("joining_date") || null }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setMessage(data.error ?? "Unable to update user."); return; }
    setEditing(null); router.refresh();
  };

  const deleteUser = async () => {
    if (!deleting) return;
    setSaving(true); setMessage(null);
    const response = await fetch(`/api/admin/users/${deleting.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setMessage(data.error ?? "Unable to delete user."); return; }
    setDeleting(null); router.refresh();
  };

  return (
    <>
      <div className="px-5 py-4 flex flex-col xl:flex-row gap-3 border-b border-outline-variant">
        <div className="flex-1"><label htmlFor="people-search" className="sr-only">Search employees and managers</label><input id="people-search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search employees, roles, or status..." className="w-full rounded-md border border-outline-variant bg-background px-3 py-2 text-sm" /></div>
        <select value={roleFilter} onChange={(e) => updateFilter(setRoleFilter, e.target.value)} aria-label="Filter by role" className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm"><option value="all">All roles</option><option value="employee">Employees</option><option value="manager">Managers</option><option value="admin">Admins</option></select>
        <select value={statusFilter} onChange={(e) => updateFilter(setStatusFilter, e.target.value)} aria-label="Filter by status" className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option></select>
        {(query || roleFilter !== "all" || statusFilter !== "all") && <button type="button" onClick={clear} className="rounded-md border border-outline-variant px-3 py-2 text-sm font-medium">Clear</button>}
        <button type="button" onClick={exportCsv} className="rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold hover:opacity-90">Export CSV</button>
      </div>

      <div className="px-5 py-3 text-xs text-on-surface-variant flex justify-between gap-3"><span>Showing <strong className="text-on-surface">{filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)}</strong> of {filtered.length} people</span><span>{people.length} total</span></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold"><tr><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Email</th><th className="text-left px-5 py-3">Department</th><th className="text-left px-5 py-3">Role / Access</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">Last Login</th><th className="text-right px-5 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-outline-variant">{visible.map((person) => <tr key={person.id} className="hover:bg-surface-container-low group">
            <td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap"><div className="flex items-center gap-2">{person.avatar_url ? <img src={person.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold">{`${person.first_name?.[0] ?? ""}${person.last_name?.[0] ?? ""}`.toUpperCase()}</div>}<span>{person.first_name} {person.last_name}</span></div></td>
            <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{person.email}</td>
            <td className="px-5 py-3"><DepartmentSelect userId={person.id} currentDepartment={person.department} /></td>
            <td className="px-5 py-3"><RoleSelect userId={person.id} currentRole={person.role} currentCustomRoleId={person.custom_role_id} /></td>
            <td className="px-5 py-3"><StatusSelect userId={person.id} currentStatus={person.status} /></td>
            <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{person.last_sign_in_at ? new Date(person.last_sign_in_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Never"}</td>
            <td className="px-5 py-3"><div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100"><button type="button" onClick={() => setEditing(person)} className="p-2 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary" title="Edit user" aria-label="Edit user">✎</button><button type="button" onClick={() => setDeleting(person)} className="p-2 rounded-md hover:bg-error-container text-on-surface-variant hover:text-error disabled:opacity-40" title="Delete user" aria-label="Delete user" disabled={person.role === "admin"}>×</button>{person.profile_slug ? <Link href={`/employees/${person.profile_slug}`} className="p-2 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary" title="View profile" aria-label="View profile">↗</Link> : null}</div></td>
          </tr>)}</tbody>
        </table>
      </div>

      {filtered.length === 0 && <div className="p-8 text-center text-sm text-on-surface-variant">No matching employees or managers found.</div>}
      {pageCount > 1 && <div className="px-5 py-4 border-t border-outline-variant flex items-center justify-between"><button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 rounded-md border border-outline-variant text-sm disabled:opacity-40">Previous</button><span className="text-xs text-on-surface-variant">Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="px-3 py-2 rounded-md border border-outline-variant text-sm disabled:opacity-40">Next</button></div>}

      {editing && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"><form onSubmit={saveEdit} className="w-full max-w-lg rounded-xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6"><div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-bold text-on-surface">Edit User</h3><p className="text-xs text-on-surface-variant mt-1">Update profile information without changing the security tier.</p></div><button type="button" onClick={() => setEditing(null)} className="text-xl text-on-surface-variant">×</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input name="first_name" required defaultValue={editing.first_name ?? ""} placeholder="First name" className="rounded-md border border-outline-variant px-3 py-2 text-sm" /><input name="last_name" required defaultValue={editing.last_name ?? ""} placeholder="Last name" className="rounded-md border border-outline-variant px-3 py-2 text-sm" /></div><input value={editing.email ?? ""} disabled className="w-full mt-3 rounded-md border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface-variant" /><select name="department" defaultValue={editing.department ?? ""} className="w-full mt-3 rounded-md border border-outline-variant px-3 py-2 text-sm bg-surface-container-lowest"><option value="">No department</option>{Array.from(new Set(people.map((p) => p.department).filter(Boolean) as string[])).sort().map((department) => <option key={department} value={department}>{department}</option>)}</select><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-md border border-outline-variant text-sm">Cancel</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-semibold disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button></div>{message && <p className="text-sm text-error mt-3">{message}</p>}</form></div>}

      {deleting && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6"><h3 className="text-lg font-bold text-on-surface">Delete user?</h3><p className="text-sm text-on-surface-variant mt-2">This permanently removes <strong>{deleting.first_name} {deleting.last_name}</strong> and their login account. This cannot be undone.</p><div className="flex justify-end gap-2 mt-6"><button type="button" onClick={() => setDeleting(null)} className="px-4 py-2 rounded-md border border-outline-variant text-sm">Cancel</button><button type="button" onClick={deleteUser} disabled={saving} className="px-4 py-2 rounded-md bg-error text-on-error text-sm font-semibold disabled:opacity-50">{saving ? "Deleting..." : "Delete permanently"}</button></div>{message && <p className="text-sm text-error mt-3">{message}</p>}</div></div>}
    </>
  );
}
