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

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Get employees.
  // Admin sees everyone.
  // Manager sees only employees assigned to them.
  let usersQuery = supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee")
    .order("last_name", { ascending: true });

  if (profile.role === "manager") {
    usersQuery = usersQuery.eq("manager_id", user.id);
  }

  const { data: employees, error: employeesError } = await usersQuery;

  if (employeesError) {
    console.error("Failed to load employees:", employeesError);
  }

  const employeeIds = (employees ?? []).map((employee) => employee.id);

  let objectives: any[] = [];
  let exams: any[] = [];

  if (employeeIds.length > 0) {
    const [objectivesResult, examsResult] = await Promise.all([
      supabase
        .from("per_objectives")
        .select("user_id, objective_number, status")
        .in("user_id", employeeIds),

      supabase
        .from("exams")
        .select("user_id, exam_module, status, result")
        .in("user_id", employeeIds),
    ]);

    objectives = objectivesResult.data ?? [];
    exams = examsResult.data ?? [];
  }

  const employeeStats = (employees ?? []).map((employee) => {
    const employeeObjectives = objectives.filter(
      (objective) => objective.user_id === employee.id
    );

    const employeeExams = exams.filter(
      (exam) => exam.user_id === employee.id
    );

    const approvedObjectives = employeeObjectives.filter(
      (objective) => objective.status === "approved"
    ).length;

    const pendingObjectives = employeeObjectives.filter(
      (objective) => objective.status === "pending_approval"
    ).length;

    const passedExams = employeeExams.filter(
      (exam) =>
        exam.status === "passed" ||
        String(exam.result ?? "").toLowerCase() === "pass"
    ).length;

    const objectiveProgress = Math.round(
      (approvedObjectives / TOTAL_OBJECTIVES) * 100
    );

    const examProgress = Math.round(
      (passedExams / TOTAL_EXAMS) * 100
    );

    return {
      ...employee,
      approvedObjectives,
      pendingObjectives,
      passedExams,
      objectiveProgress,
      examProgress,
    };
  });

  return (
    <div>
      <Nav
        role={profile.role}
        name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              Employees
            </h1>

            <p className="text-sm text-on-surface-variant mt-1">
              {profile.role === "admin"
                ? "View and manage all employee records."
                : "View the employees assigned to your team."}
            </p>
          </div>
        </div>

        {employeeStats.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
            <p className="text-sm text-on-surface-variant">
              No employees found.
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                  <tr>
                    <th className="text-left px-5 py-3">Employee</th>
                    <th className="text-left px-5 py-3">Department</th>
                    <th className="text-left px-5 py-3">Manager</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">PER Progress</th>
                    <th className="text-left px-5 py-3">Exam Progress</th>
                    <th className="text-left px-5 py-3">
                      Pending PER
                    </th>
                    <th className="text-left px-5 py-3"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-outline-variant">
                  {employeeStats.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-on-surface whitespace-nowrap">
                          {employee.first_name} {employee.last_name}
                        </div>

                        <div className="text-xs text-on-surface-variant mt-0.5">
                          {employee.email}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-on-surface-variant">
                        {employee.department || "—"}
                      </td>

                      <td className="px-5 py-4 text-on-surface-variant">
                        {employee.manager_id
                          ? "Assigned"
                          : "Not assigned"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                            employee.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {employee.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${Math.min(
                                  employee.objectiveProgress,
                                  100
                                )}%`,
                              }}
                            />
                          </div>

                          <span className="text-xs font-medium">
                            {employee.objectiveProgress}%
                          </span>
                        </div>

                        <p className="text-[11px] text-on-surface-variant mt-1">
                          {employee.approvedObjectives}/{TOTAL_OBJECTIVES}{" "}
                          approved
                        </p>
                      </td>

                      <td className="px-5 py-4 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${Math.min(
                                  employee.examProgress,
                                  100
                                )}%`,
                              }}
                            />
                          </div>

                          <span className="text-xs font-medium">
                            {employee.examProgress}%
                          </span>
                        </div>

                        <p className="text-[11px] text-on-surface-variant mt-1">
                          {employee.passedExams}/{TOTAL_EXAMS} passed
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {employee.pendingObjectives > 0 ? (
                          <span className="inline-flex px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold">
                            {employee.pendingObjectives}
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">
                            0
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/employee/${employee.id}`}
                          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                        >
                          View details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
