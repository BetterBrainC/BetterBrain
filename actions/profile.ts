"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

/** Employee edits their own name/phone (restricted columns; own row only). */
export async function updateMyProfile(input: {
  fullName: string;
  phone: string;
}): Promise<ActionResult> {
  if (!input.fullName.trim()) return { error: "กรอกชื่อ-สกุล" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: input.fullName.trim(), phone: input.phone.trim() || null })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/app/account");
  return { ok: true };
}
