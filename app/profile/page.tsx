"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", department: "", job_title: "", joining_date: "", avatar_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) { setError(error.message); setLoading(false); return; }
      setProfile(data);
      setForm({ first_name: data.first_name ?? "", last_name: data.last_name ?? "", phone: data.phone ?? "", department: data.department ?? "", job_title: data.job_title ?? "", joining_date: data.joining_date ?? "", avatar_url: data.avatar_url ?? "" });
      setLoading(false);
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null); setMessage(null);
    const { error } = await supabase.from("profiles").update({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone: form.phone.trim() || null, department: form.department.trim() || null, job_title: form.job_title.trim() || null, joining_date: form.joining_date || null, avatar_url: form.avatar_url || null }).eq("id", profile.id);
    setSaving(false);
    if (error) setError(error.message); else { setMessage("Profile updated successfully."); setProfile({ ...profile, ...form }); }
  };

  const handleImage = (file?: File) => {
    if (!file) return;
    if (file.size > 50 * 1024) { setError("Profile image must be 50 KB or smaller."); return; }
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(v => ({ ...v, avatar_url: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  if (loading) return <main className="p-8 text-sm text-on-surface-variant">Loading profile...</main>;
  if (!profile) return <main className="p-8 text-sm text-error">Unable to load profile.</main>;

  return <div><Nav role={profile.role} name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`} /><main className="max-w-3xl mx-auto px-6 py-8"><h1 className="text-2xl font-bold text-on-surface">My Profile</h1><p className="text-sm text-on-surface-variant mt-1 mb-6">Keep your employee information up to date.</p>
    <form onSubmit={save} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-4"><div className="w-20 h-20 rounded-full border border-outline-variant overflow-hidden bg-surface-container flex items-center justify-center">{form.avatar_url ? <img src={form.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-primary">{form.first_name?.[0] ?? "?"}</span>}</div><div><label className="text-sm font-semibold text-on-surface">Profile image</label><input type="file" accept="image/*" onChange={e => handleImage(e.target.files?.[0])} className="block text-xs mt-2" /><p className="text-[11px] text-on-surface-variant mt-1">Maximum 50 KB.</p></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="First name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} required /><Field label="Last name" value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} required /><Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} /><Field label="Job title" value={form.job_title} onChange={v => setForm({ ...form, job_title: v })} /><Field label="Department" value={form.department} onChange={v => setForm({ ...form, department: v })} /><div><label className="block text-xs font-semibold text-on-surface-variant mb-1">Joining date</label><input type="date" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} className="w-full border border-outline-variant rounded-md px-3 py-2 text-sm bg-background" /></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="Email" value={profile.email ?? ""} onChange={() => {}} disabled /><Field label="Role" value={profile.role ?? ""} onChange={() => {}} disabled /></div>
      {error && <p className="text-sm text-error bg-error-container/40 border border-error/30 rounded-md p-3">{error}</p>}{message && <p className="text-sm text-on-surface-variant bg-surface-container rounded-md p-3">{message}</p>}
      <button disabled={saving} className="bg-primary text-on-primary rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Saving..." : "Save profile"}</button>
    </form></main></div>;
}

function Field({ label, value, onChange, required = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean }) { return <div><label className="block text-xs font-semibold text-on-surface-variant mb-1">{label}</label><input required={required} disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="w-full border border-outline-variant rounded-md px-3 py-2 text-sm bg-background disabled:opacity-60" /></div>; }
