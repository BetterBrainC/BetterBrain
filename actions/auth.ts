"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  error?: string;
}

/** Email + password sign-in. Sets the Supabase auth cookie, then redirects by role. */
export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "กรอกอีเมลและรหัสผ่าน" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_enabled")
    .eq("id", data.user.id)
    .maybeSingle();

  // Block deactivated (or profile-less) accounts from signing in.
  if (!profile || profile.is_enabled === false) {
    await supabase.auth.signOut();
    return { error: "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
  }

  redirect(
    profile?.role === "admin" || profile?.role === "director" ? "/staff" : "/app",
  );
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
