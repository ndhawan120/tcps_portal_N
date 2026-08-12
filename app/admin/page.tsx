import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  /*
   * Only administrators should access this page.
   */
  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  /*
   * Get all users.
   */
  const { data: allUsers, error: usersError } = await supabase
    .from("profiles")
    .select("*")
    .order("last_name", { ascending: true });

  if (usersError) {
    console.error("Failed to load users:", usersError);
  }

  const users = allUsers ?? [];

  /*
   * Managers and admins are available for assignment
   * as employee managers.
   */
  const managers = users.filter(
    (u) => u.role === "manager" || u.role === "admin"
  );

  /*
   * Basic counts for the admin page.
   *
   * These are intentionally simple account statistics.
   * Detailed PER/exam reporting belongs on the reporting/dashboard
   * areas rather than this administration page.
   */
  const totalUsers = users.length;

  const activeUsers = users.filter(
    (u) => u.status === "active"
  ).length;

  const pendingUsers = users.filter(
    (u) =>
      u.status === "pending" ||
      u.status === "pending_approval"
  ).length;

  const inactiveUsers = users.filter(
    (u) => u.status === "inactive"
  ).length;

  return (
    <div>
      <Nav
        role={profile?.role ?? "admin"}
        name={`${profile?.first_name ?? ""} ${
          profile?.last_name ?? ""
        }`}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              Admin Panel
            </h1>

            <p className="text-sm text-on-surface-variant mt-1">
              Manage employee accounts, roles, departments and
              reporting relationships.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/employees"
              className="text-sm font-medium px-4 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container"
            >
              View Employees
            </Link>

            <AddUserModal />
          </div>
        </div>

        {/* =====================================================
            ACCOUNT SUMMARY
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <AdminStatCard
            label="Total Users"
            value={totalUsers}
          />

          <AdminStatCard
            label="Active Users"
            value={activeUsers}
          />

          <AdminStatCard
            label="Pending Approval"
            value={pendingUsers}
          />

          <AdminStatCard
            label="Inactive Users"
            value={inactiveUsers}
          />

        </div>

        {/* =====================================================
            QUICK LINKS
        ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          <Link
            href="/employees"
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:bg-surface-container transition"
          >
            <p className="text-sm font-bold text-on-surface">
              Employees
            </p>

            <p className="text-xs text-on-surface-variant mt-1">
              View employee profiles, PER progress, exams and
              individual records.
            </p>

            <p className="text-xs font-semibold text-primary mt-4">
              View employees →
            </p>
          </Link>

          <Link
            href="/approvals"
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:bg-surface-container transition"
          >
            <p className="text-sm font-bold text-on-surface">
              Approvals
            </p>

            <p className="text-xs text-on-surface-variant mt-1">
              Review pending PER objective submissions from
              employees.
            </p>

            <p className="text-xs font-semibold text-primary mt-4">
              Review approvals →
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:bg-surface-container transition"
          >
            <p className="text-sm font-bold text-on-surface">
              Reporting Dashboard
            </p>

            <p className="text-xs text-on-surface-variant mt-1">
              View overall PER and exam reporting and progress.
            </p>

            <p className="text-xs font-semibold text-primary mt-4">
              Open dashboard →
            </p>
          </Link>

        </div>

        {/* =====================================================
            USER ACCOUNTS
        ====================================================== */}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">

          <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>
              <h2 className="text-lg font-bold text-on-surface">
                User Accounts
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                Manage account access, role, department, manager
                and account status.
              </p>
            </div>

            <Link
              href="/employees"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Open employee directory →
            </Link>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">

                <tr>

                  <th className="text-left px-5 py-3">
                    Name
                  </th>

                  <th className="text-left px-5 py-3">
                    Email
                  </th>

                  <th className="text-left px-5 py-3">
                    Department
                  </th>

                  <th className="text-left px-5 py-3">
                    Role
                  </th>

                  <th className="text-left px-5 py-3">
                    Manager
                  </th>

                  <th className="text-left px-5 py-3">
                    Status
                  </th>

                  <th className="text-left px-5 py-3">
                    Employee
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-outline-variant">

                {users.map((u) => (

                  <tr
                    key={u.id}
                    className="hover:bg-surface-container/40"
                  >

                    {/* NAME */}

                    <td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap">

                      {u.first_name} {u.last_name}

                    </td>

                    {/* EMAIL */}

                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">

                      {u.email}

                    </td>

                    {/* DEPARTMENT */}

                    <td className="px-5 py-3">

                      <DepartmentSelect
                        userId={u.id}
                        currentDepartment={u.department}
                      />

                    </td>

                    {/* ROLE */}

                    <td className="px-5 py-3">

                      <RoleSelect
                        userId={u.id}
                        currentRole={u.role}
                      />

                    </td>

                    {/* MANAGER */}

                    <td className="px-5 py-3">

                      <ManagerSelect
                        userId={u.id}
                        currentManagerId={u.manager_id}
                        managers={managers}
                      />

                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-3">

                      <StatusSelect
                        userId={u.id}
                        currentStatus={u.status}
                      />

                    </td>

                    {/* EMPLOYEE DETAILS */}

                    <td className="px-5 py-3">

                      <Link
                        href={`/employees/${u.id}`}
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

          {users.length === 0 && (

            <div className="px-5 py-10 text-center">

              <p className="text-sm text-on-surface-variant">
                No user accounts found.
              </p>

            </div>

          )}

        </div>

        {/* =====================================================
            HELP TEXT
        ====================================================== */}

        <p className="text-xs text-on-surface-variant mt-4">

          Use &quot;+ Add User&quot; to create an account directly.
          New registrations can be kept pending until an
          administrator approves them. Managers can be assigned
          to employees from the Manager column.

        </p>

      </main>
    </div>
  );
}


/* =============================================================
   ADMIN STAT CARD
============================================================= */

function AdminStatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">

      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">
        {label}
      </p>

      <p className="text-3xl font-extrabold text-primary">
        {value}
      </p>

    </div>
  );
}
