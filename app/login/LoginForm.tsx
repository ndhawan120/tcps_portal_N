"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_LOGO_URL = "https://xgmyasdoulblikhxaehg.supabase.co/storage/v1/object/public/portal-branding/tcps-logo.png";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const inactiveNotice = searchParams.get("error") === "account_inactive";
  const pendingNotice = searchParams.get("error") === "account_pending";
  const rejectedNotice = searchParams.get("error") === "account_rejected";

  useEffect(() => {
    const loadBranding = async () => {
      const { data } = await supabase.from("portal_settings").select("logo_url").eq("id", 1).maybeSingle();
      if (data?.logo_url) setLogoUrl(data.logo_url);
    };
    loadBranding();
  }, [supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (loginError) {
      setLoading(false);
      const message = loginError.message.toLowerCase();
      setError(message.includes("invalid login credentials") || message.includes("invalid credentials")
        ? "Email or password is incorrect. If you recently received approval, use the password you created during signup. If you do not remember it, use Forgot password? to create a new one."
        : loginError.message);
      return;
    }
    if (!data.user) { setLoading(false); setError("Unable to authenticate."); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("status, role").eq("id", data.user.id).single();
    if (profileError) { await supabase.auth.signOut(); setLoading(false); setError("Your account profile could not be loaded. Please contact an administrator."); return; }
    if (["pending", "rejected", "inactive"].includes(profile.status)) { await supabase.auth.signOut(); setLoading(false); router.push(`/login?error=account_${profile.status}`); router.refresh(); return; }
    await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", data.user.id);
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl min-h-[680px] grid lg:grid-cols-2 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xl">
        <section className="hidden lg:flex flex-col items-center justify-center bg-on-surface p-12 text-white text-center">
          <div className="w-full max-w-lg flex flex-col items-center">
            <img src={logoUrl} alt="TC Professional Services" className="h-24 w-auto max-w-[420px] object-contain mb-12" />
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Professional Development Portal</p>
            <h1 className="text-4xl font-extrabold leading-tight">Develop people. Build expertise. Grow together.</h1>
            <p className="mt-6 text-sm leading-6 text-white/70 max-w-md">Access your professional development, objectives, exams, approvals and company updates in one place.</p>
          </div>
        </section>
        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-16">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8 text-center">
              <div className="lg:hidden mb-8 flex justify-center"><img src={logoUrl} alt="TC Professional Services" className="h-20 w-auto max-w-[320px] object-contain" /></div>
              <h2 className="text-2xl font-extrabold text-on-surface">Welcome back</h2>
              <p className="mt-2 text-sm text-on-surface-variant">Sign in to your professional development portal.</p>
            </div>
            {inactiveNotice && <p className="text-sm text-error bg-error-container/40 border border-error/30 rounded-md px-3 py-2 mb-4 text-center">This account is inactive. Please contact your administrator.</p>}
            {pendingNotice && <p className="text-sm text-on-surface bg-surface-container border border-outline-variant rounded-md px-3 py-2 mb-4 text-center">Your account has been created successfully and is waiting for administrator approval.</p>}
            {rejectedNotice && <p className="text-sm text-error bg-error-container/40 border border-error/30 rounded-md px-3 py-2 mb-4 text-center">Your account registration was not approved. Please contact your administrator.</p>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="block text-sm font-medium text-on-surface mb-1">Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-outline-variant bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></div>
              <div><div className="flex items-center justify-between mb-1"><label className="block text-sm font-medium text-on-surface">Password</label><a href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</a></div><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-outline-variant bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></div>
              {error && <div className="text-sm text-error bg-error-container/30 border border-error/20 rounded-md px-3 py-2.5 text-center"><p>{error}</p><a href="/forgot-password" className="inline-block mt-1 font-semibold text-primary hover:underline">Reset your password</a></div>}
              <button type="submit" disabled={loading} className="w-full bg-primary text-on-primary rounded-md py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50">{loading ? "Signing in..." : "Sign in"}</button>
            </form>
            <p className="text-sm text-on-surface-variant mt-5 text-center">Don&apos;t have an account? <a href="/signup" className="text-primary font-medium hover:underline">Sign up</a></p>
          </div>
        </section>
      </div>
    </main>
  );
}
