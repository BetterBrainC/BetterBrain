"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

// ตั้งค่าระบบเป็นสิทธิ Director เท่านั้น (client 18/6/2569 — เอาสิทธิ Admin ออก).
async function requireDirectorRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  return role === "director";
}

/** Upload a logo image to the public `branding` bucket; returns its public URL. */
export async function uploadLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "ไม่พบไฟล์" };
  if (file.size > 2_097_152) return { error: "ไฟล์ใหญ่เกิน 2MB" };
  if (!(await requireDirectorRole())) return { error: "ไม่มีสิทธิ์" };

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `logo-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage
    .from("branding")
    .upload(path, bytes, { contentType: file.type || "image/png", upsert: true });
  if (error) return { error: error.message };
  const { data } = admin.storage.from("branding").getPublicUrl(path);
  return { url: data.publicUrl };
}

/** Admin/Director saves system settings (singleton row id=1). */
export async function saveSettings(input: {
  companyName: string;
  logoUrl: string | null;
  selfieEnforced: boolean;
  lateThresholdMin: number;
  earlyThresholdMin: number;
  geofenceRadiusM: number;
}): Promise<ActionResult> {
  if (!(await requireDirectorRole())) return { error: "ไม่มีสิทธิ์" };
  if (!input.companyName.trim()) return { error: "กรอกชื่อบริษัท" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      company_name: input.companyName.trim(),
      logo_url: input.logoUrl?.trim() || null,
      selfie_enforced: input.selfieEnforced,
      late_threshold_minutes: Math.max(0, Math.round(input.lateThresholdMin)),
      early_threshold_minutes: Math.max(0, Math.round(input.earlyThresholdMin)),
      geofence_radius_m: Math.max(0, Math.round(input.geofenceRadiusM)),
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/staff/settings");
  return { ok: true };
}
