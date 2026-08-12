"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

const MAX_IMAGE_SIZE = 50 * 1024;

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string | null;
  job_title: string | null;
  phone: string | null;
  joining_date: string | null;
  avatar_url: string | null;
  status: string;
  last_login: string | null;
};

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    department: "",
    job_title: "",
    joining_date: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setProfile(data as Profile);
      setForm({
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        phone: data.phone ?? "",
        department: data.department ?? "",
        job_title: data.job_title ?? "",
        joining_date: data.joining_date ?? "",
        avatar_url: data.avatar_url ?? "",
      });
      setLoading(false);
    })();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();

    if (!firstName || !lastName) {
      setSaving(false);
      setError("First name and last name are required.");
      return;
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: form.phone.trim() || null,
        department: form.department.trim() || null,
        job_title: form.job_title.trim() || null,
        joining_date: form.joining_date || null,
        avatar_url: form.avatar_url || null,
      })
      .eq("id", profile.id)
      .select("*")
      .single();

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfile(data as Profile);
    setMessage("Profile updated successfully.");
  };

  const handleImage = (file?: File) => {
    setError(null);
    setMessage(null);
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Profile image must be 50 KB or smaller.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((value) => ({
        ...value,
        avatar_url: String(reader.result ?? ""),
      }));
    };
    reader.onerror = () => setError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <main className="p-8 text-sm text-on-surface-variant">Loading profile...</main>;
  }

  if (!profile) {
    return <main className="p-8 text-sm text-error">Unable to load profile.</main>;
  }

  return (
    <div>
      <Nav
        role={profile.role}
        name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()}
      />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-on-surface">My Profile</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Keep your professional information up to date.
          </p>
        </div>

        <form onSubmit={save} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 rounded-full border border-outline-variant overflow-hidden bg-surface-container flex items-center justify-center shrink-0">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-primary">
                  {form.first_name?.[0] ?? "?"}
                </span>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-on-surface">Profile image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => handleImage(event.target.files?.[0])}
                className="block text-xs mt-2"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">PNG, JPG, WEBP or GIF · maximum 50 KB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" value={form.first_name} onChange={(value) => setForm({ ...form, first_name: value })} required />
            <Field label="Last name" value={form.last_name} onChange={(value) => setForm({ ...form, last_name: value })} required />
            <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            <Field label="Job title" value={form.job_title} onChange={(value) => setForm({ ...form, job_title: value })} />
            <Field label="Department" value={form.department} onChange={(value) => setForm({ ...form, department: value })} />
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Joining date</label>
              <input
                type="date"
                value={form.joining_date}
                onChange={(event) => setForm({ ...form, joining_date: event.target.value })}
                className="w-full border border-outline-variant rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" value={profile.email ?? ""} onChange={() => {}} disabled />
            <Field label="Role" value={profile.role ?? ""} onChange={() => {}} disabled />
            <Field label="Account status" value={profile.status ?? ""} onChange={() => {}} disabled />
            <Field
              label="Last login"
              value={profile.last_login ? new Date(profile.last_login).toLocaleString() : "Not available"}
              onChange={() => {}}
              disabled
            />
          </div>

          {error && <p className="text-sm text-error bg-error-container/40 border border-error/30 rounded-md p-3">{error}</p>}
          {message && <p className="text-sm text-on-surface-variant bg-surface-container rounded-md p-3">{message}</p>}

          <button disabled={saving} className="bg-primary text-on-primary rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50">
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{label}</label>
      <input
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-outline-variant rounded-md px-3 py-2 text-sm bg-background disabled:opacity-60"
      />
    </div>
  );
}
