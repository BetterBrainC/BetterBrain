"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * Staff: save the managed list of โปรแกรมฝึก (คอร์สการฟื้นฟู). Stored in
 * settings.extra.training_programs; consumed as options by the intake form and
 * the จัดการหน้าญาติ exercise guides. No migration (reuses the settings jsonb).
 */
export async function setTrainingPrograms(list: string[]): Promise<{ ok?: boolean; error?: string }> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };

  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of list ?? []) {
    const s = String(raw ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    cleaned.push(s);
  }

  const admin = createAdminClient();
  const { data } = await admin.from("settings").select("extra").eq("id", 1).maybeSingle();
  const extra = ((data as { extra?: Record<string, unknown> } | null)?.extra ?? {}) as Record<string, unknown>;
  const { error } = await admin
    .from("settings")
    .upsert({ id: 1, extra: { ...extra, training_programs: cleaned } }, { onConflict: "id" });
  if (error) return { error: error.message };

  revalidatePath("/staff/programs");
  revalidatePath("/staff/patients/new");
  revalidatePath("/staff/relatives");
  return { ok: true };
}
