"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusPill from "@/components/StatusPill";
import { ACCA_EXAMS } from "@/lib/accaExams";

const STATUSES = [
  ["not_started", "Not Started"],
  ["in_progress", "In Progress"],
  ["scheduled", "Scheduled"],
  ["passed", "Passed"],
  ["failed", "Failed"],
] as const;
const RESULTS = [["", "No Result"], ["Pass", "Pass"], ["Fail", "Fail"], ["Exempt", "Exempt"]] as const;

type ExistingRow = { id?: string; level?: string; status: string; exam_date?: string | null; next_sitting: string | null; result: string | null };

export default function ExamsList({ userId, existingByModule, readOnly = false }: { userId: string; existingByModule: Record<string, ExistingRow>; readOnly?: boolean }) {
  const [selected, setSelected] = useState<null | { code: string; name: string; level: string; optional: boolean; existing?: ExistingRow }>(null);
  return <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
    <div className="hidden lg:grid grid-cols-[1.6fr_1fr_150px_130px_110px_120px] gap-3 bg-surface-container-low px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant border-b border-outline-variant"><span>Exam Module</span><span>Level</span><span>Status</span><span>Date</span><span>Result</span><span className="text-right">Actions</span></div>
    <div className="divide-y divide-outline-variant">{ACCA_EXAMS.map((exam) => <ExamRow key={exam.code} userId={userId} exam={exam} existing={existingByModule[exam.name]} readOnly={readOnly} onDetails={() => setSelected({ ...exam, existing: existingByModule[exam.name] })} />)}</div>
    {selected && <ExamDetails exam={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function ExamRow({ userId, exam, existing, readOnly, onDetails }: { userId: string; exam: (typeof ACCA_EXAMS)[number]; existing?: ExistingRow; readOnly: boolean; onDetails: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(existing?.status ?? "not_started");
  const [examDate, setExamDate] = useState(existing?.exam_date ?? "");
  const [nextSitting, setNextSitting] = useState(existing?.next_sitting ?? "");
  const [result, setResult] = useState(existing?.result ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveExam = async (patch: Partial<{ status: string; exam_date: string | null; next_sitting: string | null; result: string | null }>) => {
    if (readOnly || saving) return;
    setSaving(true); setMessage(null); setError(null);
    const payload = { user_id: userId, exam_module: exam.name, level: exam.level, status: patch.status ?? status, exam_date: patch.exam_date !== undefined ? patch.exam_date : examDate || null, next_sitting: patch.next_sitting !== undefined ? patch.next_sitting : nextSitting || null, result: patch.result !== undefined ? patch.result : result || null };
    try {
      let id = existing?.id;
      if (!id) {
        const { data, error: lookupError } = await supabase.from("exams").select("id").eq("user_id", userId).eq("exam_module", exam.name).maybeSingle();
        if (lookupError) throw lookupError;
        id = data?.id;
      }
      const response = id ? await supabase.from("exams").update(payload).eq("id", id).eq("user_id", userId) : await supabase.from("exams").insert(payload);
      if (response.error) throw response.error;
      setMessage("Saved successfully.");
      router.refresh();
    } catch (err) {
      console.error("Exam update failed", err);
      setError(err instanceof Error ? err.message : "Unable to save exam information.");
    } finally { setSaving(false); }
  };

  const statusChange = (value: string) => { setStatus(value); void saveExam({ status: value }); };
  const resultChange = (value: string) => { setResult(value); const inferredStatus = value === "Pass" ? "passed" : value === "Fail" ? "failed" : undefined; if (inferredStatus) setStatus(inferredStatus); void saveExam({ result: value || null, ...(inferredStatus ? { status: inferredStatus } : {}) }); };
  const dateBlur = () => void saveExam({ exam_date: examDate || null });
  const nextBlur = () => void saveExam({ next_sitting: nextSitting || null });

  return <div className="px-4 py-4 lg:px-5 hover:bg-surface-container-low transition-colors">
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr_150px_130px_110px_120px] gap-3 lg:items-center">
      <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-bold text-sm text-on-surface">{exam.name} ({exam.code})</p>{exam.optional && <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">Optional</span>}</div><p className="text-xs text-on-surface-variant mt-1">{existing?.status === "not_started" || !existing ? "Not started" : "Exam information entered"}</p></div>
      <p className="hidden lg:block text-xs text-on-surface-variant">{exam.level}</p>
      <div><label className="lg:hidden block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Status</label>{readOnly ? <StatusPill status={status} /> : <select value={status} disabled={saving} onChange={(e) => statusChange(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-2 text-xs">{STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div>
      <div><label className="lg:hidden block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Date</label>{readOnly ? <span className="text-xs">{examDate ? new Date(examDate).toLocaleDateString() : "—"}</span> : <input type="date" value={examDate} disabled={saving} onChange={(e) => setExamDate(e.target.value)} onBlur={dateBlur} className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-2 text-xs" />}</div>
      <div><label className="lg:hidden block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Result</label>{readOnly ? <span className="text-xs font-bold">{result || "—"}</span> : <select value={result} disabled={saving} onChange={(e) => resultChange(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-2 text-xs">{RESULTS.map(([value, label]) => <option key={value || "none"} value={value}>{label}</option>)}</select>}</div>
      <div className="lg:text-right"><button type="button" onClick={onDetails} className="text-xs font-bold text-primary hover:underline">View Details</button></div>
    </div>
    {!readOnly && <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-outline-variant pt-3"><label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Next Sitting</label><input type="date" value={nextSitting} disabled={saving} onChange={(e) => setNextSitting(e.target.value)} onBlur={nextBlur} className="rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-xs" />{saving && <span className="text-[11px] text-on-surface-variant">Saving...</span>}{message && <span className="text-[11px] text-on-surface-variant">✓ {message}</span>}{error && <span className="text-[11px] text-error">{error}</span>}</div>}
  </div>;
}

function ExamDetails({ exam, onClose }: { exam: { code: string; name: string; level: string; optional: boolean; existing?: ExistingRow }; onClose: () => void }) {
  const e = exam.existing;
  return <div className="fixed inset-0 z-[100] bg-black/40 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Exam details"><div className="w-full max-w-lg rounded-xl bg-surface-container-lowest border border-outline-variant shadow-2xl overflow-hidden"><div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant"><div><h3 className="font-bold text-lg">{exam.name}</h3><p className="text-xs text-on-surface-variant">{exam.code} · {exam.level}{exam.optional ? " · Optional paper" : ""}</p></div><button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-container text-lg" aria-label="Close">×</button></div><div className="grid grid-cols-2 gap-4 p-5"><Detail label="Status" value={labelStatus(e?.status ?? "not_started")} /><Detail label="Result" value={e?.result || "No result"} /><Detail label="Exam Date" value={e?.exam_date ? new Date(e.exam_date).toLocaleDateString() : "—"} /><Detail label="Next Sitting" value={e?.next_sitting ? new Date(e.next_sitting).toLocaleDateString() : "—"} /></div><div className="px-5 pb-5"><button type="button" onClick={onClose} className="w-full rounded-lg bg-on-surface text-surface px-4 py-2.5 text-sm font-semibold">Close</button></div></div></div>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-surface-container-low p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p><p className="text-sm font-semibold mt-1">{value}</p></div>; }
function labelStatus(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
