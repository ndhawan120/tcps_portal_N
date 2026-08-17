import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) };
  const { data: actor } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (actor?.role !== "admin" || actor.status !== "active") return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  return { response: null };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const supabase = await createClient();
  const { data: users, error } = await supabase.from("profiles").select("id,first_name,last_name,email,department,created_at").eq("status", "pending").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ users: users ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
