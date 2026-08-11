import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import AnnouncementsList, { Announcement } from "@/components/AnnouncementsList";
import PostAnnouncementForm from "@/components/PostAnnouncementForm";

export default async function AnnouncementsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: raw } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, author_id, profiles!announcements_author_id_fkey(first_name,last_name)")
    .order("created_at", { ascending: false });

  const announcements: Announcement[] = (raw ?? []).map((a: any) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    created_at: a.created_at,
    author_id: a.author_id,
    author_name: `${a.profiles?.first_name ?? ""} ${a.profiles?.last_name ?? ""}`.trim(),
  }));

  const canPost = profile?.role === "manager" || profile?.role === "admin";

  return (
    <div>
      <Nav role={profile?.role ?? "employee"} name={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-1">Updates</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          News and updates from TC Group management — exam deadlines, ACCA
          announcements, and general tips.
        </p>

        {canPost && <PostAnnouncementForm userId={user.id} />}

        <AnnouncementsList
          announcements={announcements}
          currentUserId={user.id}
          canDeleteAny={profile?.role === "admin"}
        />
      </main>
    </div>
  );
}
