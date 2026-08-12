import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

export default async function EmployeesPage() {
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

  if (!profile) {
    redirect("/login");
  }

  // Only Admin and Manager can access this page.
  if (profile.role !== "admin" && profile.role !== "manager") {
    redirect("/dashboard");
  }

  /*
   * ADMIN:
   * See every employee.
   *
   * MANAGER:
   * See only employees whose manager_id is the
   * currently logged-in manager.
   */
  let usersQuery = supabase
    .from("profiles")
    .select(
      `
        id,
        first_name,
        last_name,
        email,
        role,
        department,
        manager_id,
        status,
        created_at,
        joining_date,
        job_title,
        profile_image_url
      `
    )
    .order("last_name", { ascending: true });

  if (profile.role === "manager") {
    usersQuery = usersQuery.eq("manager_id", user.id);
  }

  const { data: users, error: usersError } = await usersQuery;

  if (usersError) {
    console.error("Employees query failed:", usersError);
  }

  const employeeUsers = (users ?? []).filter(
    (employee) => employee.id !== user.id
  );

  const employeeIds = employeeUsers.map((employee) => employee.id);

  /*
   * Get PER data for all visible employees.
   */
  const { data: objectives } =
    employeeIds.length > 0
      ? await supabase
          .from("per_objectives")
          .select("user_id, objective_number, status")
          .in("user_id", employeeIds)
      : { data: [] };

  /*
   * Get exam data for all visible employees.
   */
  const { data: exams } =
    employeeIds.length > 0
      ? await supabase
          .from("exams")
          .select("user_id, exam_module, status, result")
          .in("user_id", employeeIds)
      : { data: [] };

  /*
   * Build progress information per employee.
   */
  const employeeStats = employeeUsers.map((employee) => {
    const employeeObjectives = (objectives ?? []).filter(
      (objective) => objective.user_id === employee.id
    );

    const employeeExams = (exams ?? []).filter(
      (exam) => exam.user_id === employee.id
    );

    const approvedObjectives = employeeObjectives.filter(
      (objective) => objective.status === "approved"
    ).length;

    const passedExams = employeeExams.filter(
      (exam) =>
        exam.status === "passed" ||
        exam.result?.toLowerCase() === "pass"
    ).length;

    const pendingObjectives = employeeObjectives.filter(
      (objective) => objective.status === "pending_approval"
    ).length;

    const rejectedObjectives = employeeObjectives.filter(
      (objective) => objective.status === "rejected"
    ).length;

    const perProgress = Math.min(
      100,
      Math.round((approvedObjectives / TOTAL_OBJECTIVES) * 100)
    );

    const examProgress = Math.min(
      100,
      Math.round((passedExams / TOTAL_EXAMS) * 100)
    );

    return {
      ...employee,
      approvedObjectives,
      passedExams,
      pendingObjectives,
      rejectedObjectives,
      perProgress,
      examProgress,
    };
  });

  const totalEmployees = employeeStats.length;

  const pendingApprovals = employeeStats.reduce(
    (total, employee) => total + employee.pendingObjectives,
    0
  );

  const activeEmployees = employeeStats.filter(
    (employee) => employee.status === "active"
  ).length;

  return (
    <div>
      <Nav
        role={profile.role}
        name={`${profile.first_name ?? ""} ${
          profile.last_name ?? ""
        }`.trim()}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              {profile.role === "manager"
                ? "My Team"
                : "Employees"}
            </h1>

            <p className="text-sm text-on-surface-variant mt-1">
              {profile.role === "manager"
                ? "View the progress and performance of your team members."
                : "View and manage employee information and progress."}
            </p>
          </div>

          <a
            href="/employees/export"
            className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90"
          >
            Download Excel
          </a>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SummaryCard
            label="Total Employees"
            value={String(totalEmployees)}
          />

          <SummaryCard
            label="Active Employees"
            value={String(activeEmployees)}
          />

          <SummaryCard
            label="Pending PER Approvals"
            value={String(pendingApprovals)}
          />
        </div>

        {/* Employee table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-5 py-5 border-b border-outline-variant">
            <h2 className="text-lg font-bold text-on-surface">
              {profile.role === "manager"
                ? "Team Members"
                : "Employee Directory"}
            </h2>

            <p className="text-xs text-on-surface-variant mt-1">
              {totalEmployees} employee
              {totalEmployees === 1 ? "" : "s"} found
            </p>
          </div>

          {employeeStats.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-on-surface">
                {profile.role === "manager"
                  ? "No team members assigned."
                  : "No employees found."}
              </p>

              {profile.role === "manager" && (
                <p className="text-xs text-on-surface-variant mt-1">
                  Employees assigned to you will appear here.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                  <tr>
                    <th className="text-left px-5 py-3">
                      Employee
                    </th>

                    <th className="text-left px-5 py-3">
                      Department
                    </th>

                    <th className="text-left px-5 py-3">
                      Status
                    </th>

                    <th className="text-left px-5 py-3 min-w-[190px]">
                      PER Progress
                    </th>

                    <th className="text-left px-5 py-3 min-w-[190px]">
                      Exam Progress
                    </th>

                    <th className="text-left px-5 py-3">
                      Pending
                    </th>

                    <th className="text-left px-5 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-outline-variant">
                  {employeeStats.map((employee) => (
                    <tr
                      key={employee.id}
                      className="hover:bg-surface-container/40"
                    >
                      {/* Employee */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {employee.profile_image_url ? (
                            <img
                              src={employee.profile_image_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border border-outline-variant"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold text-on-surface-variant">
                              {getInitials(
                                employee.first_name,
                                employee.last_name
                              )}
                            </div>
                          )}

                          <div>
                            <p className="font-semibold text-on-surface whitespace-nowrap">
                              {employee.first_name}{" "}
                              {employee.last_name}
                            </p>

                            <p className="text-xs text-on-surface-variant">
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-5 py-4 text-on-surface-variant whitespace-nowrap">
                        {employee.department || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={employee.status}
                        />
                      </td>

                      {/* PER */}
                      <td className="px-5 py-4">
                        <div className="w-full max-w-[180px]">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-on-surface-variant">
                              {employee.approvedObjectives}/
                              {TOTAL_OBJECTIVES}
                            </span>

                            <span className="font-semibold text-on-surface">
                              {employee.perProgress}%
                            </span>
                          </div>

                          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{
                                width: `${employee.perProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Exams */}
                      <td className="px-5 py-4">
                        <div className="w-full max-w-[180px]">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-on-surface-variant">
                              {employee.passedExams}/
                              {TOTAL_EXAMS}
                            </span>

                            <span className="font-semibold text-on-surface">
                              {employee.examProgress}%
                            </span>
                          </div>

                          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{
                                width: `${employee.examProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Pending */}
                      <td className="px-5 py-4">
                        {employee.pendingObjectives > 0 ? (
                          <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                            {employee.pendingObjectives} pending
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">
                            None
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                        >
                          View profile →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
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

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  const normalized = status?.toLowerCase() ?? "unknown";

  const label =
    normalized === "active"
      ? "Active"
      : normalized === "pending"
      ? "Pending"
      : normalized === "rejected"
      ? "Rejected"
      : normalized === "inactive"
      ? "Inactive"
      : normalized.replace("_", " ");

  const className =
    normalized === "active"
      ? "bg-green-100 text-green-800"
      : normalized === "pending"
      ? "bg-amber-100 text-amber-800"
      : normalized === "rejected"
      ? "bg-red-100 text-red-800"
      : normalized === "inactive"
      ? "bg-surface-container text-on-surface-variant"
      : "bg-surface-container text-on-surface-variant";

  return (
    <span
      className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full capitalize ${className}`}
    >
      {label}
    </span>
  );
}

function getInitials(
  firstName: string | null,
  lastName: string | null
) {
  const first = firstName?.trim()?.charAt(0) ?? "";
  const last = lastName?.trim()?.charAt(0) ?? "";

  return `${first}${last}`.toUpperCase() || "U";
}
