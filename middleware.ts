import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = path === "/login" || path === "/signup" || path === "/forgot-password" || path === "/reset-password" || path.startsWith("/_next") || path.startsWith("/api");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !isPublic) {
    const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();

    if (profile?.status === "pending" || profile?.status === "rejected" || profile?.status === "inactive") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", profile.status === "pending" ? "account_pending" : profile.status === "rejected" ? "account_rejected" : "account_inactive");
      return NextResponse.redirect(url);
    }

    const role = profile?.role;

    if (path.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone(); url.pathname = "/dashboard"; return NextResponse.redirect(url);
    }

    if (path.startsWith("/manager") && role !== "manager" && role !== "admin") {
      const url = request.nextUrl.clone(); url.pathname = "/dashboard"; return NextResponse.redirect(url);
    }

    if (path.startsWith("/approvals") && role !== "manager" && role !== "admin") {
      const url = request.nextUrl.clone(); url.pathname = "/dashboard"; return NextResponse.redirect(url);
    }

    if (path.startsWith("/employees") && role !== "manager" && role !== "admin") {
      const url = request.nextUrl.clone(); url.pathname = "/dashboard"; return NextResponse.redirect(url);
    }

    if (path.startsWith("/employee/") && role !== "manager" && role !== "admin") {
      const url = request.nextUrl.clone(); url.pathname = "/dashboard"; return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
