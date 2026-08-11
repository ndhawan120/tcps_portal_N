import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import ApproveButton from "./ApproveButton";
import StatusBars from "@/components/StatusBars";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;
const PER_STATUSES = [
  { key: "not_started", label: "Not Started", tone: "neutral" as const },
  { key: "draft", label: "Draft", tone: "primary" as const },
  { key: "pending_approval", label: "Pending Approval", tone: "warning" as const },
  { key: "approved", label: "Approved", tone: "success" as const },
  { key: "rejected", label: "Rejected", tone: "danger" as const },
];
const EXAM_STATUSES = [
  { key: "not_started", label: "Not Started", tone: "neutral" as const },
  { key: "in_progress", label: "In Progress", tone: "primary" as const },
  { key: "scheduled", label: "Scheduled", tone: "warning" as const },
  { key: "passed", label: "Passed", tone: "success" as const },
  { key: "failed", label: "Failed", tone: "danger" as const },
];

export default async function ManagerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  const { data: team } = isAdmin
    ? await supabase.from("profiles").select("*").neq("id", user.id)
    : await supabase.from("profiles").select("*").eq("manager_id", user.id);
  const teamIds = (team ?? []).map((t) => t.id);

  const { data: pending } = isAdmin
    ? await supabase.from("per_objectives").select("*, profiles!per_objectives_user_id_fkey(first_name,last_name)").eq("status", "pending_approval")
    : teamIds.length
    ? await supabase.from("per_objectives").select("*, profiles!per_objectives_user_id_fkey(first_name,last_name)").in("user_id", teamIds).eq("status", "pending_approval")
    : { data: [] };

  const { data: allObjectives } = isAdmin
    ? await supabase.from("per_objectives").select("user_id,status")
    : teamIds.length
    ? await supabase.from("per_objectives").select("user_id,status").in("user_id", teamIds)
    : { data: [] };

  const { data: allExams } = isAdmin
    ? await supabase.from("exams").select("user_id,status")
    : teamIds.length
    ? await supabase.from("exams").select("user_id,status").in("user_id", teamIds)
    : { data: [] };

  const objectiveCounts = PER_STATUSES.map((item) => ({ label: item.label, count: (allObjectives ?? []).filter((row) => row.status === item.key).length, tone: item.tone }));
  const examCounts = EXAM_STATUSES.map((item) => ({ label: item.label, count: (allExams ?? []).filter((row) => row.status === item.key).length, tone: item.tone }));

  const progressByUser: Record<string, { approved: number }> = {};
  (allObjectives ?? []).forEach((o) => {
    progressByUser[o.user_id] ??= { approved: 0 };
    if (o.status === "approved") progressByUser[o.user_id].approved += 1;
  });
  const examsPassedByUser: Record<string, number> = {};
  (allExams ?? []).forEach((e) => {
    if (e.status === "passed") examsPassedByUser[e.user_id] = (examsPassedByUser[e.user_id] ?? 0) + 1;
  });

  const avgProgress = (team ?? []).length > 0
    ? Math.round((team ?? []).reduce((sum, t) => sum + ((progressByUser[t.id]?.approved ?? 0) / TOTAL_OBJECTIVES) * 100, 0) / (team ?? []).length)
    : 0;

  return (
    <div>
      <Nav role={profile?.role ?? "manager"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">{isAdmin ? "Everyone's Progress" : "Team Overview"}</h1>
        <p className="text-sm text-on-surface-variant mb-8">
          {isAdmin ? "Company-wide PER and exam status across all employees." : "Overall progress and approval status for your direct reports."}{" "}
          Average PER progress: <span className="font-semibold text-primary">{avgProgress}%</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StatusBars title="PER Objectives Status" items={objectiveCounts} />
          <StatusBars title="Exam Status" items={examCounts} />
        </div>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-8">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Pending PER Approvals</h2>
              <p className="text-xs text-on-surface-variant mt-1">{pending?.length ?? 0} request(s) waiting for a decision.</p>
            </div>
            <Link href="/manager/approvals" className="text-xs font-medium text-primary hover:underline">Open approvals →</Link>
          </div>
          <div className="divide-y divide-outline-variant">
            {(pending ?? []).map((p: any) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface">{p.profiles?.first_name} {p.profiles?.last_name} — Objective {p.objective_number}: {p.title}</p>
                  <p className="text-xs text-on-surface-variant">Submitted {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "—"}</p>
                </div>
                <ApproveButton objectiveId={p.id} actorId={user.id} />
              </div>
            ))}
            {(!pending || pending.length === 0) && <p className="px-5 py-4 text-sm text-on-surface-variant">No approvals pending right now.</p>}
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl">
          <h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">{isAdmin ? "Everyone" : "Team"}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                <tr><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">PER Progress</th><th className="text-left px-5 py-3">Exams Passed</th><th className="text-left px-5 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {(team ?? []).map((t) => {
                  const approved = progressByUser[t.id]?.approved ?? 0;
                  const pct = Math.round((approved / TOTAL_OBJECTIVES) * 100);
                  const passed = examsPassedByUser[t.id] ?? 0;
                  return <tr key={t.id}>
                    <td className="px-5 py-3 font-medium text-on-surface">{t.first_name} {t.last_name}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{approved}/{TOTAL_OBJECTIVES} ({pct}%)</td>
                    <td className="px-5 py-3 text-on-surface-variant">{passed}/{TOTAL_EXAMS}</td>
                    <td className="px-5 py-3"><Link href={`/employee/${t.id}`} className="text-xs font-medium text-primary hover:underline">View details →</Link></td>
                  </tr>;
                })}
                {(!team || team.length === 0) && <tr><td colSpan={4} className="px-5 py-6 text-center text-on-surface-variant">{isAdmin ? "No other users yet." : "No direct reports assigned yet."}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
