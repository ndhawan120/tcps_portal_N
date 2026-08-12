"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RoleSelect from "./RoleSelect";
import DepartmentSelect from "./DepartmentSelect";
import StatusSelect from "./StatusSelect";
import ManagerSelect from "./ManagerSelect";

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
};

type Manager = { id: string; first_name: string; last_name: string };

export default function PeopleAccess({ people, managers }: { people: Person[]; managers: Manager[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => {
      const name = `${person.first_name ?? ""} ${person.last_name ?? ""}`.toLowerCase();
      return (
        (!q ||
          name.includes(q) ||
          (person.email ?? "").toLowerCase().includes(q) ||
          (person.department ?? "").toLowerCase().includes(q)) &&
        (roleFilter === "all" || person.role === roleFilter) &&
        (statusFilter === "all" || person.status === statusFilter)
      );
    });
  }, [people, query, roleFilter, statusFilter]);

  const clear = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return (
    <>
      <div className="px-5 pb-4 flex flex-col lg:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="people-search" className="sr-only">
            Search employees and managers
          </label>
          <input
            id="people-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or department..."
            className="w-full rounded-md border border-outline-variant bg-background px-3 py-2 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm"
        >
          <option value="all">All roles</option>
          <option value="employee">Employees</option>
          <option value="manager">Managers</option>
          <option value="admin">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="rounded-md border border-outline-variant bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        {(query || roleFilter !== "all" || statusFilter !== "all") && (
          <button
            type="button"
            onClick={clear}
            className="rounded-md border border-outline-variant px-3 py-2 text-sm font-medium"
          >
            Clear
          </button>
        )}
      </div>

      <div className="px-5 pb-3 text-xs text-on-surface-variant">
        Showing <strong className="text-on-surface">{filtered.length}</strong> of {people.length} people
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Department</th>
              <th className="text-left px-5 py-3">Role / Access</th>
              <th className="text-left px-5 py-3">Manager</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map((person) => (
              <tr key={person.id}>
                <td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold">
                        {`${person.first_name?.[0] ?? ""}${person.last_name?.[0] ?? ""}`.toUpperCase()}
                      </div>
                    )}
                    <span>
                      {person.first_name} {person.last_name}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{person.email}</td>
                <td className="px-5 py-3">
                  <DepartmentSelect userId={person.id} currentDepartment={person.department} />
                </td>
                <td className="px-5 py-3">
                  <RoleSelect
                    userId={person.id}
                    currentRole={person.role}
                    currentCustomRoleId={person.custom_role_id}
                  />
                </td>
                <td className="px-5 py-3">
                  <ManagerSelect userId={person.id} currentManagerId={person.manager_id} managers={managers} />
                </td>
                <td className="px-5 py-3">
                  <StatusSelect userId={person.id} currentStatus={person.status} />
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/employees/${person.profile_slug || person.id}`}
                    className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                  >
                    View profile →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="p-8 text-center text-sm text-on-surface-variant">
          No matching employees or managers found.
        </div>
      )}
    </>
  );
}
