import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import AnnouncementsList, {
  Announcement,
} from "@/components/AnnouncementsList";
import Link from "next/link";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

const PER_STATUSES = [
  {
    key: "not_started",
    label: "Not Started",
  },
  {
    key: "draft",
    label: "Draft",
  },
  {
    key: "pending_approval",
    label: "Pending Approval",
  },
  {
    key: "approved",
    label: "Approved",
  },
  {
    key: "rejected",
    label: "Rejected",
  },
];

const EXAM_STATUSES = [
  {
    key: "not_started",
    label: "Not Started",
  },
  {
    key: "in_progress",
    label: "In Progress",
  },
  {
    key: "scheduled",
    label: "Scheduled",
  },
  {
    key: "passed",
    label: "Passed",
  },
  {
    key: "failed",
    label: "Failed",
  },
];

export default async function DashboardPage() {
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

  const isAdmin = profile.role === "admin";
  const isManager = profile.role === "manager";

  /*
   * ============================================================
   * EMPLOYEE DASHBOARD
   * ============================================================
   */

  if (!isAdmin && !isManager) {
    const { data: objectives } = await supabase
      .from("per_objectives")
      .select("*")
      .eq("user_id", user.id)
      .order("objective_number");

    const { data: exams } = await supabase
      .from("exams")
      .select("*")
      .eq("user_id", user.id);

    const { data: rawAnnouncements } = await supabase
      .from("announcements")
      .select(
        "id, title, body, created_at, author_id, profiles!announcements_author_id_fkey(first_name,last_name)"
      )
      .order("created_at", { ascending: false })
      .limit(5);

    const announcements: Announcement[] = (rawAnnouncements ?? []).map(
      (a: any) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        created_at: a.created_at,
        author_id: a.author_id,
        author_name: `${a.profiles?.first_name ?? ""} ${
          a.profiles?.last_name ?? ""
        }`.trim(),
      })
    );

    const approvedObjectives =
      objectives?.filter((o) => o.status === "approved").length ?? 0;

    const overallProgress = Math.round(
      (approvedObjectives / TOTAL_OBJECTIVES) * 100
    );

    const examsPassed =
      exams?.filter((e) => e.status === "passed").length ?? 0;

    const nextExam = exams
      ?.filter((e) => e.next_sitting)
      .sort(
        (a, b) =>
          new Date(a.next_sitting!).getTime() -
          new Date(b.next_sitting!).getTime()
      )[0];

    const daysToNextExam = nextExam?.next_sitting
      ? Math.max(
          0,
          Math.ceil(
            (new Date(nextExam.next_sitting).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

    const inProgressObjectives = (objectives ?? []).filter(
      (o) => o.status !== "not_started"
    );

    return (
      <div>
        <Nav
          role={profile.role}
          name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`}
        />

        <main className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-on-surface mb-1">
            Welcome back, {profile.first_name}
          </h1>

          <p className="text-sm text-on-surface-variant mb-8">
            Here&apos;s where your ACCA progress stands.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="PER Progress"
              value={`${approvedObjectives}/${TOTAL_OBJECTIVES}`}
              sub={`${overallProgress}% approved`}
            />

            <StatCard
              label="Exams Passed"
              value={`${examsPassed}/${TOTAL_EXAMS}`}
            />

            <StatCard
              label="Days to Next Exam"
              value={
                daysToNextExam !== null ? String(daysToNextExam) : "—"
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-on-surface">
                  PER Objectives
                </h2>

                <Link
                  href="/per-tracker"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View all 22 →
                </Link>
              </div>

              {inProgressObjectives.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  You haven&apos;t started any objectives yet.{" "}
                  <Link
                    href="/per-tracker"
                    className="text-primary hover:underline"
                  >
                    Start your first one
                  </Link>
                  .
                </p>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {inProgressObjectives.map((o) => (
                    <li
                      key={o.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <p className="text-sm font-medium text-on-surface">
                        Objective {o.objective_number}: {o.title}
                      </p>

                      <StatusPill status={o.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-on-surface">
                  Latest Updates
                </h2>

                <Link
                  href="/announcements"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View all →
                </Link>
              </div>

              <AnnouncementsList
                announcements={announcements}
                compact
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ============================================================
   * MANAGER / ADMIN DASHBOARD
   * ============================================================
   */

  let teamProfiles: any[] = [];

  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "active")
      .order("first_name");

    teamProfiles = data ?? [];
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("manager_id", user.id)
      .eq("status", "active")
      .order("first_name");

    teamProfiles = data ?? [];
  }

  const teamUserIds = teamProfiles.map((p) => p.id);

  /*
   * Fetch all PER objectives for the visible team.
   */
  let objectives: any[] = [];

  if (teamUserIds.length > 0) {
    const { data } = await supabase
      .from("per_objectives")
      .select("*")
      .in("user_id", teamUserIds);

    objectives = data ?? [];
  }

  /*
   * Fetch all exams for the visible team.
   */
  let exams: any[] = [];

  if (teamUserIds.length > 0) {
    const { data } = await supabase
      .from("exams")
      .select("*")
      .in("user_id", teamUserIds);

    exams = data ?? [];
  }

  /*
   * PER status counts
   */
  const perCounts = PER_STATUSES.map((status) => ({
    ...status,
    count: objectives.filter((o) => o.status === status.key).length,
  }));

  /*
   * Exam status counts
   */
  const examCounts = EXAM_STATUSES.map((status) => ({
    ...status,
    count: exams.filter((e) => e.status === status.key).length,
  }));

  /*
   * Exam result counts
   */
  const passedResults = exams.filter((e) => e.result === "Pass").length;
  const failedResults = exams.filter((e) => e.result === "Fail").length;
  const exemptResults = exams.filter((e) => e.result === "Exempt").length;
  const noResultCount = exams.filter(
    (e) => !e.result || e.result.trim() === ""
  ).length;

  /*
   * Pending PER approvals
   */
  const pendingApprovals = objectives.filter(
    (o) => o.status === "pending_approval"
  ).length;

  const approvedCount = objectives.filter(
    (o) => o.status === "approved"
  ).length;

  const passedExamCount = exams.filter(
    (e) => e.status === "passed"
  ).length;

  /*
   * Avoid division by zero.
   */
  const totalObjectiveSlots = teamProfiles.length * TOTAL_OBJECTIVES;

  const perOverallProgress =
    totalObjectiveSlots > 0
      ? Math.round((approvedCount / totalObjectiveSlots) * 100)
      : 0;

  const totalExamSlots = teamProfiles.length * TOTAL_EXAMS;

  const examOverallProgress =
    totalExamSlots > 0
      ? Math.round((passedExamCount / totalExamSlots) * 100)
      : 0;

  /*
   * Announcements
   */
  const { data: rawAnnouncements } = await supabase
    .from("announcements")
    .select(
      "id, title, body, created_at, author_id, profiles!announcements_author_id_fkey(first_name,last_name)"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  const announcements: Announcement[] = (rawAnnouncements ?? []).map(
    (a: any) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      created_at: a.created_at,
      author_id: a.author_id,
      author_name: `${a.profiles?.first_name ?? ""} ${
        a.profiles?.last_name ?? ""
      }`.trim(),
    })
  );

  /*
   * Employees with pending approvals.
   */
  const pendingEmployeeIds = Array.from(
    new Set(
      objectives
        .filter((o) => o.status === "pending_approval")
        .map((o) => o.user_id)
    )
  );

  const pendingEmployees = teamProfiles.filter((p) =>
    pendingEmployeeIds.includes(p.id)
  );

  return (
    <div>
      <Nav
        role={profile.role}
        name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              {isAdmin ? "Admin Dashboard" : "Manager Dashboard"}
            </h1>

            <p className="text-sm text-on-surface-variant mt-1">
              {isAdmin
                ? "Overall ACCA progress across the organisation."
                : "Overall ACCA progress across your team."}
            </p>
          </div>

          {pendingApprovals > 0 && (
            <Link
              href="/approvals"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Review {pendingApprovals} Pending Approval
              {pendingApprovals !== 1 ? "s" : ""}
            </Link>
          )}
        </div>

        {/* ======================================================
            SUMMARY CARDS
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label={isAdmin ? "Total Employees" : "Team Members"}
            value={String(teamProfiles.length)}
          />

          <StatCard
            label="Pending PER Approvals"
            value={String(pendingApprovals)}
            sub={
              pendingApprovals > 0
                ? "Requires review"
                : "Nothing pending"
            }
          />

          <StatCard
            label="PER Progress"
            value={`${perOverallProgress}%`}
            sub={`${approvedCount} approved`}
          />

          <StatCard
            label="Exam Progress"
            value={`${examOverallProgress}%`}
            sub={`${passedExamCount} passed`}
          />
        </div>

        {/* ======================================================
            PER + EXAM GRAPHS
        ====================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* PER GRAPH */}

          <StatusChart
            title="PER Objectives Status"
            subtitle={
              isAdmin
                ? "All employees"
                : "Your team"
            }
            items={perCounts}
            total={objectives.length}
          />

          {/* EXAM GRAPH */}

          <StatusChart
            title="Exam Status"
            subtitle={
              isAdmin
                ? "All employees"
                : "Your team"
            }
            items={examCounts}
            total={exams.length}
          />
        </div>

        {/* ======================================================
            EXAM RESULTS
        ====================================================== */}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                Exam Results
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                Overall result breakdown
              </p>
            </div>

            <Link
              href="/exams"
              className="text-xs font-medium text-primary hover:underline"
            >
              View exams →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Pass"
              value={passedResults}
            />

            <ResultCard
              label="Fail"
              value={failedResults}
            />

            <ResultCard
              label="Exempt"
              value={exemptResults}
            />

            <ResultCard
              label="No Result"
              value={noResultCount}
            />
          </div>
        </div>

        {/* ======================================================
            PENDING APPROVALS
        ====================================================== */}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                Pending PER Approvals
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                PER objectives submitted by employees and waiting for review.
              </p>
            </div>

            <Link
              href="/approvals"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>

          {pendingApprovals === 0 ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">
                There are currently no PER objectives waiting for approval.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingEmployees.slice(0, 5).map((employee) => {
                const employeePending = objectives.filter(
                  (o) =>
                    o.user_id === employee.id &&
                    o.status === "pending_approval"
                );

                return (
                  <div
                    key={employee.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-outline-variant p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        {employee.first_name} {employee.last_name}
                      </p>

                      <p className="text-xs text-on-surface-variant mt-1">
                        {employeePending.length} objective
                        {employeePending.length !== 1 ? "s" : ""} waiting for
                        approval
                      </p>
                    </div>

                    <Link
                      href={`/employee/${employee.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
                    >
                      View Employee
                    </Link>
                  </div>
                );
              })}

              {pendingApprovals > 5 && (
                <div className="pt-2">
                  <Link
                    href="/approvals"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    View all {pendingApprovals} pending approvals →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================
            TEAM PROGRESS
        ====================================================== */}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                {isAdmin ? "Employee Progress" : "Team Progress"}
              </h2>

              <p className="text-xs text-on-surface-variant mt-1">
                Individual PER and exam progress.
              </p>
            </div>
          </div>

          {teamProfiles.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No employees are currently assigned.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant py-3">
                      Employee
                    </th>

                    <th className="text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant py-3">
                      PER
                    </th>

                    <th className="text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant py-3">
                      Exams
                    </th>

                    <th className="text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant py-3">
                      Pending
                    </th>

                    <th className="text-right text-xs font-bold uppercase tracking-wide text-on-surface-variant py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {teamProfiles.map((employee) => {
                    const employeeObjectives = objectives.filter(
                      (o) => o.user_id === employee.id
                    );

                    const employeeExams = exams.filter(
                      (e) => e.user_id === employee.id
                    );

                    const employeeApproved = employeeObjectives.filter(
                      (o) => o.status === "approved"
                    ).length;

                    const employeePassed = employeeExams.filter(
                      (e) => e.status === "passed"
                    ).length;

                    const employeePending = employeeObjectives.filter(
                      (o) => o.status === "pending_approval"
                    ).length;

                    const perPercentage = Math.round(
                      (employeeApproved / TOTAL_OBJECTIVES) * 100
                    );

                    const examPercentage = Math.round(
                      (employeePassed / TOTAL_EXAMS) * 100
                    );

                    return (
                      <tr
                        key={employee.id}
                        className="border-b border-outline-variant last:border-b-0"
                      >
                        <td className="py-4">
                          <div>
                            <p className="text-sm font-semibold text-on-surface">
                              {employee.first_name} {employee.last_name}
                            </p>

                            <p className="text-xs text-on-surface-variant">
                              {employee.department ?? "—"}
                            </p>
                          </div>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 rounded-full bg-surface-container overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${Math.min(
                                    perPercentage,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <span className="text-xs font-semibold text-on-surface">
                              {perPercentage}%
                            </span>
                          </div>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 rounded-full bg-surface-container overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${Math.min(
                                    examPercentage,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <span className="text-xs font-semibold text-on-surface">
                              {examPercentage}%
                            </span>
                          </div>
                        </td>

                        <td className="py-4">
                          {employeePending > 0 ? (
                            <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-surface-container text-on-surface">
                              {employeePending} pending
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant">
                              None
                            </span>
                          )}
                        </td>

                        <td className="py-4 text-right">
                          <Link
                            href={`/employee/${employee.id}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View details →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ======================================================
            LATEST ANNOUNCEMENTS
        ====================================================== */}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-on-surface">
              Latest Updates
            </h2>

            <Link
              href="/announcements"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>

          <AnnouncementsList
            announcements={announcements}
            compact
          />
        </div>
      </main>
    </div>
  );
}


/* ================================================================
   STAT CARD
   ================================================================ */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">
        {label}
      </p>

      <p className="text-3xl font-extrabold text-primary">
        {value}
      </p>

      {sub && (
        <p className="text-xs text-on-surface-variant mt-1">
          {sub}
        </p>
      )}
    </div>
  );
}


/* ================================================================
   STATUS CHART
   ================================================================ */

function StatusChart({
  title,
  subtitle,
  items,
  total,
}: {
  title: string;
  subtitle: string;
  items: {
    key: string;
    label: string;
    count: number;
  }[];
  total: number;
}) {
  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-on-surface">
            {title}
          </h2>

          <p className="text-xs text-on-surface-variant mt-1">
            {subtitle}
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-extrabold text-primary">
            {total}
          </p>

          <p className="text-[11px] text-on-surface-variant">
            Total
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {items.map((item) => {
          const percentage =
            total > 0
              ? Math.round((item.count / total) * 100)
              : 0;

          const barWidth =
            item.count > 0
              ? Math.max((item.count / maxValue) * 100, 4)
              : 0;

          return (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-on-surface">
                  {item.label}
                </span>

                <span className="text-xs font-bold text-on-surface">
                  {item.count}
                  <span className="font-normal text-on-surface-variant ml-1">
                    ({percentage}%)
                  </span>
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-surface-container overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${barWidth}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ================================================================
   EXAM RESULT CARD
   ================================================================ */

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-outline-variant p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>

      <p className="text-2xl font-extrabold text-primary mt-1">
        {value}
      </p>
    </div>
  );
}
