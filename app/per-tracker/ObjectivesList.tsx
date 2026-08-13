"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusPill from "@/components/StatusPill";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";

type ExistingRow = { id?: string; status: string; evidence_notes: string | null; submitted_at: string | null; approved_at: string | null };
type Evidence = { id: string; file_path: string; file_name: string; mime_type: string; file_size: number; created_at: string };

export default function ObjectivesList({ userId, existingByNumber, readOnly = false }: { userId: string; existingByNumber: Record<number, ExistingRow>; readOnly?: boolean }) {
  return <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">{ACCA_OBJECTIVES.map((obj) => <ObjectiveRow key={obj.number} userId={userId} number={obj.number} title={obj.title} category={obj.category} essential={obj.essential} existing={existingByNumber[obj.number]} readOnly={readOnly} />)}</div>;
}

function ObjectiveRow({ userId, number, title, category, essential, existing, readOnly }: { userId: string; number: number; title: string; category: string; essential: boolean; existing?: ExistingRow; readOnly: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const status = existing?.status ?? "not_started";
  const [notes, setNotes] = useState(existing?.evidence_notes ?? "");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const editable = !readOnly && ["not_started", "draft", "rejected"].includes(status);
  const isPending = status === "pending_approval";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const objectiveId = existing?.id;

  useEffect(() => {
    let active = true;
    if (!objectiveId) return;
    supabase.from("per_evidence").select("id,file_path,file_name,mime_type,file_size,created_at").eq("objective_id", objectiveId).order("created_at", { ascending: false }).then(({ data }) => { if (active) setEvidence((data ?? []) as Evidence[]); });
    return () => { active = false; };
  }, [objectiveId]);

  const saveObjective = async (newStatus: "draft" | "pending_approval") => {
    if (!editable || saving) return;
    setSaving(true); setError(null); setSuccess(null);
    if (newStatus === "pending_approval" && !notes.trim() && evidence.length === 0) {
      setSaving(false); setError("Please add evidence notes or upload supporting evidence before submitting."); return;
    }
    const payload: Record<string, unknown> = { user_id: userId, objective_number: number, title, evidence_notes: notes.trim() || null, status: newStatus };
    if (newStatus === "pending_approval") payload.submitted_at = new Date().toISOString();
    const { error: saveError } = await supabase.from("per_objectives").upsert(payload, { onConflict: "user_id,objective_number" });
    setSaving(false);
    if (saveError) { console.error(saveError); setError(saveError.message); return; }
    setSuccess(newStatus === "draft" ? "Draft saved successfully." : "Objective submitted successfully and is waiting for approval.");
    router.refresh();
  };

  const uploadEvidence = async (file: File) => {
    if (!editable || uploading) return;
    if (!objectiveId) { setError("Save this objective as a draft before uploading evidence."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Files must be 10 MB or smaller."); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowed.includes(file.type)) { setError("This file type is not supported. Use PDF, image, Word or Excel files."); return; }
    setUploading(true); setError(null); setSuccess(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${objectiveId}/${crypto.randomUUID()}-${safeName}`;
    try {
      const { error: uploadError } = await supabase.storage.from("per-evidence").upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: metadata, error: metadataError } = await supabase.from("per_evidence").insert({ objective_id: objectiveId, user_id: userId, file_path: path, file_name: file.name, mime_type: file.type, file_size: file.size }).select("id,file_path,file_name,mime_type,file_size,created_at").single();
      if (metadataError) { await supabase.storage.from("per-evidence").remove([path]); throw metadataError; }
      setEvidence((items) => [metadata as Evidence, ...items]);
      setSuccess("Evidence uploaded successfully.");
      router.refresh();
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Unable to upload evidence."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const viewEvidence = async (filePath: string) => {
    const { data, error: signedError } = await supabase.storage.from("per-evidence").createSignedUrl(filePath, 300);
    if (signedError || !data?.signedUrl) { setError(signedError?.message ?? "Unable to open evidence."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return <div className="p-5">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-on-surface">{number}. {title}</p><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${essential ? "bg-amber-100 text-amber-800" : "bg-surface-container text-on-surface-variant"}`}>{essential ? "Essential" : category}</span></div><div className="flex flex-wrap gap-4 text-xs text-on-surface-variant mt-1"><span>Submitted: {existing?.submitted_at ? new Date(existing.submitted_at).toLocaleDateString() : "—"}</span><span>Approved: {existing?.approved_at ? new Date(existing.approved_at).toLocaleDateString() : "—"}</span></div></div><StatusPill status={status} />
    </div>

    {isPending && <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container p-3"><p className="text-xs font-semibold">Pending Approval</p><p className="text-xs text-on-surface-variant mt-1">Your evidence has been submitted and is waiting for manager/admin review.</p></div>}
    {isApproved && <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container p-3"><p className="text-xs font-semibold">Objective Approved</p><p className="text-xs text-on-surface-variant mt-1">This objective has been approved by your manager or administrator.</p></div>}
    {isRejected && <div className="mt-4 rounded-lg border border-error/30 bg-error-container/30 p-3"><p className="text-xs font-semibold">Objective Rejected</p><p className="text-xs text-on-surface-variant mt-1">Update your evidence and submit the objective again for approval.</p></div>}

    {editable ? <div className="mt-4"><textarea value={notes} onChange={(e) => { setNotes(e.target.value); setError(null); setSuccess(null); }} placeholder="Add evidence notes explaining how you achieved this objective..." rows={4} disabled={saving || uploading} className="w-full text-xs border border-outline-variant rounded-md px-3 py-2 bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60" /><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2"><p className="text-[11px] text-on-surface-variant">{notes.trim().length ? `${notes.trim().length} characters` : "Add notes or upload evidence before submitting."}</p><div className="flex flex-wrap gap-2"><input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadEvidence(file); }} /><button type="button" onClick={() => inputRef.current?.click()} disabled={saving || uploading} className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50">{uploading ? "Uploading..." : "Upload Evidence"}</button><button type="button" onClick={() => void saveObjective("draft")} disabled={saving || uploading} className="text-xs font-medium px-3 py-1.5 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50">{saving ? "Saving..." : "Save draft"}</button><button type="button" onClick={() => void saveObjective("pending_approval")} disabled={saving || uploading || (!notes.trim() && evidence.length === 0)} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50">{saving ? "Submitting..." : "Submit for approval"}</button></div></div></div> : existing?.evidence_notes ? <div className="mt-4"><p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Evidence Notes</p><p className="text-xs text-on-surface-variant whitespace-pre-wrap">{existing.evidence_notes}</p></div> : null}

    {evidence.length > 0 && <div className="mt-4 border-t border-outline-variant pt-4"><div className="flex items-center justify-between mb-2"><p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Supporting Evidence</p><span className="text-[10px] text-on-surface-variant">{evidence.length} file{evidence.length === 1 ? "" : "s"}</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{evidence.map((file) => <button type="button" key={file.id} onClick={() => void viewEvidence(file.file_path)} className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-left hover:bg-surface-container"><span className="text-lg" aria-hidden="true">▣</span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{file.file_name}</span><span className="block text-[10px] text-on-surface-variant">{formatBytes(file.file_size)} · {new Date(file.created_at).toLocaleDateString()}</span></span></button>)}</div></div>}

    {success && <div className="mt-3 text-xs text-on-surface bg-surface-container border border-outline-variant rounded-md px-3 py-2">{success}</div>}
    {error && <div className="mt-3 text-xs text-error bg-error-container/40 border border-error/30 rounded-md px-3 py-2"><strong>Couldn&apos;t save:</strong> {error}</div>}
  </div>;
}

function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
