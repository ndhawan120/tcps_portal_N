import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import RoleSelect from "./RoleSelect";

export default async function AdminPage() {
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

  const { data: allUsers } = await supabase
    .from("profiles")
    .select("*")
    .order("last_name");

  const { data: allObjectives } = await supabase
    .from("per_objectives")
    .select("status");

  const total = allObjectives?.length ?? 0;
  const approved = allObjectives?.filter((o) => o.status === "approved").length ?? 0;
  const globalProgress = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div>
      <Nav role={profile?.role ?? "admin"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">Admin Panel</h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Global progress across all users:{" "}
          <span className="font-semibold text-primary">{globalProgress}%</span>
        </p>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <h2 className="text-lg font-bold text-on-surface px-5 pt-5 pb-3">
            User Accounts
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Department</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {(allUsers ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-medium text-on-surface">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{u.email}</td>
                  <td className="px-5 py-3 text-on-surface-variant">
                    {u.department ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <RoleSelect userId={u.id} currentRole={u.role} />
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant capitalize">
                    {u.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-on-surface-variant mt-4">
          New users appear here automatically once they sign up in Supabase Auth.
          To invite someone, add them from the Supabase dashboard under
          Authentication → Users → Invite, then set their role here.
        </p>
      </main>
    </div>
  );
}
