"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const inactiveNotice =
    searchParams.get("error") === "account_inactive";

  const pendingNotice =
    searchParams.get("error") === "account_pending";

  const rejectedNotice =
    searchParams.get("error") === "account_rejected";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setLoading(false);
      setError(loginError.message);
      return;
    }

    if (!data.user) {
      setLoading(false);
      setError("Unable to authenticate.");
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("status, role")
        .eq("id", data.user.id)
        .single();

    if (profileError) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        "Your account profile could not be loaded. Please contact an administrator."
      );
      return;
    }

    if (profile.status === "pending") {
      await supabase.auth.signOut();

      setLoading(false);

      router.push("/login?error=account_pending");
      router.refresh();

      return;
    }

    if (profile.status === "rejected") {
      await supabase.auth.signOut();

      setLoading(false);

      router.push("/login?error=account_rejected");
      router.refresh();

      return;
    }

    if (profile.status === "inactive") {
      await supabase.auth.signOut();

      setLoading(false);

      router.push("/login?error=account_inactive");
      router.refresh();

      return;
    }

    setLoading(false);

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant">

        <h1 className="text-2xl font-extrabold text-on-surface mb-1">
          TC Group
        </h1>

        <p className="text-sm text-on-surface-variant mb-6">
          Professional Development Portal
        </p>

        {inactiveNotice && (
          <p className="text-sm text-error bg-error-container/40 border border-error/30 rounded-md px-3 py-2 mb-4">
            This account is inactive. Please contact your administrator.
          </p>
        )}

        {pendingNotice && (
          <p className="text-sm text-on-surface bg-surface-container border border-outline-variant rounded-md px-3 py-2 mb-4">
            Your account has been created successfully and is waiting for administrator approval.
          </p>
        )}

        {rejectedNotice && (
          <p className="text-sm text-error bg-error-container/40 border border-error/30 rounded-md px-3 py-2 mb-4">
            Your account registration was not approved. Please contact your administrator.
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>

            <div className="flex items-center justify-between mb-1">

              <label className="block text-sm font-medium text-on-surface">
                Password
              </label>

              <a
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </a>

            </div>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

          </div>

          {error && (
            <p className="text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary rounded-md py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

        </form>

        <p className="text-sm text-on-surface-variant mt-4 text-center">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </a>
        </p>

      </div>
    </div>
  );
}
