"use client";

import { useMemo, useState } from "react";
import ExamsList from "./ExamsList";
import ObjectivesList from "../per-tracker/ObjectivesList";
import { ACCA_EXAMS } from "@/lib/accaExams";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";

type ExamRow = { id?: string; exam_module?: string; level?: string; status: string; exam_date?: string | null; next_sitting: string | null; result: string | null };
type ObjectiveRow = { status: string; evidence_notes: string | null; submitted_at: string | null; approved_at: string | null };

export default function ExamsTracker({ userId, exams, objectives }: { userId: string; exams: ExamRow[]; objectives: ObjectiveRow[] }) {
  const [tab, setTab] = useState<"exams" | "per">("exams");
  const existingByModule = Object.fromEntries(exams.map((e) => [e.exam_module, e]));
  const existingByNumber = Object.fromEntries(objectives.map((o: any) => [o.objective_number, o]));
  const passed = exams.filter((e) => e.status === "passed" || e.result?.toLowerCase() === "pass").length;
  const totalRequired = 13;
  const progress = Math.min(100, Math.round((passed / totalRequired) * 100));
  const scheduled = exams.filter((e) => e.next_sitting).sort((a, b) => String(a.next_sitting).localeCompare(String(b.next_sitting)));
  const nextSitting = scheduled[0]?.next_sitting;
  const essentials = objectives.filter((o: any) => o.status === "approved" && ACCA_OBJECTIVES.find((x) => x.number === o.objective_number)?.essential).length;
  const technical = objectives.filter((o: any) => o.status === "approved" && !ACCA_OBJECTIVES.find((x) => x.number === o.objective_number)?.essential).length;

  const exportTranscript = () => {
    const rows = [
      ["ACCA Exam Transcript"],
      ["Module", "Code", "Level", "Status", "Next Sitting", "Result"],
      ...ACCA_EXAMS.map((exam) => { const e = existingByModule[exam.name]; return [exam.name, exam.code, exam.level, e?.status ?? "not_started", e?.next_sitting ?? "", e?.result ?? ""]; }),
      [],
      ["PER Objectives"],
      ["Objective", "Category", "Essential", "Status", "Submitted", "Approved"],
      ...ACCA_OBJECTIVES.map((obj) => { const o: any = existingByNumber[obj.number]; return [obj.title, obj.category, obj.essential ? "Yes" : "No", o?.status ?? "not_started", o?.submitted_at ?? "", o?.approved_at ?? ""]; }),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "acca-transcript.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const nextLabel = useMemo(() => nextSitting ? new Date(nextSitting).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "Not scheduled", [nextSitting]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
      <div className="mb-7 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">Professional Qualification</h1><p className="text-sm sm:text-base text-on-surface-variant mt-1">Track your journey through ACCA examinations and Practical Experience Requirements.</p></div>
        <button type="button" onClick={exportTranscript} className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg bg-on-surface text-surface px-5 py-2.5 text-sm font-semibold hover:opacity-90"><span>↓</span> Export Transcript</button>
      </div>

      <div className="border-b border-outline-variant mb-7 overflow-x-auto no-scrollbar"><div className="flex min-w-max gap-7 sm:gap-10"><button type="button" onClick={() => setTab("exams")} className={`relative pb-3 text-sm font-bold ${tab === "exams" ? "text-on-surface" : "text-on-surface-variant"}`}>Examinations{tab === "exams" && <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] rounded-full bg-primary" />}</button><button type="button" onClick={() => setTab("per")} className={`relative pb-3 text-sm font-bold ${tab === "per" ? "text-on-surface" : "text-on-surface-variant"}`}>PER Objectives{tab === "per" && <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] rounded-full bg-primary" />}</button></div></div>

      {tab === "exams" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 flex items-center gap-5"><div className="w-16 h-16 shrink-0 rounded-full border-4 border-primary flex items-center justify-center"><span className="text-2xl font-black">{passed}</span></div><div><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Passed</p><p className="text-lg font-bold">{totalRequired} Total Papers</p></div></div>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Overall Progress</p><div className="flex items-end justify-between mt-1 mb-2"><span className="text-4xl font-extrabold">{progress}%</span><span className="text-xs font-bold text-primary">{passed}/{totalRequired} passed</span></div><div className="h-2.5 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div></div>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Next Sitting</p><p className="text-xl font-bold mt-2">{nextLabel}</p><p className="text-xs text-on-surface-variant mt-1">{scheduled.length} exam{scheduled.length === 1 ? "" : "s"} currently scheduled</p></div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 sm:p-6"><div className="mb-5"><h2 className="text-lg font-bold">Examinations</h2><p className="text-xs text-on-surface-variant mt-1">Update status, sitting date and result. Changes are saved to your portal account.</p></div><ExamsList userId={userId} existingByModule={existingByModule} /></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Experience Requirement Status</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-5"><div><p className="text-2xl font-extrabold">{essentials} / 5</p><p className="text-xs text-on-surface-variant">Essentials completed</p></div><div><p className="text-2xl font-extrabold">{technical} / 4</p><p className="text-xs text-on-surface-variant">Technical objectives completed</p></div><div><p className="text-2xl font-extrabold">{objectives.filter((o) => o.status === "approved").length} / {ACCA_OBJECTIVES.length}</p><p className="text-xs text-on-surface-variant">Approved objectives</p></div></div></div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 sm:p-6"><h2 className="text-lg font-bold mb-1">PER Objectives</h2><p className="text-xs text-on-surface-variant mb-5">Track evidence, submission and manager/admin approval status.</p><ObjectivesList userId={userId} existingByNumber={existingByNumber} /></div>
        </div>
      )}
    </div>
  );
}
