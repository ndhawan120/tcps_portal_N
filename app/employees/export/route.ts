import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const TOTAL_OBJECTIVES = 22;
const TOTAL_EXAMS = 13;

export async function GET(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  /*
   * Get current user's profile.
   */
  const { data: viewer, error: viewerError } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

  if (viewerError || !viewer) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  /*
   * Only Admins and Managers can export employee data.
   */
  if (
    viewer.role !== "admin" &&
    viewer.role !== "manager"
  ) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  /*
   * Optional individual employee ID.
   *
   * Example:
   *
   * /employees/export?user_id=xxxxx
   */
  const requestedUserId =
    request.nextUrl.searchParams.get("user_id");

  /*
   * Get employees.
   */
  let employeeQuery = supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee")
    .order("last_name", {
      ascending: true,
    });

  /*
   * Manager can only export their own team.
   */
  if (viewer.role === "manager") {
    employeeQuery = employeeQuery.eq(
      "manager_id",
      viewer.id
    );
  }

  /*
   * If a specific employee was requested,
   * apply that filter.
   */
  if (requestedUserId) {
    employeeQuery = employeeQuery.eq(
      "id",
      requestedUserId
    );
  }

  const {
    data: employees,
    error: employeesError,
  } = await employeeQuery;

  if (employeesError) {
    console.error(
      "Employee export query failed:",
      employeesError
    );

    return NextResponse.json(
      {
        error: employeesError.message,
      },
      { status: 500 }
    );
  }

  if (!employees || employees.length === 0) {
    return NextResponse.json(
      {
        error:
          "No employees found or you do not have permission to export this employee.",
      },
      { status: 404 }
    );
  }

  const employeeIds = employees.map(
    (employee) => employee.id
  );

  /*
   * Get PER objectives.
   */
  const { data: objectives, error: objectivesError } =
    await supabase
      .from("per_objectives")
      .select("*")
      .in("user_id", employeeIds)
      .order("objective_number", {
        ascending: true,
      });

  if (objectivesError) {
    return NextResponse.json(
      {
        error: objectivesError.message,
      },
      { status: 500 }
    );
  }

  /*
   * Get exams.
   */
  const { data: exams, error: examsError } =
    await supabase
      .from("exams")
      .select("*")
      .in("user_id", employeeIds)
      .order("exam_module", {
        ascending: true,
      });

  if (examsError) {
    return NextResponse.json(
      {
        error: examsError.message,
      },
      { status: 500 }
    );
  }

  /*
   * Create lookup maps.
   */
  const objectivesByUser: Record<string, any[]> =
    {};

  for (const objective of objectives ?? []) {
    if (!objectivesByUser[objective.user_id]) {
      objectivesByUser[objective.user_id] = [];
    }

    objectivesByUser[objective.user_id].push(
      objective
    );
  }

  const examsByUser: Record<string, any[]> = {};

  for (const exam of exams ?? []) {
    if (!examsByUser[exam.user_id]) {
      examsByUser[exam.user_id] = [];
    }

    examsByUser[exam.user_id].push(exam);
  }

  /*
   * Create workbook.
   */
  const workbook = XLSX.utils.book_new();

  /*
   * =========================================================
   * SHEET 1 — EMPLOYEE SUMMARY
   * =========================================================
   */

  const summaryRows = employees.map((employee) => {
    const employeeObjectives =
      objectivesByUser[employee.id] ?? [];

    const employeeExams =
      examsByUser[employee.id] ?? [];

    const approvedPER =
      employeeObjectives.filter(
        (item) =>
          item.status === "approved"
      ).length;

    const pendingPER =
      employeeObjectives.filter(
        (item) =>
          item.status ===
          "pending_approval"
      ).length;

    const passedExams =
      employeeExams.filter(
        (item) =>
          item.status === "passed" ||
          item.result?.toLowerCase() ===
            "pass"
      ).length;

    return {
      "Employee ID": employee.id,
      "First Name": employee.first_name ?? "",
      "Last Name": employee.last_name ?? "",
      Email: employee.email ?? "",
      Department: employee.department ?? "",
      Role: employee.role ?? "",
      "Job Title": employee.job_title ?? "",
      "Joining Date":
        employee.joining_date ?? "",
      Status: employee.status ?? "",
      "Manager ID":
        employee.manager_id ?? "",
      "PER Approved":
        approvedPER,
      "PER Total":
        TOTAL_OBJECTIVES,
      "PER Progress":
        `${Math.round(
          (approvedPER /
            TOTAL_OBJECTIVES) *
            100
        )}%`,
      "PER Pending Approval":
        pendingPER,
      "Exams Passed":
        passedExams,
      "Exams Total":
        TOTAL_EXAMS,
      "Exam Progress":
        `${Math.round(
          (passedExams /
            TOTAL_EXAMS) *
            100
        )}%`,
      "Last Login":
        employee.last_login ?? "",
    };
  });

  const summarySheet =
    XLSX.utils.json_to_sheet(summaryRows);

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Employee Summary"
  );

  /*
   * =========================================================
   * SHEET 2 — PER OBJECTIVES
   * =========================================================
   */

  const perRows: any[] = [];

  for (const employee of employees) {
    const employeeObjectives =
      objectivesByUser[employee.id] ?? [];

    for (const objective of employeeObjectives) {
      perRows.push({
        "Employee ID": employee.id,
        Employee:
          `${employee.first_name ?? ""} ${
            employee.last_name ?? ""
          }`.trim(),
        Email: employee.email ?? "",
        Department:
          employee.department ?? "",
        "Objective Number":
          objective.objective_number,
        "Objective Title":
          objective.title ?? "",
        Status:
          objective.status ?? "",
        "Evidence Notes":
          objective.evidence_notes ?? "",
        "Submitted At":
          objective.submitted_at ?? "",
        "Approved At":
          objective.approved_at ?? "",
        "Approved By":
          objective.approved_by ?? "",
        "Created At":
          objective.created_at ?? "",
        "Updated At":
          objective.updated_at ?? "",
      });
    }
  }

  const perSheet =
    XLSX.utils.json_to_sheet(
      perRows.length > 0
        ? perRows
        : [
            {
              Message:
                "No PER objectives found.",
            },
          ]
    );

  XLSX.utils.book_append_sheet(
    workbook,
    perSheet,
    "PER Objectives"
  );

  /*
   * =========================================================
   * SHEET 3 — EXAMS
   * =========================================================
   */

  const examRows: any[] = [];

  for (const employee of employees) {
    const employeeExams =
      examsByUser[employee.id] ?? [];

    for (const exam of employeeExams) {
      examRows.push({
        "Employee ID": employee.id,
        Employee:
          `${employee.first_name ?? ""} ${
            employee.last_name ?? ""
          }`.trim(),
        Email: employee.email ?? "",
        Department:
          employee.department ?? "",
        "Exam Module":
          exam.exam_module ?? "",
        Level: exam.level ?? "",
        Status: exam.status ?? "",
        "Exam Date":
          exam.exam_date ?? "",
        "Next Sitting":
          exam.next_sitting ?? "",
        Result:
          exam.result ?? "",
        "Created At":
          exam.created_at ?? "",
        "Updated At":
          exam.updated_at ?? "",
      });
    }
  }

  const examSheet =
    XLSX.utils.json_to_sheet(
      examRows.length > 0
        ? examRows
        : [
            {
              Message:
                "No exam records found.",
            },
          ]
    );

  XLSX.utils.book_append_sheet(
    workbook,
    examSheet,
    "Exams"
  );

  /*
   * =========================================================
   * SHEET 4 — COMPLETE DATA
   * =========================================================
   *
   * One row per employee/objective/exam combination
   * is not ideal, so this sheet contains a compact
   * employee-level overview.
   */

  const completeRows = employees.map(
    (employee) => {
      const employeeObjectives =
        objectivesByUser[employee.id] ?? [];

      const employeeExams =
        examsByUser[employee.id] ?? [];

      const approved =
        employeeObjectives.filter(
          (item) =>
            item.status === "approved"
        ).length;

      const pending =
        employeeObjectives.filter(
          (item) =>
            item.status ===
            "pending_approval"
        ).length;

      const passed =
        employeeExams.filter(
          (item) =>
            item.status === "passed" ||
            item.result?.toLowerCase() ===
              "pass"
        ).length;

      return {
        "Employee ID": employee.id,
        Name:
          `${employee.first_name ?? ""} ${
            employee.last_name ?? ""
          }`.trim(),
        Email: employee.email ?? "",
        Department:
          employee.department ?? "",
        Role: employee.role ?? "",
        "Job Title":
          employee.job_title ?? "",
        "Joining Date":
          employee.joining_date ?? "",
        Status:
          employee.status ?? "",
        "Manager ID":
          employee.manager_id ?? "",
        "PER Approved":
          approved,
        "PER Pending":
          pending,
        "PER Remaining":
          Math.max(
            0,
            TOTAL_OBJECTIVES -
              approved
          ),
        "PER Progress":
          `${Math.round(
            (approved /
              TOTAL_OBJECTIVES) *
              100
          )}%`,
        "Exams Passed":
          passed,
        "Exams Remaining":
          Math.max(
            0,
            TOTAL_EXAMS - passed
          ),
        "Exam Progress":
          `${Math.round(
            (passed /
              TOTAL_EXAMS) *
              100
          )}%`,
        "Last Login":
          employee.last_login ?? "",
      };
    }
  );

  const completeSheet =
    XLSX.utils.json_to_sheet(
      completeRows
    );

  XLSX.utils.book_append_sheet(
    workbook,
    completeSheet,
    "Complete Overview"
  );

  /*
   * Generate XLSX buffer.
   */
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const isIndividual =
    Boolean(requestedUserId) &&
    employees.length === 1;

  const filename = isIndividual
    ? `employee-${employees[0].first_name ?? "employee"}-${
        employees[0].last_name ?? ""
      }.xlsx`
    : `tcps-employees-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":
        "no-store, max-age=0",
    },
  });
}
