"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DirectEvidenceUpload({ objectiveId, userId, currentUrl }: { objectiveId: string; userId: string; currentUrl?: string | null }) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(currentUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const upload = async (file: File) => {
    setUploading(true); setMessage(null); setError(null);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("File must be 10 MB or smaller.");
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      const path = `${userId}/${objectiveId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("per-evidence").upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("per-evidence").getPublicUrl(path);
      const { error: dbError } = await supabase.from("per_objectives").update({ evidence_file_url: data.publicUrl }).eq("id", objectiveId).eq("user_id", userId);
      if (dbError) throw dbError;
      setUrl(data.publicUrl); setMessage("Document uploaded.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to upload document."); }
    finally { setUploading(false); }
  };
  return <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container-low p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Supporting document</p>{url && <a href={url} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-semibold text-primary hover:underline">View uploaded document →</a>}<label className="mt-2 inline-flex cursor-pointer items-center rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs font-semibold hover:bg-surface-container">{uploading ? "Uploading..." : url ? "Replace document" : "Upload document"}<input type="file" className="sr-only" disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.currentTarget.value = ""; }} /></label>{message && <p className="mt-2 text-[11px] text-on-surface-variant">✓ {message}</p>}{error && <p className="mt-2 text-[11px] text-error">{error}</p>}</div>;
}
