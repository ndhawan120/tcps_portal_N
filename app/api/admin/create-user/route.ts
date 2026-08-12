import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const body = await request.json();
  const { email, password, firstName, lastName, department, role, sendInvite } = body;
  if (!email || !firstName || !lastName) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  if (!sendInvite && (!password || password.length < 6)) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const admin = createAdminClient();
  let newUserId: string;

  if (sendInvite) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { first_name: firstName, last_name: lastName } });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    newUserId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName } });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    newUserId = data.user.id;
  }

  const { error: updateError } = await admin.from("profiles").update({ department: department || null, role: role || "employee", status: "active" }).eq("id", newUserId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({ success: true, userId: newUserId });
}
