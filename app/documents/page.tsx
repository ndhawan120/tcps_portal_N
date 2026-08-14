import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";

export default async function DocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "employee" || profile.status !== "active") redirect("/dashboard");
  const { data: objectives } = await supabase.from("per_objectives").select("objective_number,title,status,evidence_notes,updated_at").eq("user_id", user.id).order("objective_number");
  const evidence = (objectives ?? []).filter((o) => o.evidence_notes?.trim());
  return <div className="min-h-screen bg-[#f9f9f9]"><Nav role="employee" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="lg:ml-64 pt-6 lg:pt-[92px] px-4 sm:px-6 lg:px-10 pb-10"><div className="max-w-6xl mx-auto"><div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7"><div><h1 className="text-3xl font-extrabold">Documents & PER Evidence</h1><p className="text-sm text-on-surface-variant mt-1">Your saved evidence notes and supporting information connected to PER objectives.</p></div><Link href="/exams" className="inline-flex text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary">Open Exam / PER →</Link></div><section className="bg-white border border-outline-variant rounded-xl overflow-hidden">{evidence.length ? evidence.map((o) => <article key={o.objective_number} className="p-5 border-b border-outline-variant last:border-0"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><Link href="/exams" className="font-bold hover:text-primary">Objective {o.objective_number}: {o.title}</Link><p className="text-sm text-on-surface-variant mt-2 whitespace-pre-wrap">{o.evidence_notes}</p><Link href="/exams" className="text-xs font-semibold text-primary hover:underline mt-3 inline-block">Update evidence in Exam / PER →</Link></div><span className="text-xs font-bold capitalize text-primary shrink-0">{o.status.replaceAll("_", " ")}</span></div></article>) : <div className="p-8 text-sm text-on-surface-variant">No PER evidence notes have been added yet. <Link href="/exams" className="font-semibold text-primary hover:underline">Open Exam / PER</Link> to add evidence.</div>}</section></div></main></div>;
}
