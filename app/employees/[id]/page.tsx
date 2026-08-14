import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import ObjectivesList from "@/app/per-tracker/ObjectivesList";
import ExamsList from "@/app/exams/ExamsList";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;
type PageProps = { params: { id: string } };

export default async function EmployeeProfilePage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: viewer } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!viewer) redirect("/login");
  if (viewer.role !== "admin" && viewer.role !== "manager") redirect("/dashboard");
  const identifier = decodeURIComponent(params.id);
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
  const { data: employee, error: employeeError } = await supabase.from("profiles").select("*").eq(looksLikeUuid ? "id" : "profile_slug", identifier).single();
  if (employeeError || !employee) notFound();
  if (viewer.role === "manager" && employee.manager_id !== viewer.id) redirect("/employees");
  const [{ data: objectives }, { data: exams }] = await Promise.all([
    supabase.from("per_objectives").select("id,user_id,objective_number,title,status,evidence_notes,submitted_at,approved_at,approved_by,created_at,updated_at").eq("user_id", employee.id).order("objective_number", { ascending: true }),
    supabase.from("exams").select("id,user_id,exam_module,level,status,exam_date,next_sitting,result,created_at,updated_at").eq("user_id", employee.id),
  ]);
  const approvedObjectives = (objectives ?? []).filter((o) => o.status === "approved").length;
  const pendingObjectives = (objectives ?? []).filter((o) => o.status === "pending_approval").length;
  const rejectedObjectives = (objectives ?? []).filter((o) => o.status === "rejected").length;
  const draftObjectives = (objectives ?? []).filter((o) => o.status === "draft").length;
  const notStartedObjectives = Math.max(0, TOTAL_OBJECTIVES - approvedObjectives - pendingObjectives - rejectedObjectives - draftObjectives);
  const perProgress = Math.min(100, Math.round((approvedObjectives / TOTAL_OBJECTIVES) * 100));
  const passedExams = (exams ?? []).filter((exam) => exam.status === "passed" || exam.result?.toLowerCase() === "pass").length;
  const inProgressExams = (exams ?? []).filter((exam) => exam.status === "in_progress").length;
  const scheduledExams = (exams ?? []).filter((exam) => exam.status === "scheduled").length;
  const failedExams = (exams ?? []).filter((exam) => exam.status === "failed" || exam.result?.toLowerCase() === "fail").length;
  const notStartedExams = Math.max(0, TOTAL_EXAMS - passedExams - inProgressExams - scheduledExams - failedExams);
  const examProgress = Math.min(100, Math.round((passedExams / TOTAL_EXAMS) * 100));
  const existingByNumber = Object.fromEntries((objectives ?? []).map((objective) => [objective.objective_number, { status: objective.status, evidence_notes: objective.evidence_notes, submitted_at: objective.submitted_at, approved_at: objective.approved_at }]));
  const existingByModule = Object.fromEntries((exams ?? []).map((exam) => [exam.exam_module, { status: exam.status, next_sitting: exam.next_sitting, result: exam.result }]));

  return <div><Nav role={viewer.role} name={`${viewer.first_name ?? ""} ${viewer.last_name ?? ""}`.trim()} /><main className="max-w-7xl mx-auto px-6 py-8">
    <div className="mb-6"><Link href="/employees" className="text-xs font-medium text-primary hover:underline">← Back to Employees</Link></div>
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6"><div className="flex flex-col md:flex-row md:items-center gap-5">
      {employee.avatar_url ? <img src={employee.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border border-outline-variant" /> : <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-xl font-bold text-on-surface-variant">{getInitials(employee.first_name, employee.last_name)}</div>}
      <div className="flex-1"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-on-surface">{employee.first_name} {employee.last_name}</h1><EmployeeStatus status={employee.status} /></div><p className="text-sm text-on-surface-variant mt-1">{employee.email}</p><div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-on-surface-variant"><span>Department: <strong className="text-on-surface">{employee.department || "—"}</strong></span><span>Role: <strong className="text-on-surface capitalize">{employee.role || "—"}</strong></span>{employee.job_title && <span>Job title: <strong className="text-on-surface">{employee.job_title}</strong></span>}{employee.joining_date && <span>Joining date: <strong className="text-on-surface">{new Date(employee.joining_date).toLocaleDateString()}</strong></span>}{employee.phone && <span>Phone: <strong className="text-on-surface">{employee.phone}</strong></span>}</div></div>
      <div className="flex flex-col items-end gap-3"><div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 min-w-[220px]"><p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">PER Objective Number</p><p className="text-lg font-bold text-primary mt-1">{employee.per_objective_number || "Not entered"}</p><p className="text-[11px] text-on-surface-variant mt-1">Employee-maintained reference</p></div><a href={`/employees/export?user_id=${employee.id}`} className="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container">Download Excel</a></div>
    </div></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><ProgressCard title="PER Progress" completed={approvedObjectives} total={TOTAL_OBJECTIVES} percentage={perProgress} /><ProgressCard title="Exam Progress" completed={passedExams} total={TOTAL_EXAMS} percentage={examProgress} /></div>
    <section className="mb-8"><h2 className="text-lg font-bold text-on-surface mb-4">PER Status</h2><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><MiniStat label="Not Started" value={notStartedObjectives} /><MiniStat label="Draft" value={draftObjectives} /><MiniStat label="Pending Approval" value={pendingObjectives} /><MiniStat label="Approved" value={approvedObjectives} /><MiniStat label="Rejected" value={rejectedObjectives} /></div></section>
    <section className="mb-8"><h2 className="text-lg font-bold text-on-surface mb-4">Exam Status</h2><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><MiniStat label="Not Started" value={notStartedExams} /><MiniStat label="In Progress" value={inProgressExams} /><MiniStat label="Scheduled" value={scheduledExams} /><MiniStat label="Passed" value={passedExams} /><MiniStat label="Failed" value={failedExams} /></div></section>
    <section className="mb-10"><div className="flex items-center justify-between mb-4"><div><h2 className="text-xl font-bold text-on-surface">PER Objectives</h2><p className="text-xs text-on-surface-variant mt-1">Read-only view of this employee&apos;s PER progress.</p></div><a href={`/employees/export?user_id=${employee.id}`} className="text-xs font-semibold text-primary hover:underline">Export employee data</a></div><ObjectivesList userId={employee.id} existingByNumber={existingByNumber} readOnly /></section>
    <section><div className="flex items-center justify-between mb-4"><div><h2 className="text-xl font-bold text-on-surface">ACCA Exams</h2><p className="text-xs text-on-surface-variant mt-1">Read-only view of this employee&apos;s exam progress.</p></div><a href={`/employees/export?user_id=${employee.id}`} className="text-xs font-semibold text-primary hover:underline">Export employee data</a></div><ExamsList userId={employee.id} existingByModule={existingByModule} readOnly /></section>
  </main></div>;
}
function ProgressCard({ title, completed, total, percentage }: { title: string; completed: number; total: number; percentage: number }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><div className="flex items-center justify-between mb-2"><p className="text-sm font-bold text-on-surface">{title}</p><p className="text-sm font-bold text-primary">{percentage}%</p></div><div className="h-3 bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percentage}%` }} /></div><p className="text-xs text-on-surface-variant mt-2">{completed} of {total} completed</p></div>; }
function MiniStat({ label, value }: { label: string; value: number }) { return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4"><p className="text-xs text-on-surface-variant">{label}</p><p className="text-2xl font-bold text-on-surface mt-1">{value}</p></div>; }
function EmployeeStatus({ status }: { status: string | null }) { const normalized = status?.toLowerCase() ?? "unknown"; const label = normalized.replaceAll("_", " "); const className = normalized === "active" ? "bg-green-100 text-green-800" : normalized === "pending" ? "bg-amber-100 text-amber-800" : normalized === "rejected" ? "bg-red-100 text-red-800" : "bg-surface-container text-on-surface-variant"; return <span className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full capitalize ${className}`}>{label}</span>; }
function getInitials(firstName: string | null, lastName: string | null) { return `${firstName?.trim()?.charAt(0) ?? ""}${lastName?.trim()?.charAt(0) ?? ""}`.toUpperCase() || "U"; }
