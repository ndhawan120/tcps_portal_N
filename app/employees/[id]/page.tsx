import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import ObjectivesList from "@/app/per-tracker/ObjectivesList";
import ExamsList from "@/app/exams/ExamsList";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployeeProfilePage({
  params,
}: PageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: viewer } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!viewer) {
    redirect("/login");
  }

  if (viewer.role !== "admin" && viewer.role !== "manager") {
    redirect("/dashboard");
  }

  const { id } = await params;

  /*
   * Get employee profile.
   */
  const { data: employee, error: employeeError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (employeeError || !employee) {
    notFound();
  }

  /*
   * Managers can ONLY view their own team members.
   *
   * Admins can view everyone.
   */
  if (
    viewer.role === "manager" &&
    employee.manager_id !== viewer.id
  ) {
    redirect("/employees");
  }

  /*
   * Get PER objectives.
   */
  const { data: objectives } = await supabase
    .from("per_objectives")
    .select(
      `
        id,
        user_id,
        objective_number,
        title,
        status,
        evidence_notes,
        submitted_at,
        approved_at,
        approved_by,
        created_at,
        updated_at
      `
    )
    .eq("user_id", employee.id)
    .order("objective_number", {
      ascending: true,
    });

  /*
   * Get exams.
   */
  const { data: exams } = await supabase
    .from("exams")
    .select(
      `
        id,
        user_id,
        exam_module,
        level,
        status,
        exam_date,
        next_sitting,
        result,
        created_at,
        updated_at
      `
    )
    .eq("user_id", employee.id);

  /*
   * PER statistics.
   */
  const approvedObjectives =
    objectives?.filter(
      (objective) => objective.status === "approved"
    ).length ?? 0;

  const pendingObjectives =
    objectives?.filter(
      (objective) =>
        objective.status === "pending_approval"
    ).length ?? 0;

  const rejectedObjectives =
    objectives?.filter(
      (objective) => objective.status === "rejected"
    ).length ?? 0;

  const draftObjectives =
    objectives?.filter(
      (objective) => objective.status === "draft"
    ).length ?? 0;

  const notStartedObjectives = Math.max(
    0,
    TOTAL_OBJECTIVES -
      approvedObjectives -
      pendingObjectives -
      rejectedObjectives -
      draftObjectives
  );

  const perProgress = Math.min(
    100,
    Math.round(
      (approvedObjectives / TOTAL_OBJECTIVES) * 100
    )
  );

  /*
   * Exam statistics.
   */
  const passedExams =
    exams?.filter(
      (exam) =>
        exam.status === "passed" ||
        exam.result?.toLowerCase() === "pass"
    ).length ?? 0;

  const inProgressExams =
    exams?.filter(
      (exam) => exam.status === "in_progress"
    ).length ?? 0;

  const scheduledExams =
    exams?.filter(
      (exam) => exam.status === "scheduled"
    ).length ?? 0;

  const failedExams =
    exams?.filter(
      (exam) =>
        exam.status === "failed" ||
        exam.result?.toLowerCase() === "fail"
    ).length ?? 0;

  const notStartedExams = Math.max(
    0,
    TOTAL_EXAMS -
      passedExams -
      inProgressExams -
      scheduledExams -
      failedExams
  );

  const examProgress = Math.min(
    100,
    Math.round(
      (passedExams / TOTAL_EXAMS) * 100
    )
  );

  /*
   * Convert objective data into the format expected
   * by ObjectivesList.
   */
  const existingByNumber = Object.fromEntries(
    (objectives ?? []).map((objective) => [
      objective.objective_number,
      {
        status: objective.status,
        evidence_notes: objective.evidence_notes,
        submitted_at: objective.submitted_at,
        approved_at: objective.approved_at,
      },
    ])
  );

  /*
   * Convert exam data into the format expected
   * by ExamsList.
   */
  const existingByModule = Object.fromEntries(
    (exams ?? []).map((exam) => [
      exam.exam_module,
      {
        status: exam.status,
        next_sitting: exam.next_sitting,
        result: exam.result,
      },
    ])
  );

  return (
    <div>
      <Nav
        role={viewer.role}
        name={`${viewer.first_name ?? ""} ${
          viewer.last_name ?? ""
        }`.trim()}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Back */}
        <div className="mb-6">
          <Link
            href="/employees"
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to Employees
          </Link>
        </div>

        {/* Employee header */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">

            {/* Profile image */}
            {employee.profile_image_url ? (
              <img
                src={employee.profile_image_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover border border-outline-variant"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-xl font-bold text-on-surface-variant">
                {getInitials(
                  employee.first_name,
                  employee.last_name
                )}
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-on-surface">
                  {employee.first_name}{" "}
                  {employee.last_name}
                </h1>

                <EmployeeStatus
                  status={employee.status}
                />
              </div>

              <p className="text-sm text-on-surface-variant mt-1">
                {employee.email}
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-on-surface-variant">
                <span>
                  Department:{" "}
                  <strong className="text-on-surface">
                    {employee.department || "—"}
                  </strong>
                </span>

                <span>
                  Role:{" "}
                  <strong className="text-on-surface capitalize">
                    {employee.role || "—"}
                  </strong>
                </span>

                {employee.job_title && (
                  <span>
                    Job title:{" "}
                    <strong className="text-on-surface">
                      {employee.job_title}
                    </strong>
                  </span>
                )}

                {employee.joining_date && (
                  <span>
                    Joining date:{" "}
                    <strong className="text-on-surface">
                      {new Date(
                        employee.joining_date
                      ).toLocaleDateString()}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* Export */}
            <a
              href={`/employees/export?user_id=${employee.id}`}
              className="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container"
            >
              Download Excel
            </a>
          </div>
        </div>

        {/* Progress cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* PER */}
          <ProgressCard
            title="PER Progress"
            completed={approvedObjectives}
            total={TOTAL_OBJECTIVES}
            percentage={perProgress}
          />

          {/* Exams */}
          <ProgressCard
            title="Exam Progress"
            completed={passedExams}
            total={TOTAL_EXAMS}
            percentage={examProgress}
          />

        </div>

        {/* PER status summary */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-on-surface mb-4">
            PER Status
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

            <MiniStat
              label="Not Started"
              value={notStartedObjectives}
            />

            <MiniStat
              label="Draft"
              value={draftObjectives}
            />

            <MiniStat
              label="Pending Approval"
              value={pendingObjectives}
            />

            <MiniStat
              label="Approved"
              value={approvedObjectives}
            />

            <MiniStat
              label="Rejected"
              value={rejectedObjectives}
            />

          </div>
        </div>

        {/* Exam status summary */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-on-surface mb-4">
            Exam Status
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

            <MiniStat
              label="Not Started"
              value={notStartedExams}
            />

            <MiniStat
              label="In Progress"
              value={inProgressExams}
            />

            <MiniStat
              label="Scheduled"
              value={scheduledExams}
            />

            <MiniStat
              label="Passed"
              value={passedExams}
            />

            <MiniStat
              label="Failed"
              value={failedExams}
            />

          </div>
        </div>

        {/* PER objectives */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-on-surface">
                PER Objectives
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                Read-only view of this employee&apos;s PER
                progress.
              </p>
            </div>
          </div>

          <ObjectivesList
            userId={employee.id}
            existingByNumber={existingByNumber}
            readOnly
          />
        </section>

        {/* Exams */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-on-surface">
              ACCA Exams
            </h2>

            <p className="text-xs text-on-surface-variant mt-1">
              Read-only view of this employee&apos;s exam
              progress.
            </p>
          </div>

          <ExamsList
            userId={employee.id}
            existingByModule={existingByModule}
            readOnly
          />
        </section>

      </main>
    </div>
  );
}

function ProgressCard({
  title,
  completed,
  total,
  percentage,
}: {
  title: string;
  completed: number;
  total: number;
  percentage: number;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-on-surface">
          {title}
        </p>

        <p className="text-sm font-bold text-primary">
          {percentage}%
        </p>
      </div>

      <div className="h-3 bg-surface-container rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <p className="text-xs text-on-surface-variant mt-2">
        {completed} of {total} completed
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
      <p className="text-xs text-on-surface-variant">
        {label}
      </p>

      <p className="text-2xl font-bold text-on-surface mt-1">
        {value}
      </p>
    </div>
  );
}

function EmployeeStatus({
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
  const first =
    firstName?.trim()?.charAt(0) ?? "";

  const last =
    lastName?.trim()?.charAt(0) ?? "";

  return (
    `${first}${last}`.toUpperCase() || "U"
  );
}
