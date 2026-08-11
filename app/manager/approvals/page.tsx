import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import ApproveButton from "../ApproveButton";

export default async function ApprovalsPage() {
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

  if (profile?.role !== "manager" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const isAdmin = profile.role === "admin";

  const { data: team } = isAdmin
    ? { data: null }
    : await supabase.from("profiles").select("id").eq("manager_id", user.id);

  const teamIds = (team ?? []).map((member) => member.id);

  const pendingQuery = isAdmin
    ? supabase
        .from("per_objectives")
        .select("*, profiles!per_objectives_user_id_fkey(first_name,last_name,email)")
        .eq("status", "pending_approval")
        .order("submitted_at", { ascending: true })
    : teamIds.length
    ? supabase
        .from("per_objectives")
        .select("*, profiles!per_objectives_user_id_fkey(first_name,last_name,email)")
        .in("user_id", teamIds)
        .eq("status", "pending_approval")
        .order("submitted_at", { ascending: true })
    : null;

  const { data: pending } = pendingQuery ? await pendingQuery : { data: [] };

  const historyQuery = isAdmin
    ? supabase
        .from("approval_history")
        .select(
          "*, per_objectives(objective_number,title,profiles!per_objectives_user_id_fkey(first_name,last_name))"
        )
        .order("created_at", { ascending: false })
        .limit(100)
    : supabase
        .from("approval_history")
        .select(
          "*, per_objectives(objective_number,title,profiles!per_objectives_user_id_fkey(first_name,last_name))"
        )
        .order("created_at", { ascending: false })
        .limit(100);

  const { data: history } = await historyQuery;

  return (
    <div>
      <Nav
        role={profile?.role ?? "manager"}
        name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`}
      />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">PER Approvals</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Review employee PER submissions and record your decision.
            </p>
          </div>
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">
            {pending?.length ?? 0} Pending
          </span>
        </div>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-8">
          <h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">
            Pending Requests
          </h2>
          <div className="divide-y divide-outline-variant">
            {(pending ?? []).map((item: any) => (
              <div key={item.id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">
                    Objective {item.objective_number}: {item.title}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {item.profiles?.first_name} {item.profiles?.last_name}
                    {item.profiles?.email ? ` · ${item.profiles.email}` : ""}
                    {item.submitted_at
                      ? ` · Submitted ${new Date(item.submitted_at).toLocaleDateString()}`
                      : ""}
                  </p>
                  {item.evidence_notes && (
                    <p className="text-xs text-on-surface-variant mt-2 whitespace-pre-wrap">
                      {item.evidence_notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                    Pending approval
                  </span>
                  <ApproveButton objectiveId={item.id} actorId={user.id} />
                </div>
              </div>
            ))}
            {(!pending || pending.length === 0) && (
              <p className="px-5 py-8 text-center text-sm text-on-surface-variant">
                No PER requests are waiting for approval.
              </p>
            )}
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">Approval History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                <tr>
                  <th className="text-left px-5 py-3">Objective</th>
                  <th className="text-left px-5 py-3">Employee</th>
                  <th className="text-left px-5 py-3">Action</th>
                  <th className="text-left px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {(history ?? []).map((h: any) => (
                  <tr key={h.id}>
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">
                      PO-{String(h.per_objectives?.objective_number ?? "").padStart(2, "0")}
                    </td>
                    <td className="px-5 py-3 text-on-surface">
                      {h.per_objectives?.profiles?.first_name} {h.per_objectives?.profiles?.last_name}
                    </td>
                    <td className="px-5 py-3 capitalize text-on-surface-variant">{h.action}</td>
                    <td className="px-5 py-3 text-on-surface-variant">
                      {new Date(h.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!history || history.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-on-surface-variant">
                      No approval actions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
