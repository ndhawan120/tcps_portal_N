import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!viewer || !["admin", "manager"].includes(viewer.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const { data: employee } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "employee")
    .single();

  if (!employee) {
    notFound();
  }

  // Managers can only see employees assigned to them.
  // Admins can see every employee.
  if (viewer.role === "manager" && employee.manager_id !== viewer.id) {
    redirect("/employees");
  }

  const [{ data: objectives }, { data: exams }] = await Promise.all([
    supabase
      .from("per_objectives")
      .select("*")
      .eq("user_id", employee.id)
      .order("objective_number"),

    supabase
      .from("exams")
      .select("*")
      .eq("user_id", employee.id),
  ]);

  const approvedObjectives =
    objectives?.filter((o) => o.status === "approved").length ?? 0;

  const pendingObjectives =
    objectives?.filter((o) => o.status === "pending_approval").length ?? 0;

  const rejectedObjectives =
    objectives?.filter((o) => o.status === "rejected").length ?? 0;

  const passedExams =
    exams?.filter(
      (e) =>
        e.status === "passed" ||
        String(e.result ?? "").toLowerCase() === "pass"
    ).length ?? 0;

  const objectiveProgress = Math.round(
    (approvedObjectives / TOTAL_OBJECTIVES) * 100
  );

  const examProgress = Math.round((passedExams / TOTAL_EXAMS) * 100);

  return (
    <div>
      <Nav
        role={viewer.role}
        name={`${viewer.first_name ?? ""} ${viewer.last_name ?? ""}`}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            href="/employees"
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to Employees
          </Link>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                {employee.first_name} {employee.last_name}
              </h1>

              <p className="text-sm text-on-surface-variant mt-1">
                {employee.email}
              </p>

              <div className="flex flex-wrap gap-3 mt-4 text-xs text-on-surface-variant">
                <span>
                  Department:{" "}
                  <strong className="text-on-surface">
                    {employee.department || "—"}
                  </strong>
                </span>

                <span>
                  Status:{" "}
                  <strong className="text-on-surface">
                    {employee.status}
                  </strong>
                </span>

                {employee.joining_date && (
                  <span>
                    Joining Date:{" "}
                    <strong className="text-on-surface">
                      {new Date(employee.joining_date).toLocaleDateString()}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ProgressCard
            label="PER Progress"
            value={`${objectiveProgress}%`}
            sub={`${approvedObjectives}/${TOTAL_OBJECTIVES} approved`}
          />

          <ProgressCard
            label="Exam Progress"
            value={`${examProgress}%`}
            sub={`${passedExams}/${TOTAL_EXAMS} passed`}
          />

          <ProgressCard
            label="Pending PER"
            value={String(pendingObjectives)}
            sub="Awaiting approval"
          />

          <ProgressCard
            label="Rejected PER"
            value={String(rejectedObjectives)}
            sub="Need attention"
          />
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-on-surface">PER Objectives</h2>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            {(objectives ?? []).length === 0 ? (
              <p className="p-6 text-sm text-on-surface-variant">
                No PER data available.
              </p>
            ) : (
              <div className="divide-y divide-outline-variant">
                {(objectives ?? []).map((objective) => (
                  <div
                    key={objective.id}
                    className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        Objective {objective.objective_number}
                      </p>

                      <p className="text-xs text-on-surface-variant mt-1">
                        {objective.title}
                      </p>
                    </div>

                    <StatusPill status={objective.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-on-surface mb-4">Exams</h2>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            {(exams ?? []).length === 0 ? (
              <p className="p-6 text-sm text-on-surface-variant">
                No exam data available.
              </p>
            ) : (
              <div className="divide-y divide-outline-variant">
                {(exams ?? []).map((exam) => (
                  <div
                    key={exam.id}
                    className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {exam.exam_module}
                      </p>

                      <p className="text-xs text-on-surface-variant mt-1">
                        {exam.level}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-on-surface-variant">
                        Result: {exam.result || "—"}
                      </span>

                      <StatusPill status={exam.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ProgressCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>

      <p className="text-3xl font-extrabold text-primary mt-1">{value}</p>

      <p className="text-xs text-on-surface-variant mt-1">{sub}</p>
    </div>
  );
}
