import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import ApproveButton from "./ApproveButton";

export default async function ManagerPage() {
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

  const { data: team } = await supabase
    .from("profiles")
    .select("*")
    .eq("manager_id", user.id);

  const teamIds = (team ?? []).map((t) => t.id);

  const { data: pending } = teamIds.length
    ? await supabase
        .from("per_objectives")
        .select("*, profiles!per_objectives_user_id_fkey(first_name,last_name)")
        .in("user_id", teamIds)
        .eq("status", "pending_approval")
    : { data: [] };

  const { data: allObjectives } = teamIds.length
    ? await supabase.from("per_objectives").select("user_id,status").in("user_id", teamIds)
    : { data: [] };

  const progressByUser: Record<string, { total: number; approved: number }> = {};
  (allObjectives ?? []).forEach((o) => {
    progressByUser[o.user_id] ??= { total: 0, approved: 0 };
    progressByUser[o.user_id].total += 1;
    if (o.status === "approved") progressByUser[o.user_id].approved += 1;
  });

  const avgProgress =
    (team ?? []).length > 0
      ? Math.round(
          (team ?? []).reduce((sum, t) => {
            const p = progressByUser[t.id];
            return sum + (p && p.total > 0 ? (p.approved / p.total) * 100 : 0);
          }, 0) / (team ?? []).length
        )
      : 0;

  return (
    <div>
      <Nav role={profile?.role ?? "manager"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">Team Overview</h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Average team progress: <span className="font-semibold text-primary">{avgProgress}%</span>
        </p>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-8">
          <h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">
            Pending PER Approvals
          </h2>
          <div className="divide-y divide-outline-variant">
            {(pending ?? []).map((p: any) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    {p.profiles?.first_name} {p.profiles?.last_name} — Objective {p.objective_number}: {p.title}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Submitted {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <ApproveButton objectiveId={p.id} actorId={user.id} />
              </div>
            ))}
            {(!pending || pending.length === 0) && (
              <p className="px-5 py-4 text-sm text-on-surface-variant">
                No approvals pending right now.
              </p>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
          <h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">Team</h2>
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {(team ?? []).map((t) => {
                const p = progressByUser[t.id];
                const pct = p && p.total > 0 ? Math.round((p.approved / p.total) * 100) : 0;
                return (
                  <tr key={t.id}>
                    <td className="px-5 py-3 font-medium text-on-surface">
                      {t.first_name} {t.last_name}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{pct}%</td>
                  </tr>
                );
              })}
              {(!team || team.length === 0) && (
                <tr>
                  <td colSpan={2} className="px-5 py-6 text-center text-on-surface-variant">
                    No direct reports assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
