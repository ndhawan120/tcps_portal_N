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

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  /*
   * Only Admins and Managers can access this page.
   */
  if (
    profile.role !== "admin" &&
    profile.role !== "manager"
  ) {
    redirect("/dashboard");
  }

  /*
   * ADMIN
   *
   * Admin sees every employee.
   *
   * MANAGER
   *
   * Manager sees only employees whose manager_id
   * is the currently logged-in manager.
   */
  let employeeQuery = supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee")
    .order("last_name", {
      ascending: true,
    });

  if (profile.role === "manager") {
    employeeQuery = employeeQuery.eq(
      "manager_id",
      profile.id
    );
  }

  const {
    data: employees,
    error: employeesError,
  } = await employeeQuery;

  if (employeesError) {
    console.error(
      "Employees query failed:",
      employeesError
    );
  }

  const employeeList = employees ?? [];

  /*
   * Get all PER data.
   */
  const { data: objectives } = await supabase
    .from("per_objectives")
    .select(
      "user_id, objective_number, status"
    );

  /*
   * Get all exam data.
   */
  const { data: exams } = await supabase
    .from("exams")
    .select(
      "user_id, exam_module, status, result"
    );

  /*
   * Create quick lookup maps.
   */
  const objectivesByUser: Record<
    string,
    any[]
  > = {};

  for (const objective of objectives ?? []) {
    if (!objectivesByUser[objective.user_id]) {
      objectivesByUser[objective.user_id] = [];
    }

    objectivesByUser[objective.user_id].push(
      objective
    );
  }

  const examsByUser: Record<
    string,
    any[]
  > = {};

  for (const exam of exams ?? []) {
    if (!examsByUser[exam.user_id]) {
      examsByUser[exam.user_id] = [];
    }

    examsByUser[exam.user_id].push(exam);
  }

  /*
   * Build employee statistics.
   */
  const employeeRows = employeeList.map(
    (employee) => {
      const employeeObjectives =
        objectivesByUser[employee.id] ?? [];

      const employeeExams =
        examsByUser[employee.id] ?? [];

      const approvedPER =
        employeeObjectives.filter(
          (item) =>
            item.status === "approved"
        ).length;

      const pendingPER =
        employeeObjectives.filter(
          (item) =>
            item.status ===
            "pending_approval"
        ).length;

      const passedExams =
        employeeExams.filter(
          (item) =>
            item.status === "passed" ||
            item.result?.toLowerCase() ===
              "pass"
        ).length;

      const perProgress = Math.round(
        (approvedPER /
          TOTAL_OBJECTIVES) *
          100
      );

      const examProgress = Math.round(
        (passedExams /
          TOTAL_EXAMS) *
          100
      );

      return {
        ...employee,
        approvedPER,
        pendingPER,
        passedExams,
        perProgress,
        examProgress,
      };
    }
  );

  const totalEmployees =
    employeeRows.length;

  const activeEmployees =
    employeeRows.filter(
      (employee) =>
        employee.status === "active"
    ).length;

  const pendingPERApprovals =
    employeeRows.reduce(
      (total, employee) =>
        total + employee.pendingPER,
      0
    );

  return (
    <div>
      <Nav
        role={profile.role}
        name={`${profile.first_name ?? ""} ${
          profile.last_name ?? ""
        }`.trim()}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              Employees
            </h1>

            <p className="text-sm text-on-surface-variant mt-1">
              View employee information and
              progress.
            </p>
          </div>

          <a
            href="/employees/export"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
          >
            Download Excel
          </a>

        </div>

        {/* STAT CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

          <StatCard
            label="Total Employees"
            value={totalEmployees}
          />

          <StatCard
            label="Active Employees"
            value={activeEmployees}
          />

          <StatCard
            label="Pending PER Approvals"
            value={pendingPERApprovals}
          />

        </div>

        {/* ERROR */}

        {employeesError && (
          <div className="mb-6 rounded-lg border border-error/30 bg-error-container/40 px-4 py-3">
            <p className="text-sm font-semibold text-error">
              Could not load employees.
            </p>

            <p className="text-xs text-error mt-1">
              {employeesError.message}
            </p>
          </div>
        )}

        {/* DIRECTORY */}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">

          <div className="px-5 py-5 border-b border-outline-variant">

            <h2 className="text-lg font-bold text-on-surface">
              Employee Directory
            </h2>

            <p className="text-xs text-on-surface-variant mt-1">
              {totalEmployees} employee
              {totalEmployees === 1
                ? ""
                : "s"} found
            </p>

          </div>

          {employeeRows.length === 0 ? (

            <div className="px-6 py-12 text-center">

              <p className="text-sm font-semibold text-on-surface">
                No employees found.
              </p>

              <p className="text-xs text-on-surface-variant mt-2">
                Check that your employee accounts
                have the role set to
                <strong> employee </strong>
                in the profiles table.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-surface-container text-xs uppercase text-on-surface-variant">

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

                    <th className="text-left px-5 py-3">
                      PER
                    </th>

                    <th className="text-left px-5 py-3">
                      Exams
                    </th>

                    <th className="text-left px-5 py-3">
                      Pending
                    </th>

                    <th className="text-left px-5 py-3">
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-outline-variant">

                  {employeeRows.map(
                    (employee) => (

                      <tr
                        key={employee.id}
                        className="hover:bg-surface-container-low"
                      >

                        {/* NAME */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            {employee.profile_image_url ? (

                              <img
                                src={
                                  employee.profile_image_url
                                }
                                alt=""
                                className="w-9 h-9 rounded-full object-cover"
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

                              <p className="font-semibold text-on-surface">
                                {
                                  employee.first_name
                                }{" "}
                                {
                                  employee.last_name
                                }
                              </p>

                              <p className="text-xs text-on-surface-variant">
                                {
                                  employee.email
                                }
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* DEPARTMENT */}

                        <td className="px-5 py-4 text-on-surface-variant">
                          {employee.department ||
                            "—"}
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                              employee.status ===
                              "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {
                              employee.status
                            }
                          </span>

                        </td>

                        {/* PER */}

                        <td className="px-5 py-4">

                          <div className="min-w-[120px]">

                            <div className="flex justify-between text-xs mb-1">

                              <span className="text-on-surface-variant">
                                {
                                  employee.approvedPER
                                }
                                /
                                {
                                  TOTAL_OBJECTIVES
                                }
                              </span>

                              <span className="font-semibold text-primary">
                                {
                                  employee.perProgress
                                }%
                              </span>

                            </div>

                            <div className="h-2 bg-surface-container rounded-full overflow-hidden">

                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${employee.perProgress}%`,
                                }}
                              />

                            </div>

                          </div>

                        </td>

                        {/* EXAMS */}

                        <td className="px-5 py-4">

                          <div className="min-w-[120px]">

                            <div className="flex justify-between text-xs mb-1">

                              <span className="text-on-surface-variant">
                                {
                                  employee.passedExams
                                }
                                /
                                {
                                  TOTAL_EXAMS
                                }
                              </span>

                              <span className="font-semibold text-primary">
                                {
                                  employee.examProgress
                                }%
                              </span>

                            </div>

                            <div className="h-2 bg-surface-container rounded-full overflow-hidden">

                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${employee.examProgress}%`,
                                }}
                              />

                            </div>

                          </div>

                        </td>

                        {/* PENDING */}

                        <td className="px-5 py-4">

                          {employee.pendingPER >
                          0 ? (

                            <span className="inline-flex text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                              {
                                employee.pendingPER
                              }
                            </span>

                          ) : (

                            <span className="text-xs text-on-surface-variant">
                              —
                            </span>

                          )}

                        </td>

                        {/* VIEW */}

                        <td className="px-5 py-4">

                          <Link
                            href={`/employees/${employee.id}`}
                            className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                          >
                            View profile →
                          </Link>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">

      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>

      <p className="text-3xl font-extrabold text-primary mt-1">
        {value}
      </p>

    </div>
  );
}

function getInitials(
  firstName: string | null,
  lastName: string | null
) {
  const first =
    firstName?.trim()?.charAt(0) ?? "";

  const last =
    lastName?.trim()?.charAt(0) ?? "";

  return (
    `${first}${last}`.toUpperCase() || "U"
  );
}
