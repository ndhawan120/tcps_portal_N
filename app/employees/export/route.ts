import { createClient } from "@/lib/supabase/server";

function esc(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: viewer } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!viewer || (viewer.role !== "admin" && viewer.role !== "manager")) return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const requestedUser = url.searchParams.get("user_id");

  let usersQuery = supabase.from("profiles").select("*").order("last_name");
  if (requestedUser) usersQuery = usersQuery.eq("id", requestedUser);
  if (viewer.role === "manager") usersQuery = usersQuery.eq("manager_id", viewer.id);
  const { data: users } = await usersQuery;
  const employeeIds = (users ?? []).map(u => u.id);
  if (!employeeIds.length) return new Response("No employees found", { status: 404 });

  const [{ data: objectives }, { data: exams }] = await Promise.all([
    supabase.from("per_objectives").select("*").in("user_id", employeeIds).order("objective_number"),
    supabase.from("exams").select("*").in("user_id", employeeIds),
  ]);

  const rows: string[] = [];
  rows.push(["Employee ID","First Name","Last Name","Email","Department","Role","Account Status","Manager ID","PER Objective","PER Title","PER Status","Evidence","Submitted At","Approved At","Approved By","Exam Module","Exam Level","Exam Status","Next Sitting","Result"].map(esc).join(","));

  for (const u of users ?? []) {
    const uObjectives = (objectives ?? []).filter(o => o.user_id === u.id);
    const uExams = (exams ?? []).filter(e => e.user_id === u.id);
    const max = Math.max(uObjectives.length, uExams.length, 1);
    for (let i = 0; i < max; i++) {
      const o = uObjectives[i]; const e = uExams[i];
      rows.push([u.id,u.first_name,u.last_name,u.email,u.department,u.role,u.status,u.manager_id,o?.objective_number,o?.title,o?.status,o?.evidence_notes,o?.submitted_at,o?.approved_at,o?.approved_by,e?.exam_module,e?.level,e?.status,e?.next_sitting,e?.result].map(esc).join(","));
    }
  }

  const csv = rows.join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="tc-group-employees-${new Date().toISOString().slice(0,10)}.xls"`,
      "Cache-Control": "no-store",
    },
  });
}
