import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import AnnouncementsList, { Announcement } from "@/components/AnnouncementsList";
import Link from "next/link";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? Math.max(0, Math.ceil((time - Date.now()) / 86400000)) : null;
};

const relativeTime = (value?: string | null) => {
  if (!value) return "Recently";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const isAdmin = profile.role === "admin";
  const isManager = profile.role === "manager";

  if (!isAdmin && !isManager) {
    const [{ data: objectives }, { data: exams }, { data: rawAnnouncements }] = await Promise.all([
      supabase.from("per_objectives").select("*").eq("user_id", user.id).order("objective_number"),
      supabase.from("exams").select("*").eq("user_id", user.id),
      supabase.from("announcements").select("id,title,body,created_at,author_id,profiles!announcements_author_id_fkey(first_name,last_name)").order("created_at", { ascending: false }).limit(5),
    ]);

    const rows = objectives ?? [];
    const examRows = exams ?? [];
    const passed = examRows.filter((e) => e.status === "passed").length;
    const approved = rows.filter((o) => o.status === "approved").length;
    const examProgress = Math.min(100, Math.round((passed / TOTAL_EXAMS) * 100));
    const perProgress = Math.min(100, Math.round((approved / TOTAL_OBJECTIVES) * 100));
    const journeyProgress = Math.round((examProgress + perProgress) / 2);
    const scheduled = examRows.filter((e) => e.next_sitting).sort((a, b) => new Date(a.next_sitting).getTime() - new Date(b.next_sitting).getTime());
    const nextExam = scheduled[0];
    const daysToExam = daysUntil(nextExam?.next_sitting);
    const announcements: Announcement[] = (rawAnnouncements ?? []).map((a: any) => ({ id: a.id, title: a.title, body: a.body, created_at: a.created_at, author_id: a.author_id, author_name: `${a.profiles?.first_name ?? ""} ${a.profiles?.last_name ?? ""}`.trim() }));

    const activity = [
      ...rows.filter((o) => o.status !== "not_started").map((o) => ({ id: `o-${o.id}`, title: `Objective ${o.objective_number} ${o.status === "approved" ? "Approved" : o.status === "pending_approval" ? "Submitted" : "Updated"}`, detail: o.title ?? "PER Objective", date: o.updated_at ?? o.approved_at ?? o.submitted_at ?? o.created_at, icon: o.status === "approved" ? "✓" : "↑" })),
      ...examRows.filter((e) => e.status === "passed" || e.result).map((e) => ({ id: `e-${e.id}`, title: `Exam Result: ${e.exam_module ?? "ACCA paper"}`, detail: e.result ? String(e.result) : "Result recorded", date: e.updated_at ?? e.exam_date ?? e.next_sitting, icon: "★" })),
      ...announcements.map((a) => ({ id: `a-${a.id}`, title: a.title, detail: a.author_name ? `Posted by ${a.author_name}` : "Portal update", date: a.created_at, icon: "i" })),
    ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 5);

    const deadlines = [
      ...(nextExam?.next_sitting ? [{ date: nextExam.next_sitting, title: `Exam: ${nextExam.exam_module ?? "ACCA examination"}`, detail: nextExam.level ?? "Upcoming sitting" }] : []),
      ...rows.filter((o) => o.target_date).sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime()).slice(0, 2).map((o) => ({ date: o.target_date, title: `PER Target: Objective ${o.objective_number}`, detail: o.title ?? "Internal submission" })),
    ];

    return <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]"><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="lg:ml-64 pt-6 lg:pt-[92px] px-4 sm:px-6 lg:px-10 pb-10"><div className="max-w-[1280px] mx-auto space-y-8">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white border border-[#e2e2e2] shadow-sm rounded-xl p-6 lg:p-10"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5e5e5e] mb-3">Professional Development</p><h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight mb-4">Welcome back, {profile.first_name || "there"}!</h1><p className="text-base lg:text-lg leading-7 text-[#5e5e5e] max-w-2xl">You&apos;re making significant progress on your path to qualification. Currently, you&apos;ve completed <span className="text-primary font-bold">{journeyProgress}%</span> of your recorded ACCA journey.</p><div className="mt-8 flex flex-col sm:flex-row gap-3"><Link href="/per-objectives?objective=14" className="inline-flex justify-center bg-primary text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wide hover:opacity-90">Resume Objective 14</Link><Link href="/exams" className="inline-flex justify-center border border-[#926f66] px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-[#f3f3f3]">View Schedule</Link></div></div><div className="bg-white border border-[#e2e2e2] shadow-sm rounded-xl p-6 flex flex-col items-center justify-center text-center"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5e5e5e] mb-6">Overall Progress</p><div className="relative w-48 h-48 rounded-full" style={{ background: `conic-gradient(#ad2c00 ${journeyProgress}%, #e2e2e2 ${journeyProgress}% 100%)` }}><div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center"><span className="text-5xl font-extrabold">{journeyProgress}%</span><span className="text-[11px] font-bold uppercase tracking-widest text-[#5e5e5e]">Journey</span></div></div><p className="mt-6 text-sm text-[#5e5e5e]">{TOTAL_OBJECTIVES - approved} PER objectives and {TOTAL_EXAMS - passed} exams remain.</p></div></section>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6"><Metric label="Exams Passed" value={`${passed} / ${TOTAL_EXAMS}`} progress={examProgress} icon="◆" /><Metric label="PER Objectives" value={`${approved} / ${TOTAL_OBJECTIVES}`} progress={perProgress} icon="✓" /><Metric label="Days to Next Exam" value={daysToExam === null ? "—" : `${daysToExam} Days`} detail={nextExam?.exam_module ?? "No exam scheduled"} danger={daysToExam !== null && daysToExam <= 45} icon="◷" /></section>
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6"><div className="lg:col-span-8 bg-white border border-[#e2e2e2] shadow-sm rounded-xl overflow-hidden"><div className="p-5 lg:p-6 border-b border-[#e7bdb2] flex justify-between items-center"><h2 className="text-xl font-bold">Recent Activity</h2><Link href="/announcements" className="text-xs font-bold text-primary hover:underline">View All →</Link></div>{activity.length ? <div className="divide-y divide-[#e7bdb2]">{activity.map((a) => <div key={a.id} className="p-5 flex items-center gap-4 hover:bg-[#f3f3f3]"><div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">{a.icon}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{a.title}</p><p className="text-sm text-[#5e5e5e] truncate">{a.detail}</p></div><span className="text-[11px] font-bold text-[#5e5e5e] whitespace-nowrap">{relativeTime(a.date)}</span></div>)}</div> : <p className="p-8 text-sm text-[#5e5e5e]">Your activity will appear here as you update exams and PER objectives.</p>}</div><div className="lg:col-span-4 bg-white border border-[#e2e2e2] shadow-sm rounded-xl overflow-hidden"><div className="p-5 lg:p-6 border-b border-[#e7bdb2] bg-[#f3f3f3]"><h2 className="text-xl font-bold">Upcoming Deadlines</h2></div><div className="p-5 lg:p-6 space-y-5">{deadlines.length ? deadlines.map((d: any) => { const date = new Date(d.date); return <div key={`${d.title}-${d.date}`} className="flex items-start gap-3"><div className="bg-[#1a1c1c] text-white p-2 rounded-lg text-center min-w-[52px]"><p className="text-[10px] uppercase font-black">{date.toLocaleDateString("en-US", { month: "short" })}</p><p className="text-xl font-black">{date.toLocaleDateString("en-US", { day: "2-digit" })}</p></div><div><p className="text-xs font-bold">{d.title}</p><p className="text-sm text-[#5e5e5e] mt-1">{d.detail}</p></div></div>; }) : <p className="text-sm text-[#5e5e5e]">No upcoming deadlines are recorded.</p>}<div className="pt-5 border-t border-[#e7bdb2]"><div className="bg-primary/5 border border-primary/20 p-4 rounded-lg"><p className="text-[11px] font-black uppercase tracking-widest text-primary mb-1">Pro Tip</p><p className="text-sm text-[#5e5e5e]">Keep exam dates and PER evidence current so your progress stays accurate.</p></div></div></div></div></section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white border border-[#e2e2e2] shadow-sm rounded-xl p-5 lg:p-6"><div className="flex justify-between items-center mb-5"><div><h2 className="text-xl font-bold">PER Objectives</h2><p className="text-sm text-[#5e5e5e] mt-1">Track objective status and evidence workflow.</p></div><Link href="/per-objectives" className="text-xs font-bold text-primary hover:underline">View All →</Link></div><div className="divide-y divide-[#e7bdb2]">{rows.filter((o) => o.status !== "not_started").slice(0, 5).map((o) => <div key={o.id} className="py-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm font-bold truncate">Objective {o.objective_number}: {o.title ?? "PER Objective"}</p><p className="text-xs text-[#5e5e5e] mt-1">Updated {relativeTime(o.updated_at ?? o.created_at)}</p></div><StatusPill status={o.status} /></div>)}{!rows.some((o) => o.status !== "not_started") && <p className="py-6 text-sm text-[#5e5e5e]">You haven&apos;t started any objectives yet. <Link href="/per-objectives" className="text-primary font-bold hover:underline">Start one →</Link></p>}</div></div><div className="bg-white border border-[#e2e2e2] shadow-sm rounded-xl p-5 lg:p-6"><div className="flex justify-between items-center mb-5"><h2 className="text-xl font-bold">Latest Updates</h2><Link href="/announcements" className="text-xs font-bold text-primary hover:underline">View All →</Link></div><AnnouncementsList announcements={announcements} compact /></div></section>
    </div></main></div>;
  }

  const teamQuery = isAdmin ? supabase.from("profiles").select("*").eq("status", "active").order("first_name") : supabase.from("profiles").select("*").eq("manager_id", user.id).eq("status", "active").order("first_name");
  const { data: teamProfiles } = await teamQuery;
  const ids = (teamProfiles ?? []).map((p) => p.id);
  const [{ data: objectives }, { data: exams }] = ids.length ? await Promise.all([supabase.from("per_objectives").select("*").in("user_id", ids), supabase.from("exams").select("*").in("user_id", ids)]) : [{ data: [] }, { data: [] }];
  const objectiveRows = objectives ?? [];
  const examRows = exams ?? [];
  const pending = objectiveRows.filter((o) => o.status === "pending_approval").length;
  const approved = objectiveRows.filter((o) => o.status === "approved").length;
  const passed = examRows.filter((e) => e.status === "passed").length;
  const perProgress = ids.length ? Math.round((approved / (ids.length * TOTAL_OBJECTIVES)) * 100) : 0;
  const examProgress = ids.length ? Math.round((passed / (ids.length * TOTAL_EXAMS)) * 100) : 0;

  return <div className="min-h-screen bg-[#f9f9f9]"><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="lg:ml-64 pt-6 lg:pt-[92px] px-4 sm:px-6 lg:px-10 pb-10"><div className="max-w-7xl mx-auto space-y-8"><div><h1 className="text-3xl font-extrabold">{isAdmin ? "Admin Dashboard" : "Manager Dashboard"}</h1><p className="text-sm text-[#5e5e5e] mt-1">{isAdmin ? "Overall ACCA progress across the organisation." : "Overall ACCA progress across your team."}</p></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><Stat label={isAdmin ? "Total Employees" : "Team Members"} value={String(ids.length)} /><Stat label="Pending PER Approvals" value={String(pending)} sub={pending ? "Requires review" : "Nothing pending"} /><Stat label="PER Progress" value={`${perProgress}%`} sub={`${approved} approved`} /><Stat label="Exam Progress" value={`${examProgress}%`} sub={`${passed} passed`} /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><StatusChart title="PER Objectives Status" items={objectiveRows} keys={["not_started","draft","pending_approval","approved","rejected"]} /><StatusChart title="Exam Status" items={examRows} keys={["not_started","in_progress","scheduled","passed","failed"]} /></div><div className="bg-white border border-[#e2e2e2] rounded-xl p-6"><div className="flex justify-between items-center mb-5"><h2 className="text-lg font-bold">Pending PER Approvals</h2><Link href="/approvals" className="text-xs font-bold text-primary">View all →</Link></div>{pending ? <div className="space-y-3">{(teamProfiles ?? []).filter((p) => objectiveRows.some((o) => o.user_id === p.id && o.status === "pending_approval")).slice(0, 5).map((p) => <div key={p.id} className="flex justify-between items-center border border-[#e7bdb2] rounded-lg p-4"><div><p className="text-sm font-bold">{p.first_name} {p.last_name}</p><p className="text-xs text-[#5e5e5e]">Pending objectives require review.</p></div>{p.profile_slug ? <Link href={`/employees/${p.profile_slug}`} className="text-xs font-bold text-primary">View Employee →</Link> : null}</div>)}</div> : <p className="text-sm text-[#5e5e5e]">There are currently no PER objectives waiting for approval.</p>}</div></div></main></div>;
}

function Metric({ label, value, icon, progress, danger, detail }: { label: string; value: string; icon: string; progress?: number; danger?: boolean; detail?: string }) { return <div className="bg-white border border-[#e2e2e2] shadow-sm rounded-xl p-5 flex items-center gap-4"><div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black ${danger ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary"}`}>{icon}</div><div><p className="text-[11px] font-bold uppercase tracking-widest text-[#5e5e5e]">{label}</p><p className="text-2xl font-extrabold mt-1">{value}</p>{progress !== undefined && <div className="w-32 h-1.5 bg-[#e2e2e2] rounded-full overflow-hidden mt-2"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>}{detail && <p className={`text-[11px] font-bold mt-1 ${danger ? "text-red-600" : "text-[#5e5e5e]"}`}>{detail}</p>}</div></div>; }
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) { return <div className="bg-white border border-[#e2e2e2] rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wide text-[#5e5e5e]">{label}</p><p className="text-3xl font-extrabold text-primary mt-1">{value}</p>{sub && <p className="text-xs text-[#5e5e5e] mt-1">{sub}</p>}</div>; }
function StatusChart({ title, items, keys }: { title: string; items: any[]; keys: string[] }) { const max = Math.max(...keys.map((k) => items.filter((i) => i.status === k).length), 1); return <div className="bg-white border border-[#e2e2e2] rounded-xl p-6"><h2 className="text-lg font-bold mb-5">{title}</h2><div className="space-y-4">{keys.map((key) => { const count = items.filter((i) => i.status === key).length; const label = key.replaceAll("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()); return <div key={key}><div className="flex justify-between mb-1 text-xs font-semibold"><span>{label}</span><span>{count}</span></div><div className="h-2.5 rounded-full bg-[#eeeeee] overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${count ? Math.max(4, count / max * 100) : 0}%` }} /></div></div>; })}</div></div>; }
