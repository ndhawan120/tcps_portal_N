import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import RoleSelect from "./RoleSelect";
import DepartmentSelect from "./DepartmentSelect";
import StatusSelect from "./StatusSelect";
import ManagerSelect from "./ManagerSelect";
import AddUserModal from "./AddUserModal";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: allUsers } = await supabase
    .from("profiles")
    .select("*")
    .order("last_name");

  const { data: allObjectives } = await supabase
    .from("per_objectives")
    .select("status");

  const total = allObjectives?.length ?? 0;
  const approved = allObjectives?.filter((o) => o.status === "approved").length ?? 0;
  const globalProgress = total > 0 ? Math.round((approved / total) * 100) : 0;

  const managers = (allUsers ?? []).filter(
    (u) => u.role === "manager" || u.role === "admin"
  );

  return (
    <div>
      <Nav role={profile?.role ?? "admin"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-on-surface">Admin Panel</h1>
          <AddUserModal />
        </div>
        <p className="text-sm text-on-surface-variant mb-8">
          Global progress across all users:{" "}
          <span className="font-semibold text-primary">{globalProgress}%</span>
        </p>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">
            User Accounts
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                <tr>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Department</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Manager</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {(allUsers ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                      {u.email}
                    </td>
                    <td className="px-5 py-3">
                      <DepartmentSelect userId={u.id} currentDepartment={u.department} />
                    </td>
                    <td className="px-5 py-3">
                      <RoleSelect userId={u.id} currentRole={u.role} />
                    </td>
                    <td className="px-5 py-3">
                      <ManagerSelect
                        userId={u.id}
                        currentManagerId={u.manager_id}
                        managers={managers}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <StatusSelect userId={u.id} currentStatus={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant mt-4">
          Use &quot;+ Add User&quot; to create accounts directly — either send them an
          email invite to set their own password, or set a temporary password
          yourself and share it with them. Setting someone to Inactive blocks
          them from logging in.
        </p>
      </main>
    </div>
  );
}
