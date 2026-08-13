import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";

export default async function DocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "employee") redirect("/dashboard");
  const { data: objectives } = await supabase.from("per_objectives").select("objective_number,title,status,evidence_notes,updated_at").eq("user_id", user.id).order("objective_number");
  const evidence = (objectives ?? []).filter((o) => o.evidence_notes?.trim());
  return <div className="min-h-screen bg-[#f9f9f9]"><Nav role="employee" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="lg:ml-64 pt-6 lg:pt-[92px] px-4 sm:px-6 lg:px-10 pb-10"><div className="max-w-6xl mx-auto"><h1 className="text-3xl font-extrabold">Documents</h1><p className="text-sm text-on-surface-variant mt-1 mb-7">Evidence and supporting notes connected to your PER objectives.</p><section className="bg-white border border-outline-variant rounded-xl overflow-hidden">{evidence.length ? evidence.map((o) => <article key={o.objective_number} className="p-5 border-b border-outline-variant last:border-0"><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold">Objective {o.objective_number}: {o.title}</h2><p className="text-sm text-on-surface-variant mt-2 whitespace-pre-wrap">{o.evidence_notes}</p></div><span className="text-xs font-bold capitalize text-primary">{o.status.replaceAll("_", " ")}</span></div></article>) : <div className="p-8 text-sm text-on-surface-variant">No PER evidence notes have been added yet. Add evidence from the PER Objectives section and it will appear here.</div>}</section></div></main></div>;
}
