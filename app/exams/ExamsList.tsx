"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusPill from "@/components/StatusPill";
import { ACCA_EXAMS } from "@/lib/accaExams";

const STATUSES = [
  "not_started",
  "in_progress",
  "scheduled",
  "passed",
  "failed",
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
  status: string;
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
      acc[exam.level] ??= [];
      acc[exam.level].push(exam);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([level, exams]) => (
        <div key={level}>
          <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-2">
            {level}
          </h2>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
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
  const found = ACCA_EXAMS.find((exam) => exam.name === name);

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

  const upsertExam = async (patch: {
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

    const { error: upsertError } = await supabase
      .from("exams")
      .upsert(payload, {
        onConflict: "user_id,exam_module",
      });

    setSaving(false);

    if (upsertError) {
      console.error("Exam update failed:", upsertError);

      setError(
        upsertError.message ||
          "Unable to save the exam information."
      );

      return;
    }

    setSuccess("Saved successfully.");

    router.refresh();
  };

  const applied = status !== "not_started";

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">

        {/* =====================================================
            EXAM NAME
        ===================================================== */}

        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-medium text-on-surface">
            {code} — {name}

            {optional && (
              <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                Optional
              </span>
            )}
          </p>

          <p className="text-xs text-on-surface-variant mt-0.5">
            {applied ? "Applied" : "Not applied yet"}
          </p>
        </div>

        {/* =====================================================
            CONTROLS
        ===================================================== */}

        {readOnly ? (
          <>
            <span className="text-xs text-on-surface-variant">
              {nextSitting
                ? new Date(nextSitting).toLocaleDateString()
                : "—"}
            </span>

            <span className="text-xs text-on-surface-variant">
              {result || "No Result"}
            </span>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">

            {/* STATUS DROPDOWN */}

            <select
              value={status}
              disabled={saving}
              onChange={(e) => {
                const newStatus = e.target.value;

                setStatus(newStatus);

                upsertExam({
                  status: newStatus,
                });
              }}
              className="text-xs border border-outline-variant rounded-md px-2 py-1.5 bg-surface-container-lowest capitalize disabled:opacity-50"
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.replace("_", " ")}
                </option>
              ))}
            </select>

            {/* EXAM DATE */}

            <input
              type="date"
              value={nextSitting}
              disabled={saving}
              onChange={(e) => {
                setNextSitting(e.target.value);
              }}
              onBlur={() => {
                upsertExam({
                  next_sitting:
                    nextSitting || null,
                });
              }}
              className="text-xs border border-outline-variant rounded-md px-2 py-1.5 disabled:opacity-50"
            />

            {/* RESULT DROPDOWN */}

            <select
              value={result}
              disabled={saving}
              onChange={(e) => {
                const newResult = e.target.value;

                setResult(newResult);

                upsertExam({
                  result: newResult || null,
                });
              }}
              className="text-xs border border-outline-variant rounded-md px-2 py-1.5 bg-surface-container-lowest disabled:opacity-50"
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
        )}

        {/* =====================================================
            STATUS PILL
        ===================================================== */}

        <StatusPill status={status} />
      </div>

      {/* =======================================================
          SAVING
      ======================================================= */}

      {saving && (
        <p className="mt-2 text-xs text-on-surface-variant">
          Saving...
        </p>
      )}

      {/* =======================================================
          SUCCESS
      ======================================================= */}

      {success && !error && (
        <p className="mt-2 text-xs text-on-surface-variant bg-surface-container border border-outline-variant rounded-md px-2 py-1.5">
          {success}
        </p>
      )}

      {/* =======================================================
          ERROR
      ======================================================= */}

      {error && (
        <p className="mt-2 text-xs text-error bg-error-container/40 border border-error/30 rounded-md px-2 py-1.5">
          <strong>Couldn&apos;t save:</strong>{" "}
          {error}
        </p>
      )}
    </div>
  );
}
