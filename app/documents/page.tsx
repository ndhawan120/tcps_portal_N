import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import DirectEvidenceUpload from "./DirectEvidenceUpload";

export default async function DocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "employee" || profile.status !== "active") redirect("/dashboard");
  const { data: objectives } = await supabase.from("per_objectives").select("objective_number,title,status,evidence_notes,evidence_file_url,updated_at,id").eq("user_id", user.id).order("objective_number");
  return <div className="min-h-screen bg-[#f9f9f9]"><Nav role="employee" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="lg:ml-64 pt-6 lg:pt-[92px] px-4 sm:px-6 lg:px-10 pb-10"><div className="max-w-6xl mx-auto"><div className="mb-7"><h1 className="text-3xl font-extrabold">Documents & PER Evidence</h1><p className="text-sm text-on-surface-variant mt-1">Upload and manage supporting documents directly here. You no longer need to leave this page and return to Exam / PER.</p></div><section className="bg-white border border-outline-variant rounded-xl overflow-hidden">{(objectives ?? []).map((o) => <article key={o.id} className="p-5 border-b border-outline-variant last:border-0"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div className="min-w-0 flex-1"><p className="font-bold">Objective {o.objective_number}: {o.title}</p>{o.evidence_notes && <p className="text-sm text-on-surface-variant mt-2 whitespace-pre-wrap">{o.evidence_notes}</p>}<DirectEvidenceUpload objectiveId={o.id} userId={user.id} currentUrl={o.evidence_file_url} /></div><span className="text-xs font-bold capitalize text-primary shrink-0">{o.status.replaceAll("_", " ")}</span></div></article>)}{!(objectives ?? []).length && <div className="p-8 text-sm text-on-surface-variant">No PER objectives are available yet. <Link href="/exams" className="font-semibold text-primary hover:underline">Open Exam / PER</Link> to start your qualification tracker.</div>}</section></div></main></div>;
}
