import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Role = Database["public"]["Enums"]["user_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface SessionUser {
  id: string;
  email: string | null;
  profile: Profile | null;
}

/** Current authenticated user + profile (deduped per request). null if signed out. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { id: user.id, email: user.email ?? null, profile };
});

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  // Deactivated users are force-signed-out on the next request (live DB check).
  if (u.profile && u.profile.is_enabled === false) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?disabled=1");
  }
  return u;
}

/** Admin or Director only (staff shell). */
export async function requireStaff(): Promise<SessionUser> {
  const u = await requireUser();
  const role = u.profile?.role;
  if (role !== "admin" && role !== "director") redirect("/app");
  return u;
}

/** Director-only (e.g. การวัดผล, audit). */
export async function requireDirector(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.profile?.role !== "director") redirect("/staff");
  return u;
}

export function homePathForRole(role: Role | null | undefined): string {
  return role === "admin" || role === "director" ? "/staff" : "/app";
}
