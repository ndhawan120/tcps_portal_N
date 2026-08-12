import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import RoleManager from "../RoleManager";

export default async function AdminRolesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name,last_name,role,status")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile.status !== "active") redirect("/dashboard");

  return (
    <div>
      <Nav role="admin" name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-on-surface">Roles & Access</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Create business-specific role names while keeping Employee, Manager and Admin as the underlying security tiers.
          </p>
        </div>
        <RoleManager />
      </main>
    </div>
  );
}
