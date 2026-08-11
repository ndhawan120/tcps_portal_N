"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusPill from "@/components/StatusPill";
import { ACCA_EXAMS } from "@/lib/accaExams";

const STATUSES = ["not_started", "in_progress", "scheduled", "passed", "failed"] as const;

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
  const grouped = ACCA_EXAMS.reduce<Record<string, typeof ACCA_EXAMS>>((acc, e) => {
    acc[e.level] ??= [];
    acc[e.level].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([level, exams]) => (
        <div key={level}>
          <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-2">
            {level}
          </h2>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
            {exams.map((e) => (
              <ExamRow
                key={e.code}
                userId={userId}
                code={e.code}
                name={e.name}
                optional={e.optional}
                existing={existingByModule[e.name]}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ACCA_EXAM_LEVEL(name: string): string {
  const found = ACCA_EXAMS.find((e) => e.name === name);
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
  const [status, setStatus] = useState(existing?.status ?? "not_started");
  const [nextSitting, setNextSitting] = useState(existing?.next_sitting ?? "");
  const [result, setResult] = useState(existing?.result ?? "");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const upsertExam = async (patch: {
    status?: string;
    next_sitting?: string | null;
    result?: string | null;
  }) => {
    setError(null);
    const level = ACCA_EXAM_LEVEL(name);
    const { error } = await supabase.from("exams").upsert(
      {
        user_id: userId,
        exam_module: name,
        level,
        status: patch.status ?? status,
        next_sitting:
          patch.next_sitting !== undefined ? patch.next_sitting : nextSitting || null,
        result: patch.result !== undefined ? patch.result : result || null,
      },
      { onConflict: "user_id,exam_module" }
    );
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  };

  const applied = status !== "not_started";

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
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

        {readOnly ? (
          <>
            <span className="text-xs text-on-surface-variant">
              {nextSitting ? new Date(nextSitting).toLocaleDateString() : "—"}
            </span>
            <span className="text-xs text-on-surface-variant w-16">
              {result || "—"}
            </span>
          </>
        ) : (
          <>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                upsertExam({ status: e.target.value });
              }}
              className="text-xs border border-outline-variant rounded-md px-2 py-1.5 bg-surface-container-lowest capitalize"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={nextSitting ?? ""}
              onChange={(e) => setNextSitting(e.target.value)}
              onBlur={() => upsertExam({ next_sitting: nextSitting || null })}
              className="text-xs border border-outline-variant rounded-md px-2 py-1.5"
            />

            <input
              type="text"
              placeholder="Result"
              value={result ?? ""}
              onChange={(e) => setResult(e.target.value)}
              onBlur={() => upsertExam({ result: result || null })}
              className="text-xs border border-outline-variant rounded-md px-2 py-1.5 w-24"
            />
          </>
        )}

        <StatusPill status={status} />
      </div>
      {error && (
        <p className="mt-2 text-xs text-error bg-error-container/40 border border-error/30 rounded-md px-2 py-1.5">
          Couldn&apos;t save: {error}
        </p>
      )}
    </div>
  );
}
