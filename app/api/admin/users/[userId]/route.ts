import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export async function DELETE(_request: Request, { params }: { params: { userId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: actor } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (actor?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  if (!params.userId || params.userId === user.id) return NextResponse.json({ error: "You cannot delete your own account from this screen." }, { status: 400 });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) return NextResponse.json({ error: "Server deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment." }, { status: 500 });

  const admin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: target } = await admin.from("profiles").select("id, role").eq("id", params.userId).single();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "admin") return NextResponse.json({ error: "Admin accounts cannot be deleted from the employee directory." }, { status: 400 });

  const { error } = await admin.auth.admin.deleteUser(params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
