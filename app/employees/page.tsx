import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

export default async function EmployeesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) redirect("/dashboard");

  let query = supabase.from("profiles").select("*").order("last_name", { ascending: true });
  if (profile.role === "manager") query = query.eq("manager_id", user.id);
  const { data: employees } = await query;
  const users = employees ?? [];
  const ids = users.map((u) => u.id);

  const { data: per } = ids.length ? await supabase.from("per_objectives").select("user_id,status").in("user_id", ids) : { data: [] as any[] };
  const { data: exams } = ids.length ? await supabase.from("exams").select("user_id,status").in("user_id", ids) : { data: [] as any[] };

  const perByUser: Record<string, { approved: number; pending: number; rejected: number }> = {};
  const examByUser: Record<string, { passed: number; total: number }> = {};
  for (const id of ids) { perByUser[id] = { approved: 0, pending: 0, rejected: 0 }; examByUser[id] = { passed: 0, total: 0 }; }
  for (const row of per ?? []) {
    perByUser[row.user_id] ??= { approved: 0, pending: 0, rejected: 0 };
    if (row.status === "approved") perByUser[row.user_id].approved++;
    if (row.status === "pending_approval") perByUser[row.user_id].pending++;
    if (row.status === "rejected") perByUser[row.user_id].rejected++;
  }
  for (const row of exams ?? []) {
    examByUser[row.user_id] ??= { passed: 0, total: 0 };
    examByUser[row.user_id].total++;
    if (row.status === "passed") examByUser[row.user_id].passed++;
  }

  return (
    <div>
      <Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{profile.role === "manager" ? "My Team" : "Employees"}</h1>
            <p className="text-sm text-on-surface-variant mt-1">{profile.role === "manager" ? "Only employees reporting directly to you are shown." : "Company employee directory and progress."}</p>
          </div>
          <a href="/employees/export" className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary">Download Excel</a>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                <tr><th className="text-left px-5 py-3">Employee</th><th className="text-left px-5 py-3">Department</th><th className="text-left px-5 py-3">Role</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">PER</th><th className="text-left px-5 py-3">Exams</th><th className="px-5 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.map((u) => {
                  const p = perByUser[u.id] ?? { approved: 0, pending: 0, rejected: 0 };
                  const e = examByUser[u.id] ?? { passed: 0, total: 0 };
                  return <tr key={u.id} className="hover:bg-surface-container/40">
                    <td className="px-5 py-3"><p className="font-medium text-on-surface">{u.first_name} {u.last_name}</p><p className="text-xs text-on-surface-variant">{u.email}</p></td>
                    <td className="px-5 py-3 text-on-surface-variant">{u.department ?? "—"}</td>
                    <td className="px-5 py-3 text-on-surface-variant capitalize">{u.role}</td>
                    <td className="px-5 py-3 text-on-surface-variant capitalize">{String(u.status).replaceAll("_", " ")}</td>
                    <td className="px-5 py-3"><div className="w-32"><div className="flex justify-between text-xs mb-1"><span>{p.approved}/22</span><span>{Math.round((p.approved / 22) * 100)}%</span></div><div className="h-2 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.round((p.approved / 22) * 100))}%` }} /></div>{p.pending > 0 && <p className="text-[10px] text-on-surface-variant mt-1">{p.pending} pending</p>}</div></td>
                    <td className="px-5 py-3"><div className="w-32"><div className="flex justify-between text-xs mb-1"><span>{e.passed}/13</span><span>{Math.round((e.passed / 13) * 100)}%</span></div><div className="h-2 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.round((e.passed / 13) * 100))}%` }} /></div></div></td>
                    <td className="px-5 py-3"><Link href={`/employees/${u.id}`} className="text-xs font-semibold text-primary hover:underline">View profile →</Link></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {users.length === 0 && <div className="p-10 text-center text-sm text-on-surface-variant">No employees found.</div>}
        </div>
      </main>
    </div>
  );
}
