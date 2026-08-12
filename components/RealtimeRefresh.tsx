"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps reporting/navigation surfaces current when portal data changes.
 * Announcement changes are included so the dashboard/updates surfaces do
 * not remain stale after an announcement is created, edited or deleted.
 */
export default function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      // Coalesce bursts of database events into one refresh.
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        router.refresh();
      }, 150);
    };

    const channel = supabase
      .channel("tc-group-reporting")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "per_objectives" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_history" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, refresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
