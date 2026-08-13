"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    const { data, error: signupError } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName } } });
    setLoading(false);
    if (signupError) { setError(signupError.message); return; }
    if (data.session) await supabase.auth.signOut();
    setSuccess(true);
  };

  if (success) return <div className="min-h-screen flex items-center justify-center bg-background px-4"><div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant text-center"><h1 className="text-xl font-bold text-on-surface mb-3">Registration submitted</h1><p className="text-sm text-on-surface-variant mb-4">Your account has been created and submitted to the TC Professional Services administrator for approval.</p><p className="text-sm text-on-surface-variant mb-6">You will be able to log in once your registration has been approved.</p><Link href="/login" className="inline-block bg-primary text-on-primary rounded-md px-5 py-2 text-sm font-semibold">Go to Login</Link></div></div>;

  return <div className="min-h-screen flex items-center justify-center bg-background px-4"><div className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant"><h1 className="text-2xl font-extrabold text-on-surface mb-1">TC Professional Services</h1><p className="text-sm text-on-surface-variant mb-6">Create your account</p><form onSubmit={handleSignup} className="space-y-4"><div className="flex gap-3"><div className="flex-1"><label className="block text-sm font-medium text-on-surface mb-1">First name</label><input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm" /></div><div className="flex-1"><label className="block text-sm font-medium text-on-surface mb-1">Last name</label><input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm" /></div></div><div><label className="block text-sm font-medium text-on-surface mb-1">Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium text-on-surface mb-1">Password</label><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm" /><p className="text-[11px] text-on-surface-variant mt-1">Minimum 8 characters.</p></div>{error && <p className="text-sm text-error">{error}</p>}<button type="submit" disabled={loading} className="w-full bg-primary text-on-primary rounded-md py-2 text-sm font-semibold disabled:opacity-50">{loading ? "Submitting..." : "Create account"}</button></form><p className="text-sm text-on-surface-variant mt-4 text-center">Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link></p></div></div>;
}
