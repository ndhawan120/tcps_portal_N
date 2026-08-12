import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Unauthorised" }, { status: 401 }), user: null };
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (actor?.role !== "admin") return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }), user: null };
  return { response: null, user };
}

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) throw new Error("Server administration is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.");
  return createSupabaseAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  if (!params.userId || params.userId === auth.user!.id) return NextResponse.json({ error: "Use your own Profile page to edit your account." }, { status: 400 });

  let body: { first_name?: string; last_name?: string; department?: string | null; joining_date?: string | null };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const first_name = body.first_name?.trim() ?? "";
  const last_name = body.last_name?.trim() ?? "";
  if (!first_name || !last_name) return NextResponse.json({ error: "First name and last name are required." }, { status: 400 });

  try {
    const admin = adminClient();
    const { error } = await admin.from("profiles").update({ first_name, last_name, department: body.department?.trim() || null, joining_date: body.joining_date || null }).eq("id", params.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update profile." }, { status: 500 }); }
}

export async function DELETE(_request: Request, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  if (!params.userId || params.userId === auth.user!.id) return NextResponse.json({ error: "You cannot delete your own account from this screen." }, { status: 400 });

  try {
    const admin = adminClient();
    const { data: target } = await admin.from("profiles").select("id, role").eq("id", params.userId).single();
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "admin") return NextResponse.json({ error: "Admin accounts cannot be deleted from the employee directory." }, { status: 400 });

    const { error } = await admin.auth.admin.deleteUser(params.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete user." }, { status: 500 }); }
}
