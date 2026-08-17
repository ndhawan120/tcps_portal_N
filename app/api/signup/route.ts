import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const password = body.password ?? "";

  if (!email || !firstName || !lastName || !password) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already been registered") || message.includes("user already exists")) {
      return NextResponse.json({ error: "An account with this email already exists. Please log in instead." }, { status: 409 });
    }
    return NextResponse.json({ error: "We could not create your account. Please check your details and try again." }, { status: 400 });
  }

  // The database trigger creates the profile with status = pending.
  // Do not create a session here: the user must be approved before portal access.
  return NextResponse.json({ success: true, userId: data.user.id }, { status: 201 });
}
