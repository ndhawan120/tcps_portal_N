"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordClient() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const initialiseRecovery = async () => {
      setError(null);
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError("This password reset link is invalid or has expired. Please request a new reset link.");
          return;
        }
        if (active) setReady(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (active) setReady(true);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          if (active) setReady(true);
        }
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    };

    initialiseRecovery();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [searchParams, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login?reset=success"), 800);
  };

  return <div className="min-h-screen flex items-center justify-center bg-background px-4"><div className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant"><h1 className="text-2xl font-extrabold text-on-surface mb-1">TC Professional Services</h1><p className="text-sm text-on-surface-variant mb-6">Choose a new password</p>{!ready && !success && !error && <p className="text-sm text-on-surface-variant">Validating your password reset link...</p>}{error && !ready && <div className="space-y-4"><p className="text-sm text-error">{error}</p><Link href="/forgot-password" className="block w-full text-center bg-primary text-on-primary rounded-md py-2 text-sm font-semibold">Request a new reset link</Link></div>}{ready && !success && <form onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-sm font-medium text-on-surface mb-1">New password</label><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm" autoFocus /></div><div><label className="block text-sm font-medium text-on-surface mb-1">Confirm password</label><input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm" /></div>{error && <p className="text-sm text-error">{error}</p>}<button type="submit" disabled={loading} className="w-full bg-primary text-on-primary rounded-md py-2 text-sm font-semibold disabled:opacity-50">{loading ? "Saving..." : "Set new password"}</button></form>}{success && <div className="space-y-3"><p className="text-sm text-emerald-700">Password updated successfully.</p><p className="text-xs text-on-surface-variant">You can now sign in with your new password.</p></div>}<p className="text-sm text-on-surface-variant mt-4 text-center"><Link href="/login" className="text-primary font-medium hover:underline">Back to login</Link></p></div></div>;
}
