"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tc-group-reporting")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "per_objectives" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_history" }, () => router.refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  return null;
}
