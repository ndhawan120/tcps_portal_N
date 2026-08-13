"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;

export default function BrandingPage() {
  const supabase = createClient();
  const [name, setName] = useState("TC Professional Services");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("portal_settings").select("company_name,logo_url").eq("id", true).maybeSingle().then(({ data }) => {
      if (data) { setName(data.company_name || "TC Professional Services"); setLogoUrl(data.logo_url); }
    });
  }, []);

  const handleFile = (selected?: File) => {
    setMessage(null); setError(null);
    if (!selected) { setFile(null); return; }
    if (!selected.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (selected.size > MAX_LOGO_SIZE) { setError("Logo must be 2 MB or smaller."); return; }
    setFile(selected);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null);
    let nextLogoUrl = logoUrl;
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `tcps-logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("portal-branding").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploadError) { setSaving(false); setError(uploadError.message); return; }
      nextLogoUrl = supabase.storage.from("portal-branding").getPublicUrl(path).data.publicUrl;
    }
    const cleanName = name.trim() || "TC Professional Services";
    const { error: updateError } = await supabase.from("portal_settings").upsert({ id: true, company_name: cleanName, logo_url: nextLogoUrl, updated_at: new Date().toISOString() });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setLogoUrl(nextLogoUrl); setFile(null); setName(cleanName); setMessage("Branding updated successfully. Refresh the portal to see the new logo.");
  };

  return <div><Nav role="admin" name="Administrator" /><main className="max-w-4xl mx-auto px-6 py-8"><Link href="/admin" className="text-xs font-semibold text-primary hover:underline">← Back to Admin</Link><div className="mt-5 mb-6"><h1 className="text-2xl font-bold text-on-surface">Branding</h1><p className="text-sm text-on-surface-variant mt-1">Manage the TC Professional Services name and logo shown across the portal.</p></div><form onSubmit={save} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-6"><div><label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Company name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full max-w-xl rounded-md border border-outline-variant bg-background px-3 py-2 text-sm" /></div><div><label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">TC Professional Services logo</label><div className="flex flex-col sm:flex-row gap-5 sm:items-center"><div className="w-64 h-28 rounded-md bg-[#191919] flex items-center justify-center p-4 border border-outline-variant">{logoUrl ? <img src={logoUrl} alt="TC Professional Services logo" className="max-h-20 max-w-full object-contain" /> : <span className="text-lg font-extrabold text-primary">TC<span className="text-white">PS</span></span>}</div><div><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => handleFile(e.target.files?.[0])} className="block text-xs" /><p className="text-[11px] text-on-surface-variant mt-2">PNG, JPG, WEBP or SVG · maximum 2 MB.</p>{file && <p className="text-xs text-on-surface mt-2">Selected: {file.name}</p>}</div></div></div>{error && <p className="text-sm text-error bg-error-container/40 border border-error/30 rounded-md p-3">{error}</p>}{message && <p className="text-sm text-on-surface-variant bg-surface-container rounded-md p-3">{message}</p>}<button type="submit" disabled={saving} className="bg-primary text-on-primary rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Saving..." : "Save branding"}</button></form></main></div>;
}
