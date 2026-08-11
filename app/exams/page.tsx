import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import ExamsList from "./ExamsList";

export default async function ExamsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: exams, error: examsError } = await supabase
    .from("exams")
    .select(
      "id, exam_module, level, status, exam_date, next_sitting, result, created_at, updated_at"
    )
    .eq("user_id", user.id);

  if (examsError) {
    console.error("Failed to load exams:", examsError);
  }

  const existingByModule = Object.fromEntries(
    (exams ?? []).map((exam) => [exam.exam_module, exam])
  );

  const passed = (exams ?? []).filter(
    (exam) => exam.status === "passed"
  ).length;

  return (
    <div>
      <Nav
        role={profile?.role ?? "employee"}
        name={`${profile?.first_name ?? ""} ${
          profile?.last_name ?? ""
        }`}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">
          ACCA Exam Tracker
        </h1>

        <p className="text-sm text-on-surface-variant mb-6">
          {passed} of 13 papers passed.
        </p>

        {examsError && (
          <div className="mb-6 text-sm text-error bg-error-container/40 border border-error/30 rounded-lg px-4 py-3">
            Couldn&apos;t load exam data: {examsError.message}
          </div>
        )}

        <ExamsList
          userId={user.id}
          existingByModule={existingByModule}
        />
      </main>
    </div>
  );
}
