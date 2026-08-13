"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const fallbackLogo = "/tc-professional-services-logo.svg";

export default function BrandLogo() {
  const [logoUrl, setLogoUrl] = useState(fallbackLogo);

  useEffect(() => {
    const loadLogo = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("portal_settings").select("logo_url").eq("id", 1).maybeSingle();
      if (data?.logo_url) setLogoUrl(data.logo_url);
    };
    loadLogo();
  }, []);

  return <img src={logoUrl} alt="TC Professional Services" className="h-14 w-auto max-w-[260px] object-contain" />;
}
