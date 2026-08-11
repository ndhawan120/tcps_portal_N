import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";

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

  const { data: objectives } = await supabase
    .from("per_objectives")
    .select("*")
    .eq("user_id", user.id)
    .order("objective_number");

  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .eq("user_id", user.id);

  const totalObjectives = objectives?.length ?? 0;
  const approvedObjectives =
    objectives?.filter((o) => o.status === "approved").length ?? 0;
  const overallProgress =
    totalObjectives > 0
      ? Math.round((approvedObjectives / totalObjectives) * 100)
      : 0;
  const examsPassed = exams?.filter((e) => e.status === "passed").length ?? 0;

  const nextExam = exams
    ?.filter((e) => e.next_sitting)
    .sort(
      (a, b) =>
        new Date(a.next_sitting!).getTime() - new Date(b.next_sitting!).getTime()
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

  return (
    <div>
      <Nav role={profile?.role ?? "employee"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">
          Welcome back, {profile?.first_name}
        </h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Here&apos;s where your ACCA progress stands.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Overall Progress" value={`${overallProgress}%`} />
          <StatCard label="Exams Passed" value={String(examsPassed)} />
          <StatCard
            label="Days to Next Exam"
            value={daysToNextExam !== null ? String(daysToNextExam) : "—"}
          />
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h2 className="text-lg font-bold text-on-surface mb-4">
            PER Objectives
          </h2>
          {totalObjectives === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No PER objectives set up yet. An admin can add these for you.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {objectives!.map((o) => (
                <li key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      Objective {o.objective_number}: {o.title}
                    </p>
                  </div>
                  <StatusPill status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">
        {label}
      </p>
      <p className="text-3xl font-extrabold text-primary">{value}</p>
    </div>
  );
}


