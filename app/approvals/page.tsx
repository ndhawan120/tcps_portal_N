"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";
import RegistrationApproval from "@/app/admin/RegistrationApproval";

type Profile = { id: string; first_name: string; last_name: string; email: string; role: string; department: string | null; manager_id: string | null };
type Objective = { id: string; user_id: string; objective_number: number; title: string; status: string; evidence_notes: string | null; submitted_at: string | null; approved_at: string | null; approved_by: string | null };
type Request = { objective: Objective; employee: Profile };

export default function ApprovalsPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  async function loadApprovals() {
    setLoading(true); setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) { window.location.href = "/login"; return; }
      const { data: profile, error: profileError } = await supabase.from("profiles").select("id, first_name, last_name, email, role, department, manager_id").eq("id", user.id).single();
      if (profileError || !profile) throw new Error(profileError?.message ?? "Profile not found.");
      if (profile.role !== "admin" && profile.role !== "manager") { window.location.href = "/dashboard"; return; }
      setCurrentUser(profile);
      const { data: objectives, error: objectivesError } = await supabase.from("per_objectives").select("id, user_id, objective_number, title, status, evidence_notes, submitted_at, approved_at, approved_by").eq("status", "pending_approval").order("submitted_at", { ascending: true });
      if (objectivesError) throw new Error(objectivesError.message);
      const ids = [...new Set((objectives ?? []).map((o) => o.user_id))];
      if (!ids.length) { setRequests([]); return; }
      const { data: employees, error: employeesError } = await supabase.from("profiles").select("id, first_name, last_name, email, role, department, manager_id").in("id", ids);
      if (employeesError) throw new Error(employeesError.message);
      const employeeMap = new Map((employees ?? []).map((employee) => [employee.id, employee]));
      setRequests((objectives ?? []).map((objective) => ({ objective, employee: employeeMap.get(objective.user_id) })).filter((item): item is Request => !!item.employee).filter(({ employee }) => profile.role === "admin" || employee.manager_id === profile.id));
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Unable to load approval requests."); } finally { setLoading(false); }
  }
  useEffect(() => { loadApprovals(); }, []);

  async function review(objectiveId: string, action: "approved" | "rejected", comments?: string) {
    if (!currentUser) return; setProcessingId(objectiveId); setError(null);
    try { const { error: reviewError } = await supabase.rpc("review_per_objective", { p_objective_id: objectiveId, p_action: action, p_comments: comments?.trim() || null }); if (reviewError) throw new Error(reviewError.message); setRequests((items) => items.filter((item) => item.objective.id !== objectiveId)); setRejectingId(null); setRejectComment(""); }
    catch (err) { console.error(err); setError(err instanceof Error ? err.message : `Unable to ${action} this objective.`); }
    finally { setProcessingId(null); }
  }
  const getMeta = (number: number) => ACCA_OBJECTIVES.find((item) => item.number === number);

  if (loading) return <div><Nav role={currentUser?.role ?? "manager"} name={currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : ""} /><main className="max-w-6xl mx-auto px-6 py-8"><p className="text-sm text-on-surface-variant">Loading approval requests...</p></main></div>;
  return <div><Nav role={currentUser?.role ?? "manager"} name={currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : ""} /><main className="max-w-6xl mx-auto px-6 py-8">
    {currentUser?.role === "admin" && <div className="mb-8"><RegistrationApproval /></div>}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"><div><h1 className="text-2xl font-bold text-on-surface">PER Approvals</h1><p className="text-sm text-on-surface-variant mt-1">Review employee PER objectives submitted for approval.</p></div><div className="bg-surface-container border border-outline-variant rounded-lg px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Pending Requests</p><p className="text-2xl font-extrabold text-primary">{requests.length}</p></div></div>
    {error && <div className="mb-6 text-sm text-error bg-error-container/40 border border-error/30 rounded-lg px-4 py-3"><strong>Error:</strong> {error}</div>}
    {requests.length === 0 ? <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center"><p className="text-lg font-semibold text-on-surface">No pending approvals</p><p className="text-sm text-on-surface-variant mt-2">There are currently no PER objectives waiting for your review.</p></div> : <div className="space-y-5">{requests.map(({ objective, employee }) => { const meta = getMeta(objective.objective_number); const processing = processingId === objective.id; const rejecting = rejectingId === objective.id; return <div key={objective.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-on-surface">{employee.first_name} {employee.last_name}</h2><span className="text-xs text-on-surface-variant">{employee.email}</span>{employee.department && <span className="text-xs px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">{employee.department}</span>}</div><div className="flex flex-wrap items-center gap-2 mt-3"><p className="text-sm font-semibold text-on-surface">Objective {objective.objective_number}: {objective.title}</p>{meta?.essential && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Essential</span>}<StatusPill status={objective.status} /></div><p className="text-xs text-on-surface-variant mt-2">Submitted: {objective.submitted_at ? new Date(objective.submitted_at).toLocaleString() : "—"}</p>{objective.evidence_notes && <div className="mt-4 rounded-lg bg-surface-container p-3"><p className="text-xs font-bold text-on-surface mb-1">Evidence</p><p className="text-sm text-on-surface whitespace-pre-wrap">{objective.evidence_notes}</p></div>}</div><div className="flex flex-col gap-2 lg:min-w-[150px]">{!rejecting ? <><button type="button" disabled={processing} onClick={() => review(objective.id, "approved")} className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50">{processing ? "Processing..." : "Approve"}</button><button type="button" disabled={processing} onClick={() => { setRejectingId(objective.id); setRejectComment(""); }} className="text-sm font-semibold px-4 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50">Reject</button></> : <div className="space-y-2"><textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} rows={4} placeholder="Reason for rejection (required)" className="w-full text-xs border border-outline-variant rounded-md px-2 py-2 bg-background" /><button type="button" disabled={processing || !rejectComment.trim()} onClick={() => review(objective.id, "rejected", rejectComment)} className="w-full text-sm font-semibold px-4 py-2 rounded-md bg-error text-on-error hover:opacity-90 disabled:opacity-50">{processing ? "Processing..." : "Confirm rejection"}</button><button type="button" disabled={processing} onClick={() => { setRejectingId(null); setRejectComment(""); }} className="w-full text-xs font-medium px-3 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container">Cancel</button></div>}</div></div></div>; })}</div>}
  </main></div>;
}
