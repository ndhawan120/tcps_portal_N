import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };
const slugify = (value: string) => value.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return request.cookies.getAll(); }, setAll(cookiesToSet: CookieToSet[]) { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isLegacyEmployeeRoute = path === "/employee" || path.startsWith("/employee/");
  const isLegacyManagerRoute = path === "/manager" || path.startsWith("/manager/");
  const isPublic = path === "/login" || path === "/signup" || path === "/forgot-password" || path === "/reset-password" || path.startsWith("/_next") || path.startsWith("/api");

  if (isLegacyManagerRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/team";
    return NextResponse.redirect(url, 308);
  }

  if (isLegacyEmployeeRoute) {
    const identifier = path === "/employee" ? "" : path.slice("/employee/".length);
    if (!identifier) { const url = request.nextUrl.clone(); url.pathname = "/employees"; return NextResponse.redirect(url, 308); }
    const { data: employee } = await supabase.from("profiles").select("id, profile_slug, first_name, last_name").eq("role", "employee").or(`id.eq.${identifier},profile_slug.eq.${identifier}`).maybeSingle();
    const canonicalSlug = employee?.profile_slug || slugify(`${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`);
    const url = request.nextUrl.clone(); url.pathname = canonicalSlug ? `/employees/${canonicalSlug}` : "/employees";
    return NextResponse.redirect(url, 308);
  }

  if (!user && !isPublic) { const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url); }
  if (user && !isPublic) {
    const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
    if (["pending", "rejected", "inactive"].includes(profile?.status ?? "")) { await supabase.auth.signOut(); const url = request.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("error", profile?.status === "pending" ? "account_pending" : profile?.status === "rejected" ? "account_rejected" : "account_inactive"); return NextResponse.redirect(url); }
    const role = profile?.role;
    const adminOnly = path.startsWith("/admin");
    const managerOnly = path.startsWith("/team") || path.startsWith("/approvals") || path.startsWith("/employees");
    if (adminOnly && role !== "admin") { const url = request.nextUrl.clone(); url.pathname = "/dashboard"; return NextResponse.redirect(url); }
    if (managerOnly && role !== "manager" && role !== "admin") { const url = request.nextUrl.clone(); url.pathname = "/dashboard"; return NextResponse.redirect(url); }
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
