import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import Nav from "@/components/Nav";

import RoleSelect from "./RoleSelect";
import DepartmentSelect from "./DepartmentSelect";
import StatusSelect from "./StatusSelect";
import ManagerSelect from "./ManagerSelect";
import AddUserModal from "./AddUserModal";
import RegistrationApproval from "./RegistrationApproval";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: allUsers } =
    await supabase
      .from("profiles")
      .select("*")
      .order("last_name");

  const { data: pendingUsers } =
    await supabase
      .from("profiles")
      .select(
        "id,first_name,last_name,email,department,created_at"
      )
      .eq("status", "pending")
      .order("created_at", {
        ascending: true,
      });

  const { data: allObjectives } =
    await supabase
      .from("per_objectives")
      .select("status");

  const { data: allExams } =
    await supabase
      .from("exams")
      .select("status");

  const employees =
    (allUsers ?? []).filter(
      (u) => u.role === "employee"
    );

  const approvedCount =
    allObjectives?.filter(
      (o) => o.status === "approved"
    ).length ?? 0;

  const passedCount =
    allExams?.filter(
      (e) => e.status === "passed"
    ).length ?? 0;

  const userCount =
    employees.length || 1;

  const globalObjectiveProgress =
    Math.round(
      (approvedCount /
        (userCount * TOTAL_OBJECTIVES)) *
        100
    );

  const globalExamProgress =
    Math.round(
      (passedCount /
        (userCount * TOTAL_EXAMS)) *
        100
    );

  const managers =
    (allUsers ?? []).filter(
      (u) =>
        u.role === "manager" ||
        u.role === "admin"
    );

  return (
    <div>

      <Nav
        role="admin"
        name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-1">

          <h1 className="text-2xl font-bold text-on-surface">
            Admin Panel
          </h1>

          <div className="flex gap-2">

            <Link
              href="/admin/employees"
              className="text-sm font-semibold px-4 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container"
            >
              Employees
            </Link>

            <AddUserModal />

          </div>

        </div>

        <p className="text-sm text-on-surface-variant mb-8">
          Company-wide PER progress:{" "}
          <span className="font-semibold text-primary">
            {globalObjectiveProgress}%
          </span>
          {" · "}
          Exam pass rate:{" "}
          <span className="font-semibold text-primary">
            {globalExamProgress}%
          </span>
        </p>

        <RegistrationApproval
          users={pendingUsers ?? []}
        />

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">

          <div className="px-5 pt-5 pb-3 flex items-center justify-between">

            <h2 className="text-lg font-bold text-on-surface">
              User Accounts
            </h2>

            <span className="text-xs text-on-surface-variant">
              {allUsers?.length ?? 0} users
            </span>

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
                    Details
                  </th>

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

                      <DepartmentSelect
                        userId={u.id}
                        currentDepartment={u.department}
                      />

                    </td>

                    <td className="px-5 py-3">

                      <RoleSelect
                        userId={u.id}
                        currentRole={u.role}
                      />

                    </td>

                    <td className="px-5 py-3">

                      <ManagerSelect
                        userId={u.id}
                        currentManagerId={u.manager_id}
                        managers={managers}
                      />

                    </td>

                    <td className="px-5 py-3">

                      <StatusSelect
                        userId={u.id}
                        currentStatus={u.status}
                      />

                    </td>

                    <td className="px-5 py-3">

                      {u.id !== user.id && (

                        <Link
                          href={`/employee/${u.id}`}
                          className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                        >
                          View details →
                        </Link>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

        <p className="text-xs text-on-surface-variant mt-4">
          New registrations remain pending until an administrator approves them.
          Existing users can be assigned roles, departments, managers and account status from this page.
        </p>

      </main>

    </div>
  );
}
