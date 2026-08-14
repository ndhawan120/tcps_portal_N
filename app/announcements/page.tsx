import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import AnnouncementsList, { Announcement } from "@/components/AnnouncementsList";
import PostAnnouncementForm from "@/components/PostAnnouncementForm";

export default async function AnnouncementsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: raw } = await supabase.from("announcements").select("id,title,body,created_at,author_id,source_type,source_url,published_at,excerpt").order("created_at", { ascending: false });
  const authorIds = Array.from(new Set((raw ?? []).map((a: any) => a.author_id).filter(Boolean)));
  const { data: authors } = authorIds.length ? await supabase.from("profiles").select("id,first_name,last_name,email").in("id", authorIds) : { data: [] as any[] };
  const authorMap = new Map((authors ?? []).map((p: any) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "TC Group Management"]));
  const announcements: Announcement[] = (raw ?? []).map((a: any) => ({
    id: a.id, title: a.title, body: a.body, created_at: a.published_at ?? a.created_at, author_id: a.author_id,
    author_name: a.source_type === "acca" ? "ACCA" : (authorMap.get(a.author_id) ?? "TC Group Management"),
    source_type: a.source_type ?? "tcps", source_url: a.source_url ?? null, excerpt: a.excerpt ?? null,
  }));
  const canPost = profile?.role === "manager" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  return <div><Nav role={profile?.role ?? "employee"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} /><main className="max-w-3xl mx-auto px-6 py-8">
    <h1 className="text-2xl font-bold text-on-surface mb-1">Updates</h1>
    <p className="text-sm text-on-surface-variant mb-6">News and updates from TC Group management, including automatically synced ACCA announcements.</p>
    {canPost && <PostAnnouncementForm userId={user.id} />}
    <AnnouncementsList announcements={announcements} currentUserId={user.id} canEditAny={isAdmin} canDeleteAny={isAdmin} />
  </main></div>;
}
