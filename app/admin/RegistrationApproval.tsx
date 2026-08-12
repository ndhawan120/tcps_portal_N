"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PendingUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  created_at: string;
};

export default function RegistrationApproval({
  users,
}: {
  users: PendingUser[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const decide = async (
    userId: string,
    status: "active" | "rejected"
  ) => {
    setLoadingId(userId);
    setError(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        status,
      })
      .eq("id", userId);

    setLoadingId(null);

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh();
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-8">

      <div className="px-5 py-5 border-b border-outline-variant">
        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-lg font-bold text-on-surface">
              Pending Registrations
            </h2>

            <p className="text-xs text-on-surface-variant mt-1">
              New users must be approved before they can access the portal.
            </p>
          </div>

          <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
            {users.length} pending
          </span>

        </div>
      </div>

      {error && (
        <p className="m-4 text-sm text-error bg-error-container/40 border border-error/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {users.length === 0 ? (
        <p className="px-5 py-6 text-sm text-on-surface-variant">
          No new registrations are waiting for approval.
        </p>
      ) : (
        <div className="divide-y divide-outline-variant">

          {users.map((user) => (
            <div
              key={user.id}
              className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >

              <div>

                <p className="text-sm font-semibold text-on-surface">
                  {user.first_name} {user.last_name}
                </p>

                <p className="text-xs text-on-surface-variant">
                  {user.email}
                </p>

                <p className="text-xs text-on-surface-variant mt-1">
                  {user.department || "Department not assigned"}
                  {" · "}
                  Registered{" "}
                  {new Date(
                    user.created_at
                  ).toLocaleDateString()}
                </p>

              </div>

              <div className="flex gap-2">

                <button
                  disabled={loadingId === user.id}
                  onClick={() =>
                    decide(user.id, "active")
                  }
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-on-primary disabled:opacity-50"
                >
                  {loadingId === user.id
                    ? "Saving..."
                    : "Approve"}
                </button>

                <button
                  disabled={loadingId === user.id}
                  onClick={() =>
                    decide(user.id, "rejected")
                  }
                  className="text-xs font-semibold px-3 py-1.5 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-50"
                >
                  Reject
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}
