"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusPill from "@/components/StatusPill";
import { ACCA_EXAMS } from "@/lib/accaExams";

const STATUSES = [
  {
    value: "not_started",
    label: "Not Started",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "scheduled",
    label: "Scheduled",
  },
  {
    value: "passed",
    label: "Passed",
  },
  {
    value: "failed",
    label: "Failed",
  },
] as const;

const RESULTS = [
  {
    value: "",
    label: "No Result",
  },
  {
    value: "Pass",
    label: "Pass",
  },
  {
    value: "Fail",
    label: "Fail",
  },
  {
    value: "Exempt",
    label: "Exempt",
  },
] as const;

type ExistingRow = {
  id?: string;
  level?: string;
  status: string;
  exam_date?: string | null;
  next_sitting: string | null;
  result: string | null;
};

export default function ExamsList({
  userId,
  existingByModule,
  readOnly = false,
}: {
  userId: string;
  existingByModule: Record<string, ExistingRow>;
  readOnly?: boolean;
}) {
  const grouped = ACCA_EXAMS.reduce<Record<string, typeof ACCA_EXAMS>>(
    (acc, exam) => {
      if (!acc[exam.level]) {
        acc[exam.level] = [];
      }

      acc[exam.level].push(exam);

      return acc;
    },
    {}
  );

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([level, exams]) => (
        <div key={level}>
          <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-3">
            {level}
          </h2>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-hidden">
            {exams.map((exam) => (
              <ExamRow
                key={exam.code}
                userId={userId}
                code={exam.code}
                name={exam.name}
                optional={exam.optional}
                existing={existingByModule[exam.name]}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getExamLevel(name: string): string {
  const found = ACCA_EXAMS.find(
    (exam) => exam.name === name
  );

  return found?.level ?? "Applied Knowledge";
}

function ExamRow({
  userId,
  code,
  name,
  optional,
  existing,
  readOnly,
}: {
  userId: string;
  code: string;
  name: string;
  optional: boolean;
  existing?: ExistingRow;
  readOnly: boolean;
}) {
  const [status, setStatus] = useState(
    existing?.status ?? "not_started"
  );

  const [nextSitting, setNextSitting] = useState(
    existing?.next_sitting ?? ""
  );

  const [result, setResult] = useState(
    existing?.result ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  /*
   * =========================================================
   * SAVE EXAM
   * =========================================================
   */

  const saveExam = async (patch: {
    status?: string;
    next_sitting?: string | null;
    result?: string | null;
  }) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const level = getExamLevel(name);

    const payload = {
      user_id: userId,
      exam_module: name,
      level,
      status: patch.status ?? status,
      next_sitting:
        patch.next_sitting !== undefined
          ? patch.next_sitting
          : nextSitting || null,
      result:
        patch.result !== undefined
          ? patch.result
          : result || null,
    };

    try {
      /*
       * -------------------------------------------------------
       * If an existing row already exists, UPDATE it.
       *
       * This avoids relying on ON CONFLICT and therefore avoids
       * the unique-constraint error you were getting.
       * -------------------------------------------------------
       */

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("exams")
          .update(payload)
          .eq("id", existing.id)
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        /*
         * -----------------------------------------------------
         * No existing record yet.
         *
         * First check whether one already exists for this
         * employee + exam module.
         * -----------------------------------------------------
         */

        const { data: existingExam, error: lookupError } =
          await supabase
            .from("exams")
            .select("id")
            .eq("user_id", userId)
            .eq("exam_module", name)
            .maybeSingle();

        if (lookupError) {
          throw new Error(lookupError.message);
        }

        if (existingExam?.id) {
          const { error: updateError } = await supabase
            .from("exams")
            .update(payload)
            .eq("id", existingExam.id)
            .eq("user_id", userId);

          if (updateError) {
            throw new Error(updateError.message);
          }
        } else {
          const { error: insertError } = await supabase
            .from("exams")
            .insert(payload);

          if (insertError) {
            throw new Error(insertError.message);
          }
        }
      }

      setSuccess("Saved successfully.");

      /*
       * Refresh server data so the page and dashboard stay
       * synchronized.
       */

      router.refresh();
    } catch (saveError) {
      console.error("Exam update failed:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save exam information."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =========================================================
   * STATUS CHANGE
   * =========================================================
   */

  const handleStatusChange = (
    newStatus: string
  ) => {
    setStatus(newStatus);

    saveExam({
      status: newStatus,
    });
  };

  /*
   * =========================================================
   * RESULT CHANGE
   * =========================================================
   */

  const handleResultChange = (
    newResult: string
  ) => {
    setResult(newResult);

    saveExam({
      result: newResult || null,
    });
  };

  /*
   * =========================================================
   * NEXT SITTING CHANGE
   * =========================================================
   */

  const handleNextSittingChange = (
    newDate: string
  ) => {
    setNextSitting(newDate);
  };

  /*
   * Save date after user leaves the field.
   */

  const handleNextSittingBlur = () => {
    saveExam({
      next_sitting: nextSitting || null,
    });
  };

  const applied = status !== "not_started";

  return (
    <div className="p-5">
      <div className="flex flex-col xl:flex-row xl:items-center gap-4">

        {/* =====================================================
            EXAM NAME
        ===================================================== */}

        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-on-surface">
              {code} — {name}
            </p>

            {optional && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                Optional
              </span>
            )}
          </div>

          <p className="text-xs text-on-surface-variant mt-1">
            {applied
              ? "Exam information entered"
              : "Not started"}
          </p>
        </div>

        {/* =====================================================
            CONTROLS
        ===================================================== */}

        {readOnly ? (
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-[10px] uppercase font-semibold text-on-surface-variant">
                Next Sitting
              </p>

              <p className="text-xs text-on-surface">
                {nextSitting
                  ? new Date(
                      nextSitting
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase font-semibold text-on-surface-variant">
                Result
              </p>

              <p className="text-xs text-on-surface">
                {result || "No Result"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">

            {/* =================================================
                STATUS
            ================================================= */}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                Status
              </label>

              <select
                value={status}
                disabled={saving}
                onChange={(event) =>
                  handleStatusChange(
                    event.target.value
                  )
                }
                className="min-w-[145px] text-xs border border-outline-variant rounded-md px-3 py-2 bg-surface-container-lowest text-on-surface disabled:opacity-50"
              >
                {STATUSES.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* =================================================
                NEXT SITTING
            ================================================= */}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                Next Sitting
              </label>

              <input
                type="date"
                value={nextSitting}
                disabled={saving}
                onChange={(event) =>
                  handleNextSittingChange(
                    event.target.value
                  )
                }
                onBlur={handleNextSittingBlur}
                className="min-w-[145px] text-xs border border-outline-variant rounded-md px-3 py-2 bg-surface-container-lowest text-on-surface disabled:opacity-50"
              />
            </div>

            {/* =================================================
                RESULT
            ================================================= */}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                Result
              </label>

              <select
                value={result}
                disabled={saving}
                onChange={(event) =>
                  handleResultChange(
                    event.target.value
                  )
                }
                className="min-w-[130px] text-xs border border-outline-variant rounded-md px-3 py-2 bg-surface-container-lowest text-on-surface disabled:opacity-50"
              >
                {RESULTS.map((item) => (
                  <option
                    key={item.value || "no-result"}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* =====================================================
            STATUS PILL
        ===================================================== */}

        <div className="shrink-0">
          <StatusPill status={status} />
        </div>
      </div>

      {/* =======================================================
          SAVING
      ======================================================= */}

      {saving && (
        <p className="mt-3 text-xs text-on-surface-variant">
          Saving exam information...
        </p>
      )}

      {/* =======================================================
          SUCCESS
      ======================================================= */}

      {success && !error && (
        <p className="mt-3 text-xs text-on-surface-variant bg-surface-container border border-outline-variant rounded-md px-3 py-2">
          ✓ {success}
        </p>
      )}

      {/* =======================================================
          ERROR
      ======================================================= */}

      {error && (
        <p className="mt-3 text-xs text-error bg-error-container/40 border border-error/30 rounded-md px-3 py-2">
          <strong>Couldn&apos;t save:</strong>{" "}
          {error}
        </p>
      )}
    </div>
  );
}
