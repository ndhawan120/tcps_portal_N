"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusPill from "@/components/StatusPill";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";

type ExistingRow = {
  status: string;
  evidence_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
};

export default function ObjectivesList({
  userId,
  existingByNumber,
  readOnly = false,
}: {
  userId: string;
  existingByNumber: Record<number, ExistingRow>;
  readOnly?: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
      {ACCA_OBJECTIVES.map((obj) => (
        <ObjectiveRow
          key={obj.number}
          userId={userId}
          number={obj.number}
          title={obj.title}
          category={obj.category}
          essential={obj.essential}
          existing={existingByNumber[obj.number]}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

function ObjectiveRow({
  userId,
  number,
  title,
  category,
  essential,
  existing,
  readOnly,
}: {
  userId: string;
  number: number;
  title: string;
  category: string;
  essential: boolean;
  existing?: ExistingRow;
  readOnly: boolean;
}) {
  const status = existing?.status ?? "not_started";

  const [notes, setNotes] = useState(existing?.evidence_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  /*
   * ------------------------------------------------------------
   * STATUS RULES
   * ------------------------------------------------------------
   *
   * Employee can edit:
   *
   * NOT STARTED
   * DRAFT
   * REJECTED
   *
   * Employee cannot edit:
   *
   * PENDING APPROVAL
   * APPROVED
   */

  const editable =
    !readOnly &&
    (
      status === "not_started" ||
      status === "draft" ||
      status === "rejected"
    );

  const isPending = status === "pending_approval";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isDraft = status === "draft";
  const isNotStarted = status === "not_started";

  /*
   * ------------------------------------------------------------
   * SAVE / SUBMIT
   * ------------------------------------------------------------
   */

  const runUpsert = async (
    newStatus: "draft" | "pending_approval"
  ) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    /*
     * Evidence is required when submitting.
     * Drafts can be saved without evidence.
     */

    if (newStatus === "pending_approval" && !notes.trim()) {
      setSaving(false);
      setError(
        "Please add evidence notes before submitting this objective for approval."
      );
      return;
    }

    const payload: Record<string, unknown> = {
      user_id: userId,
      objective_number: number,
      title,
      evidence_notes: notes.trim() || null,
      status: newStatus,
    };

    /*
     * When submitting:
     *
     * submitted_at = current time
     *
     * When saving a draft:
     *
     * keep the existing submitted_at value.
     */

    if (newStatus === "pending_approval") {
      payload.submitted_at = new Date().toISOString();
    }

    const { error: upsertError } = await supabase
      .from("per_objectives")
      .upsert(payload, {
        onConflict: "user_id,objective_number",
      });

    setSaving(false);

    if (upsertError) {
      console.error("PER objective update failed:", upsertError);

      setError(
        upsertError.message ||
          "Unable to save this objective. Please try again."
      );

      return;
    }

    /*
     * Success messages
     */

    if (newStatus === "draft") {
      setSuccess("Draft saved successfully.");
    } else {
      setSuccess(
        "Objective submitted successfully. It is now waiting for manager/admin approval."
      );
    }

    /*
     * Refresh server data so the status changes immediately.
     */

    router.refresh();
  };

  const saveDraft = () => {
    if (!editable || saving) return;

    runUpsert("draft");
  };

  const submit = () => {
    if (!editable || saving) return;

    runUpsert("pending_approval");
  };

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div className="p-5">
      {/* ======================================================
          OBJECTIVE HEADER
      ====================================================== */}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-on-surface">
              {number}. {title}
            </p>

            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                essential
                  ? "bg-amber-100 text-amber-800"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {essential ? "Essential" : category}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant mt-1">
            <span>
              Submitted:{" "}
              {existing?.submitted_at
                ? new Date(existing.submitted_at).toLocaleDateString()
                : "—"}
            </span>

            <span>
              Approved:{" "}
              {existing?.approved_at
                ? new Date(existing.approved_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </div>

        <StatusPill status={status} />
      </div>

      {/* ======================================================
          PENDING APPROVAL MESSAGE
      ====================================================== */}

      {isPending && (
        <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container p-3">
          <div className="flex items-start gap-2">
            <span className="text-sm">⏳</span>

            <div>
              <p className="text-xs font-semibold text-on-surface">
                Pending Approval
              </p>

              <p className="text-xs text-on-surface-variant mt-1">
                This objective has been submitted and is waiting for your
                manager or administrator to review it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          APPROVED MESSAGE
      ====================================================== */}

      {isApproved && (
        <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container p-3">
          <div className="flex items-start gap-2">
            <span className="text-sm">✓</span>

            <div>
              <p className="text-xs font-semibold text-on-surface">
                Objective Approved
              </p>

              <p className="text-xs text-on-surface-variant mt-1">
                This PER objective has been approved by your manager or
                administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          REJECTED MESSAGE
      ====================================================== */}

      {isRejected && (
        <div className="mt-4 rounded-lg border border-error/30 bg-error-container/30 p-3">
          <div className="flex items-start gap-2">
            <span className="text-sm">!</span>

            <div>
              <p className="text-xs font-semibold text-on-surface">
                Objective Rejected
              </p>

              <p className="text-xs text-on-surface-variant mt-1">
                Please review your evidence, make the necessary changes, and
                submit the objective again for approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          EDITABLE AREA
      ====================================================== */}

      {editable ? (
        <div className="mt-4">
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            placeholder="Add evidence notes explaining how you achieved this objective..."
            rows={4}
            disabled={saving}
            className="w-full text-xs border border-outline-variant rounded-md px-3 py-2 bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <p className="text-[11px] text-on-surface-variant">
              {notes.trim().length > 0
                ? `${notes.trim().length} characters`
                : "Evidence is required before submitting."}
            </p>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="text-xs font-medium px-3 py-1.5 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && isDraft ? "Saving..." : "Save draft"}
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={saving || !notes.trim()}
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Submitting..." : "Submit for approval"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /*
         * --------------------------------------------------------
         * READ ONLY EVIDENCE
         * --------------------------------------------------------
         */

        existing?.evidence_notes && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
              Evidence
            </p>

            <p className="text-xs text-on-surface-variant whitespace-pre-wrap">
              {existing.evidence_notes}
            </p>
          </div>
        )
      )}

      {/* ======================================================
          SUCCESS MESSAGE
      ====================================================== */}

      {success && (
        <div className="mt-3 text-xs text-on-surface bg-surface-container border border-outline-variant rounded-md px-3 py-2">
          {success}
        </div>
      )}

      {/* ======================================================
          ERROR MESSAGE
      ====================================================== */}

      {error && (
        <div className="mt-3 text-xs text-error bg-error-container/40 border border-error/30 rounded-md px-3 py-2">
          <strong>Couldn&apos;t save:</strong> {error}
        </div>
      )}

      {/* ======================================================
          DRAFT INFORMATION
      ====================================================== */}

      {isDraft && !error && !success && (
        <p className="mt-2 text-[11px] text-on-surface-variant">
          This objective is saved as a draft. Submit it when your evidence is
          ready for manager/admin approval.
        </p>
      )}

      {/* ======================================================
          NOT STARTED INFORMATION
      ====================================================== */}

      {isNotStarted && !readOnly && !error && !success && (
        <p className="mt-2 text-[11px] text-on-surface-variant">
          Add your evidence and submit this objective when it is ready for
          review.
        </p>
      )}
    </div>
  );
}
