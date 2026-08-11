import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import AnnouncementsList, { Announcement } from "@/components/AnnouncementsList";
import Link from "next/link";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

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

  const { data: rawAnnouncements } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, author_id, profiles!announcements_author_id_fkey(first_name,last_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const announcements: Announcement[] = (rawAnnouncements ?? []).map((a: any) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    created_at: a.created_at,
    author_id: a.author_id,
    author_name: `${a.profiles?.first_name ?? ""} ${a.profiles?.last_name ?? ""}`.trim(),
  }));

  const approvedObjectives =
    objectives?.filter((o) => o.status === "approved").length ?? 0;
  const overallProgress = Math.round((approvedObjectives / TOTAL_OBJECTIVES) * 100);
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

  const inProgressObjectives = (objectives ?? []).filter(
    (o) => o.status !== "not_started"
  );

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
            value={daysToNextExam !== null ? String(daysToNextExam) : "—"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-on-surface">PER Objectives</h2>
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
                <Link href="/per-tracker" className="text-primary hover:underline">
                  Start your first one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {inProgressObjectives.map((o) => (
                  <li key={o.id} className="py-3 flex items-center justify-between">
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
              <h2 className="text-lg font-bold text-on-surface">Latest Updates</h2>
              <Link
                href="/announcements"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            <AnnouncementsList announcements={announcements} compact />
          </div>
        </div>
      </main>
    </div>
  );
}

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
      <p className="text-3xl font-extrabold text-primary">{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}
