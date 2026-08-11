"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENTS } from "@/lib/departments";

export default function AddUserModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "invite">("invite");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [role, setRole] = useState("employee");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setDepartment(DEPARTMENTS[0]);
    setRole("employee");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: mode === "password" ? password : undefined,
        firstName,
        lastName,
        department,
        role,
        sendInvite: mode === "invite",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90"
      >
        + Add User
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md p-6 border border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-on-surface">Add User</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode("invite")}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md border ${
                  mode === "invite"
                    ? "bg-primary text-on-primary border-primary"
                    : "border-outline-variant text-on-surface"
                }`}
              >
                Email invite
              </button>
              <button
                type="button"
                onClick={() => setMode("password")}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md border ${
                  mode === "password"
                    ? "bg-primary text-on-primary border-primary"
                    : "border-outline-variant text-on-surface"
                }`}
              >
                Set password
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              {mode === "invite"
                ? "They'll receive an email to set their own password."
                : "You choose their password directly \u2014 share it with them yourself."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="flex-1 rounded-md border border-outline-variant px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="flex-1 rounded-md border border-outline-variant px-3 py-2 text-sm"
                />
              </div>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
              />
              {mode === "password" && (
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Temporary password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
                />
              )}
              <div className="flex gap-3">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="flex-1 rounded-md border border-outline-variant px-3 py-2 text-sm bg-surface-container-lowest"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex-1 rounded-md border border-outline-variant px-3 py-2 text-sm bg-surface-container-lowest"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary rounded-md py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create user"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
