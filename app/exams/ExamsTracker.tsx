"use client";

import { useMemo, useState } from "react";
import ExamsList from "./ExamsList";
import ObjectivesList from "../per-tracker/ObjectivesList";
import { ACCA_EXAMS } from "@/lib/accaExams";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";

type ExamRow = { id?: string; exam_module?: string; level?: string; status: string; exam_date?: string | null; next_sitting: string | null; result: string | null };
type ObjectiveRow = { id?: string; objective_number: number; status: string; evidence_notes: string | null; submitted_at: string | null; approved_at: string | null };
type HistoryRow = { id: string; objective_id: string; action: string; comments: string | null; created_at: string; actor_id: string };

export default function ExamsTracker({ userId, joiningDate, searchQuery, exams, objectives, history }: { userId: string; joiningDate?: string | null; searchQuery?: string; exams: ExamRow[]; objectives: ObjectiveRow[]; history: HistoryRow[] }) {
  const [tab, setTab] = useState<"exams" | "per">("exams");
  const [showMentorNotes, setShowMentorNotes] = useState(false);

  const existingByModule = Object.fromEntries(exams.filter((exam) => exam.exam_module).map((exam) => [exam.exam_module, exam]));
  const existingByNumber = Object.fromEntries(objectives.map((objective) => [objective.objective_number, objective]));

  // ACCA requires 11 fixed papers plus 2 papers selected from the 4 Strategic Professional options.
  const requiredExams = ACCA_EXAMS.filter((exam) => !exam.optional);
  const optionalExams = ACCA_EXAMS.filter((exam) => exam.optional);
  const passedRequired = requiredExams.filter((exam) => {
    const row = existingByModule[exam.name];
    return row?.status === "passed" || row?.result?.toLowerCase() === "pass";
  }).length;
  const passedOptional = optionalExams.filter((exam) => {
    const row = existingByModule[exam.name];
    return row?.status === "passed" || row?.result?.toLowerCase() === "pass";
  }).length;
  const totalRequired = requiredExams.length + 2;
  const passed = passedRequired + Math.min(2, passedOptional);
  const progress = Math.min(100, Math.round((passed / totalRequired) * 100));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = exams
    .filter((exam) => exam.next_sitting && !Number.isNaN(new Date(exam.next_sitting).getTime()))
    .sort((a, b) => new Date(a.next_sitting as string).getTime() - new Date(b.next_sitting as string).getTime());
  const upcomingScheduled = scheduled.filter((exam) => {
    const date = new Date(exam.next_sitting as string);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  });
  const nextSitting = upcomingScheduled[0]?.next_sitting ?? scheduled[0]?.next_sitting ?? null;

  const essentials = objectives.filter((objective) => objective.status === "approved" && ACCA_OBJECTIVES.find((item) => item.number === objective.objective_number)?.essential).length;
  const technical = objectives.filter((objective) => objective.status === "approved" && !ACCA_OBJECTIVES.find((item) => item.number === objective.objective_number)?.essential).length;
  const experienceMonths = joiningDate
    ? Math.min(36, Math.max(0, (new Date().getFullYear() - new Date(joiningDate).getFullYear()) * 12 + new Date().getMonth() - new Date(joiningDate).getMonth() - (new Date().getDate() < new Date(joiningDate).getDate() ? 1 : 0)))
    : 0;
  const nextLabel = useMemo(() => nextSitting ? new Date(nextSitting).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "Not scheduled", [nextSitting]);

  const exportTranscript = () => {
    const rows: (string | number)[][] = [
      ["ACCA Exam Transcript"],
      ["Module", "Code", "Level", "Optional", "Status", "Exam Date", "Next Sitting", "Result"],
      ...ACCA_EXAMS.map((exam) => {
        const row = existingByModule[exam.name];
        return [exam.name, exam.code, exam.level, exam.optional ? "Yes" : "No", row?.status ?? "not_started", row?.exam_date ?? "", row?.next_sitting ?? "", row?.result ?? ""];
      }),
      [],
      ["PER Objectives"],
      ["Objective", "Category", "Essential", "Status", "Submitted", "Approved"],
      ...ACCA_OBJECTIVES.map((objective) => {
        const row = existingByNumber[objective.number];
        return [objective.title, objective.category, objective.essential ? "Yes" : "No", row?.status ?? "not_started", row?.submitted_at ?? "", row?.approved_at ?? ""];
      }),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "acca-transcript.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
    <div className="mb-7 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5"><div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">Professional Qualification</h1><p className="text-sm sm:text-base text-on-surface-variant mt-1">Track your journey through ACCA examinations and Practical Experience Requirements.</p></div><button type="button" onClick={exportTranscript} className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg bg-on-surface text-surface px-5 py-2.5 text-sm font-semibold hover:opacity-90"><span aria-hidden="true">↓</span> Export Transcript</button></div>
    <div className="border-b border-outline-variant mb-7 overflow-x-auto no-scrollbar"><div className="flex min-w-max gap-7 sm:gap-10"><button type="button" onClick={() => setTab("exams")} className={`relative pb-3 text-sm font-bold ${tab === "exams" ? "text-on-surface" : "text-on-surface-variant"}`}>Examinations{tab === "exams" && <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] rounded-full bg-primary" />}</button><button type="button" onClick={() => setTab("per")} className={`relative pb-3 text-sm font-bold ${tab === "per" ? "text-on-surface" : "text-on-surface-variant"}`}>PER Objectives{tab === "per" && <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] rounded-full bg-primary" />}</button></div></div>
    {tab === "exams" ? <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 flex items-center gap-5"><div className="w-16 h-16 shrink-0 rounded-full border-4 border-primary flex items-center justify-center"><span className="text-2xl font-black">{passed}</span></div><div><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Passed</p><p className="text-lg font-bold">{totalRequired} Total Papers</p></div></div><div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Overall Progress</p><div className="flex items-end justify-between mt-1 mb-2"><span className="text-4xl font-extrabold">{progress}%</span><span className="text-xs font-bold text-primary">{passed}/{totalRequired} passed</span></div><div className="h-2.5 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div></div><div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Next Sitting</p><p className="text-xl font-bold mt-2">{nextLabel}</p><p className="text-xs text-on-surface-variant mt-1">{upcomingScheduled.length} upcoming exam{upcomingScheduled.length === 1 ? "" : "s"} scheduled</p></div></div>{searchQuery?.trim() && <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm">Showing exam matches for <strong>“{searchQuery.trim()}”</strong>.</div>}<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 sm:p-6"><div className="mb-5"><h2 className="text-lg font-bold">Examinations</h2><p className="text-xs text-on-surface-variant mt-1">Update status, exam date, sitting date and result. Every change is saved to your portal account.</p></div><ExamsList userId={userId} existingByModule={existingByModule} searchQuery={searchQuery} /></div></div> : <div className="space-y-6"><div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"><div className="flex-1"><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Experience Requirement Status</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-5"><div><p className="text-2xl font-extrabold">{essentials} / 5</p><p className="text-xs text-on-surface-variant">Essentials completed</p></div><div><p className="text-2xl font-extrabold">{technical} / 4</p><p className="text-xs text-on-surface-variant">Technical completed</p></div><div><p className="text-2xl font-extrabold">{experienceMonths} / 36</p><p className="text-xs text-on-surface-variant">Months of experience</p></div></div></div><button type="button" onClick={() => setShowMentorNotes(true)} className="border-2 border-on-surface text-on-surface px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-surface-container transition-colors">View Mentor Notes</button></div></div><div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 sm:p-6"><h2 className="text-lg font-bold mb-1">PER Objectives</h2><p className="text-xs text-on-surface-variant mb-5">Track evidence, submission and manager/admin approval status. Evidence can be saved as notes or uploaded as supporting files.</p><ObjectivesList userId={userId} existingByNumber={existingByNumber} /></div></div>}
    {showMentorNotes && <MentorNotesModal history={history} onClose={() => setShowMentorNotes(false)} />}
  </div>;
}

function MentorNotesModal({ history, onClose }: { history: HistoryRow[]; onClose: () => void }) { const notes = history.filter((item) => item.comments?.trim()); return <div className="fixed inset-0 z-[100] bg-black/40 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Mentor notes"><div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant shadow-2xl"><div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant"><div><h3 className="font-bold text-lg">Mentor Notes</h3><p className="text-xs text-on-surface-variant mt-0.5">Feedback recorded during PER reviews.</p></div><button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-container text-lg" aria-label="Close">×</button></div><div className="p-5 overflow-y-auto max-h-[65vh] space-y-3">{notes.length ? notes.map((note) => <div key={note.id} className="rounded-lg border border-outline-variant bg-surface-container-low p-4"><div className="flex items-center justify-between gap-3 mb-2"><span className="text-xs font-bold capitalize">{note.action.replaceAll("_", " ")}</span><span className="text-[11px] text-on-surface-variant">{new Date(note.created_at).toLocaleString()}</span></div><p className="text-sm whitespace-pre-wrap">{note.comments}</p></div>) : <p className="text-sm text-on-surface-variant text-center py-8">No mentor notes have been recorded yet.</p>}</div></div></div>; }
