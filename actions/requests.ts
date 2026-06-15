"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface FormResult {
  ok?: boolean;
  error?: string;
}

/** Employee submits a check-in correction request (Director approves → Admin applies). */
export async function createCorrection(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const sessionId = String(formData.get("session_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const field = String(formData.get("field") ?? "checkin_time");
  const fromTime = String(formData.get("from_time") ?? "");
  const toTime = String(formData.get("to_time") ?? "");
  if (!sessionId || !reason) return { error: "กรอกเคสและเหตุผลให้ครบ" };

  const { data: ci } = await supabase
    .from("check_ins")
    .select("id")
    .eq("session_id", sessionId)
    .eq("kind", "check_in")
    .maybeSingle();

  const { error } = await supabase.from("correction_requests").insert({
    employee_id: user.id,
    session_id: sessionId,
    check_in_id: ci?.id ?? null,
    requested_changes: { field, from: fromTime, to: toTime },
    reason,
    status: "pending",
  });
  if (error) return { error: error.message };
  revalidatePath("/app/corrections");
  return { ok: true };
}
