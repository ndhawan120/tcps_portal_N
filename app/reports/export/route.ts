import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: viewer } = await supabase.from("profiles").select("id,role,status").eq("id", user.id).single();
  if (!viewer || !["admin", "manager"].includes(viewer.role) || viewer.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let peopleQuery = supabase.from("profiles").select("id,first_name,last_name,email,department,job_title,joining_date,status,manager_id").eq("role", "employee").eq("status", "active").order("last_name");
  if (viewer.role === "manager") peopleQuery = peopleQuery.eq("manager_id", viewer.id);
  const { data: people, error: peopleError } = await peopleQuery;
  if (peopleError) return NextResponse.json({ error: peopleError.message }, { status: 500 });

  const ids = (people ?? []).map((p) => p.id);
  const [{ data: objectives }, { data: exams }] = await Promise.all([
    ids.length ? supabase.from("per_objectives").select("user_id,status").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? supabase.from("exams").select("user_id,status,result").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
  ]);

  const rows = (people ?? []).map((person) => {
    const per = (objectives ?? []).filter((o) => o.user_id === person.id);
    const exam = (exams ?? []).filter((e) => e.user_id === person.id);
    const approved = per.filter((o) => o.status === "approved").length;
    const pending = per.filter((o) => o.status === "pending_approval").length;
    const passed = exam.filter((e) => e.status === "passed" || String(e.result ?? "").toLowerCase() === "pass").length;
    return {
      Employee: `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
      Email: person.email ?? "",
      Department: person.department ?? "",
      "Job Title": person.job_title ?? "",
      "Joining Date": person.joining_date ?? "",
      Status: person.status ?? "",
      "PER Approved": approved,
      "PER Pending Approval": pending,
      "Exam Passed": passed,
    };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Message: "No active employees found." }]), "Employee Report");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Metric: "Active Employees", Value: people?.length ?? 0 },
    { Metric: "PER Objectives", Value: objectives?.length ?? 0 },
    { Metric: "PER Approved", Value: (objectives ?? []).filter((o) => o.status === "approved").length },
    { Metric: "PER Pending Approval", Value: (objectives ?? []).filter((o) => o.status === "pending_approval").length },
    { Metric: "Exams", Value: exams?.length ?? 0 },
    { Metric: "Exams Passed", Value: (exams ?? []).filter((e) => e.status === "passed" || String(e.result ?? "").toLowerCase() === "pass").length },
  ]), "Summary");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="tcps-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    "Cache-Control": "no-store, max-age=0",
  }});
}
