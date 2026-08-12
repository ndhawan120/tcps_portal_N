import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD_LENGTH = 8;
const ALLOWED_ROLES = new Set(["employee", "manager", "admin"]);

export async function POST(request: Request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: callerProfile, error: callerError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (callerError || callerProfile?.role !== "admin" || callerProfile.status !== "active") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    department?: string | null;
    role?: string;
    sendInvite?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const role = body.role || "employee";
  const sendInvite = body.sendInvite === true;

  if (!email || !firstName || !lastName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!sendInvite && (!body.password || body.password.length < MIN_PASSWORD_LENGTH)) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
  }

  const admin = createAdminClient();
  let newUserId: string;

  if (sendInvite) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    newUserId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    newUserId = data.user.id;
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ department: body.department?.trim() || null, role, status: "active" })
    .eq("id", newUserId);

  if (updateError) {
    // Do not leave an Auth account behind when its application profile could not be configured.
    const { error: rollbackError } = await admin.auth.admin.deleteUser(newUserId);
    const detail = rollbackError
      ? ` Profile rollback also failed: ${rollbackError.message}`
      : " The created account was rolled back.";
    return NextResponse.json(
      { error: `User could not be configured: ${updateError.message}.${detail}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, userId: newUserId });
}
