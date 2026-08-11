"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
import StatusPill from "@/components/StatusPill";
import { ACCA_OBJECTIVES } from "@/lib/accaObjectives";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string | null;
  manager_id: string | null;
};

type Objective = {
  id: string;
  user_id: string;
  objective_number: number;
  title: string;
  status: string;
  evidence_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
};

type ApprovalRequest = {
  objective: Objective;
  employee: Profile;
};

export default function ApprovalsPage() {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [rejectComment, setRejectComment] = useState("");

  const loadApprovals = async () => {
    setLoading(true);
    setPageError(null);

    try {
      /*
       * ---------------------------------------------------------
       * GET CURRENT AUTH USER
       * ---------------------------------------------------------
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      /*
       * ---------------------------------------------------------
       * GET CURRENT USER PROFILE
       * ---------------------------------------------------------
       */

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, email, role, department, manager_id"
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (!profile) {
        throw new Error("Your profile could not be found.");
      }

      /*
       * Only managers and admins can access approvals.
       */

      if (
        profile.role !== "manager" &&
        profile.role !== "admin"
      ) {
        window.location.href = "/dashboard";
        return;
      }

      setCurrentUser(profile);

      /*
       * ---------------------------------------------------------
       * GET PENDING OBJECTIVES
       * ---------------------------------------------------------
       */

      const {
        data: objectives,
        error: objectivesError,
      } = await supabase
        .from("per_objectives")
        .select(
          "id, user_id, objective_number, title, status, evidence_notes, submitted_at, approved_at, approved_by"
        )
        .eq("status", "pending_approval")
        .order("submitted_at", {
          ascending: true,
        });

      if (objectivesError) {
        throw new Error(objectivesError.message);
      }

      if (!objectives || objectives.length === 0) {
        setRequests([]);
        return;
      }

      /*
       * ---------------------------------------------------------
       * GET EMPLOYEE PROFILES
       * ---------------------------------------------------------
       */

      const userIds = [
        ...new Set(objectives.map((objective) => objective.user_id)),
      ];

      const {
        data: employees,
        error: employeesError,
      } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, email, role, department, manager_id"
        )
        .in("id", userIds);

      if (employeesError) {
        throw new Error(employeesError.message);
      }

      const employeeMap = new Map<string, Profile>();

      (employees ?? []).forEach((employee) => {
        employeeMap.set(employee.id, employee);
      });

      /*
       * ---------------------------------------------------------
       * FILTER REQUESTS
       * ---------------------------------------------------------
       *
       * Admin:
       *   Can see ALL pending requests.
       *
       * Manager:
       *   Can only see employees whose manager_id is the
       *   current manager's user ID.
       */

      const filteredRequests: ApprovalRequest[] = [];

      for (const objective of objectives) {
        const employee = employeeMap.get(objective.user_id);

        if (!employee) {
          continue;
        }

        if (profile.role === "admin") {
          filteredRequests.push({
            objective,
            employee,
          });

          continue;
        }

        if (
          profile.role === "manager" &&
          employee.manager_id === profile.id
        ) {
          filteredRequests.push({
            objective,
            employee,
          });
        }
      }

      setRequests(filteredRequests);
    } catch (error) {
      console.error("Failed to load approvals:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load approval requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  /*
   * -----------------------------------------------------------
   * APPROVE OBJECTIVE
   * -----------------------------------------------------------
   */

  const approveObjective = async (request: ApprovalRequest) => {
    if (!currentUser) return;

    const objective = request.objective;

    setProcessingId(objective.id);
    setPageError(null);

    try {
      /*
       * Update the PER objective.
       */

      const { error: updateError } = await supabase
        .from("per_objectives")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: currentUser.id,
        })
        .eq("id", objective.id)
        .eq("status", "pending_approval");

      if (updateError) {
        throw new Error(updateError.message);
      }

      /*
       * Add approval history record.
       */

      const { error: historyError } = await supabase
        .from("approval_history")
        .insert({
          objective_id: objective.id,
          actor_id: currentUser.id,
          action: "approved",
          comments: null,
        });

      if (historyError) {
        /*
         * Important:
         * The objective is already approved at this point.
         *
         * We show the history error instead of pretending
         * everything succeeded.
         */

        throw new Error(
          `Objective was approved, but approval history could not be recorded: ${historyError.message}`
        );
      }

      /*
       * Remove it from the pending list immediately.
       */

      setRequests((previous) =>
        previous.filter(
          (item) => item.objective.id !== objective.id
        )
      );
    } catch (error) {
      console.error("Approval failed:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to approve this objective."
      );
    } finally {
      setProcessingId(null);
    }
  };

  /*
   * -----------------------------------------------------------
   * START REJECTING
   * -----------------------------------------------------------
   */

  const startReject = (objectiveId: string) => {
    setRejectingId(objectiveId);
    setRejectComment("");
    setPageError(null);
  };

  /*
   * -----------------------------------------------------------
   * CANCEL REJECTION
   * -----------------------------------------------------------
   */

  const cancelReject = () => {
    setRejectingId(null);
    setRejectComment("");
  };

  /*
   * -----------------------------------------------------------
   * REJECT OBJECTIVE
   * -----------------------------------------------------------
   */

  const rejectObjective = async (request: ApprovalRequest) => {
    if (!currentUser) return;

    const objective = request.objective;

    if (!rejectComment.trim()) {
      setPageError(
        "Please enter a reason before rejecting the objective."
      );
      return;
    }

    setProcessingId(objective.id);
    setPageError(null);

    try {
      /*
       * Update PER objective.
       */

      const { error: updateError } = await supabase
        .from("per_objectives")
        .update({
          status: "rejected",
          approved_at: null,
          approved_by: null,
        })
        .eq("id", objective.id)
        .eq("status", "pending_approval");

      if (updateError) {
        throw new Error(updateError.message);
      }

      /*
       * Add rejection history.
       */

      const { error: historyError } = await supabase
        .from("approval_history")
        .insert({
          objective_id: objective.id,
          actor_id: currentUser.id,
          action: "rejected",
          comments: rejectComment.trim(),
        });

      if (historyError) {
        throw new Error(
          `Objective was rejected, but rejection history could not be recorded: ${historyError.message}`
        );
      }

      /*
       * Remove from pending list.
       */

      setRequests((previous) =>
        previous.filter(
          (item) => item.objective.id !== objective.id
        )
      );

      setRejectingId(null);
      setRejectComment("");
    } catch (error) {
      console.error("Rejection failed:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to reject this objective."
      );
    } finally {
      setProcessingId(null);
    }
  };

  /*
   * -----------------------------------------------------------
   * GET OBJECTIVE CATEGORY
   * -----------------------------------------------------------
   */

  const getObjectiveMeta = (number: number) => {
    return ACCA_OBJECTIVES.find(
      (objective) => objective.number === number
    );
  };

  /*
   * -----------------------------------------------------------
   * LOADING
   * -----------------------------------------------------------
   */

  if (loading) {
    return (
      <div>
        <Nav
          role={currentUser?.role ?? "manager"}
          name={
            currentUser
              ? `${currentUser.first_name} ${currentUser.last_name}`
              : ""
          }
        />

        <main className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-on-surface-variant">
            Loading approval requests...
          </p>
        </main>
      </div>
    );
  }

  /*
   * -----------------------------------------------------------
   * PAGE
   * -----------------------------------------------------------
   */

  return (
    <div>
      <Nav
        role={currentUser?.role ?? "manager"}
        name={
          currentUser
            ? `${currentUser.first_name} ${currentUser.last_name}`
            : ""
        }
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              PER Approvals
            </h1>

            <p className="text-sm text-on-surface-variant mt-1">
              Review employee PER objectives submitted for approval.
            </p>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-lg px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Pending Requests
            </p>

            <p className="text-2xl font-extrabold text-primary">
              {requests.length}
            </p>
          </div>
        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {pageError && (
          <div className="mb-6 text-sm text-error bg-error-container/40 border border-error/30 rounded-lg px-4 py-3">
            <strong>Error:</strong> {pageError}
          </div>
        )}

        {/* =====================================================
            NO REQUESTS
        ===================================================== */}

        {requests.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
            <p className="text-lg font-semibold text-on-surface">
              No pending approvals
            </p>

            <p className="text-sm text-on-surface-variant mt-2">
              There are currently no PER objectives waiting for your
              review.
            </p>
          </div>
        ) : (
          /*
           * =====================================================
           * REQUEST LIST
           * =====================================================
           */

          <div className="space-y-5">
            {requests.map((request) => {
              const objective = request.objective;
              const employee = request.employee;
              const meta = getObjectiveMeta(
                objective.objective_number
              );

              const isProcessing =
                processingId === objective.id;

              const isRejecting =
                rejectingId === objective.id;

              return (
                <div
                  key={objective.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"
                >
                  {/* =================================================
                      EMPLOYEE HEADER
                  ================================================= */}

                  <div className="px-5 py-4 bg-surface-container border-b border-outline-variant">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {employee.first_name}{" "}
                          {employee.last_name}
                        </p>

                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {employee.email}
                        </p>

                        {employee.department && (
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Department:{" "}
                            {employee.department}
                          </p>
                        )}
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-[10px] uppercase font-bold tracking-wide text-on-surface-variant">
                          Submitted
                        </p>

                        <p className="text-xs font-medium text-on-surface mt-1">
                          {objective.submitted_at
                            ? new Date(
                                objective.submitted_at
                              ).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* =================================================
                      OBJECTIVE CONTENT
                  ================================================= */}

                  <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-on-surface">
                            Objective{" "}
                            {objective.objective_number}
                          </p>

                          {meta?.essential && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Essential
                            </span>
                          )}

                          {meta && !meta.essential && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                              {meta.category}
                            </span>
                          )}
                        </div>

                        <h2 className="text-base font-semibold text-on-surface mt-1">
                          {objective.title}
                        </h2>
                      </div>

                      <StatusPill status={objective.status} />
                    </div>

                    {/* =================================================
                        EVIDENCE
                    ================================================= */}

                    <div className="mt-5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant mb-2">
                        Employee Evidence
                      </p>

                      <div className="rounded-lg border border-outline-variant bg-background p-4">
                        {objective.evidence_notes ? (
                          <p className="text-sm text-on-surface whitespace-pre-wrap">
                            {objective.evidence_notes}
                          </p>
                        ) : (
                          <p className="text-sm italic text-on-surface-variant">
                            No evidence notes provided.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* =================================================
                        REJECT FORM
                    ================================================= */}

                    {isRejecting && (
                      <div className="mt-5 rounded-lg border border-error/30 bg-error-container/20 p-4">
                        <p className="text-sm font-semibold text-on-surface">
                          Reason for rejection
                        </p>

                        <p className="text-xs text-on-surface-variant mt-1 mb-3">
                          Explain what the employee needs to change
                          before resubmitting this objective.
                        </p>

                        <textarea
                          value={rejectComment}
                          onChange={(event) =>
                            setRejectComment(
                              event.target.value
                            )
                          }
                          rows={4}
                          disabled={isProcessing}
                          placeholder="Enter rejection reason..."
                          className="w-full text-sm border border-outline-variant rounded-md px-3 py-2 bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        />

                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            type="button"
                            onClick={cancelReject}
                            disabled={isProcessing}
                            className="text-xs font-medium px-3 py-2 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              rejectObjective(request)
                            }
                            disabled={
                              isProcessing ||
                              !rejectComment.trim()
                            }
                            className="text-xs font-semibold px-4 py-2 rounded-md bg-error text-on-error hover:opacity-90 disabled:opacity-50"
                          >
                            {isProcessing
                              ? "Rejecting..."
                              : "Confirm Rejection"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    {!isRejecting && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 pt-5 border-t border-outline-variant">
                        <p className="text-xs text-on-surface-variant">
                          Review the evidence before making a
                          decision.
                        </p>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              startReject(objective.id)
                            }
                            disabled={isProcessing}
                            className="text-xs font-semibold px-4 py-2 rounded-md border border-error/40 text-error hover:bg-error-container/30 disabled:opacity-50"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              approveObjective(request)
                            }
                            disabled={isProcessing}
                            className="text-xs font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
                          >
                            {isProcessing
                              ? "Processing..."
                              : "Approve"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
