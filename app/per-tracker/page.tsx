import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import ObjectivesList from "./ObjectivesList";

export default async function PerTrackerPage() {
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
    .select("objective_number, status, evidence_notes, submitted_at, approved_at")
    .eq("user_id", user.id);

  const existingByNumber = Object.fromEntries(
    (objectives ?? []).map((o) => [o.objective_number, o])
  );

  const total = 22;
  const approved = (objectives ?? []).filter((o) => o.status === "approved").length;

  return (
    <div>
      <Nav role={profile?.role ?? "employee"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">PER Objectives</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          {approved} of {total} approved. You need all 5 Essentials, plus any 4 of
          the 17 Technical objectives.
        </p>
        <ObjectivesList userId={user.id} existingByNumber={existingByNumber} />
      </main>
    </div>
  );
}
