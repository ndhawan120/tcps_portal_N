import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import AddExamModal from "./AddExamModal";
import EditExamRow from "./EditExamRow";

export default async function ExamsPage() {
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

  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .eq("user_id", user.id)
    .order("level");

  return (
    <div>
      <Nav role={profile?.role ?? "employee"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-on-surface">ACCA Exam Tracker</h1>
          <AddExamModal userId={user.id} />
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
              <tr>
                <th className="text-left px-5 py-3">Exam Module</th>
                <th className="text-left px-5 py-3">Level</th>
                <th className="text-left px-5 py-3">Next Sitting</th>
                <th className="text-left px-5 py-3">Status &amp; Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {(exams ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 font-medium text-on-surface">
                    {e.exam_module}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{e.level}</td>
                  <td className="px-5 py-3 text-on-surface-variant">
                    {e.next_sitting
                      ? new Date(e.next_sitting).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <EditExamRow
                      examId={e.id}
                      currentStatus={e.status}
                      currentResult={e.result}
                    />
                  </td>
                </tr>
              ))}
              {(!exams || exams.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-on-surface-variant">
                    No exams recorded yet. Click &quot;+ Add Exam&quot; to add your first one.
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
