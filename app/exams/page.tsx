import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import ExamsList from "./ExamsList";

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
    .select("exam_module, status, next_sitting, result")
    .eq("user_id", user.id);

  const existingByModule = Object.fromEntries(
    (exams ?? []).map((e) => [e.exam_module, e])
  );

  const passed = (exams ?? []).filter((e) => e.status === "passed").length;

  return (
    <div>
      <Nav role={profile?.role ?? "employee"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">ACCA Exam Tracker</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          {passed} of 13 papers passed.
        </p>
        <ExamsList userId={user.id} existingByModule={existingByModule} />
      </main>
    </div>
  );
}
