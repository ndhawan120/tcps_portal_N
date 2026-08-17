import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Unauthorised" }, { status: 401 }), user: null };
  const { data: actor } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (actor?.role !== "admin" || actor.status !== "active") return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }), user: null };
  return { response: null, user };
}

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) throw new Error("Server administration is not configured.");
  return createSupabaseAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  let body: { status?: "active" | "rejected" };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!params.userId || !["active", "rejected"].includes(body.status ?? "")) return NextResponse.json({ error: "Invalid registration decision." }, { status: 400 });
  try {
    const admin = adminClient();
    const { data: target, error: targetError } = await admin.from("profiles").select("id,status").eq("id", params.userId).single();
    if (targetError || !target) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    if (target.status !== "pending") return NextResponse.json({ error: "This registration has already been processed." }, { status: 409 });
    const { error } = await admin.from("profiles").update({ status: body.status }).eq("id", params.userId).eq("status", "pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // Approval is an application-level gate; email/password credentials remain unchanged.
    // Confirming the email here prevents a separate Supabase email-verification setting from blocking an approved account.
    if (body.status === "active") {
      const { error: authError } = await admin.auth.admin.updateUserById(params.userId, { email_confirm: true });
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process registration." }, { status: 500 });
  }
}
