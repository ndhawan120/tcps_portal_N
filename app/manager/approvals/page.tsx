import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";

export default async function ApprovalHistoryPage() {
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

  const { data: history } = await supabase
    .from("approval_history")
    .select(
      "*, per_objectives(objective_number,title,profiles!per_objectives_user_id_fkey(first_name,last_name))"
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <Nav role={profile?.role ?? "manager"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-6">
          Approval Workflow History
        </h1>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
              <tr>
                <th className="text-left px-5 py-3">Objective ID</th>
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {(history ?? []).map((h: any) => (
                <tr key={h.id}>
                  <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">
                    PO-{String(h.per_objectives?.objective_number).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-3 text-on-surface">
                    {h.per_objectives?.profiles?.first_name}{" "}
                    {h.per_objectives?.profiles?.last_name}
                  </td>
                  <td className="px-5 py-3 capitalize text-on-surface-variant">
                    {h.action}
                  </td>
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
      </main>
    </div>
  );
}
