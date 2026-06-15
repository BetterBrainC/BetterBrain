"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

type ReportType = "assessment_swallow" | "assessment_hand" | "summary";

/**
 * Upload a report photo to the PRIVATE `attachments` bucket (clinical photos are
 * PDPA-sensitive). Returns the storage PATH (not a public URL); viewing later
 * uses a signed URL. Only the session's employee or staff may upload.
 */
export async function uploadReportPhoto(
  formData: FormData,
): Promise<{ path?: string; error?: string }> {
  const file = formData.get("file");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!(file instanceof File) || file.size === 0) return { error: "ไม่พบไฟล์" };
  if (file.size > 8_388_608) return { error: "ไฟล์ใหญ่เกิน 8MB" };
  if (!sessionId) return { error: "ไม่พบเวร" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };
  // RLS-readable session check: caller sees the session only if owner/staff.
  const { data: session } = await supabase
    .from("schedule_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { error: "ไม่มีสิทธิ์ในเวรนี้" };

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `reports/${sessionId}/${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage
    .from("attachments")
    .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) return { error: error.message };
  return { path };
}

/**
 * Persist an Assessment (swallowing/hand) or Summary report as completed.
 * Assessment requires a check-in (DB CHECK + this guard); Summary is anytime.
 * Saved as status='completed' → vanishes from the employee's view (RLS).
 */
export async function saveReport(input: {
  sessionId: string;
  reportType: ReportType;
  payload: Record<string, unknown>;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data: session } = await supabase
    .from("schedule_sessions")
    .select("patient_id, course_id, employee_id")
    .eq("id", input.sessionId)
    .maybeSingle();
  const s = session as
    | { patient_id: string; course_id: string | null; employee_id: string }
    | null;
  if (!s) return { error: "ไม่พบเวร" };
  if (s.employee_id !== user.id) return { error: "ไม่มีสิทธิ์ในเวรนี้" };

  let checkInId: string | null = null;
  if (input.reportType !== "summary") {
    const { data: ci } = await supabase
      .from("check_ins")
      .select("id")
      .eq("session_id", input.sessionId)
      .eq("kind", "check_in")
      .maybeSingle();
    checkInId = (ci as { id: string } | null)?.id ?? null;
    if (!checkInId) return { error: "ต้องเช็คอินก่อนจึงจะบันทึกได้" };
  }

  const { error } = await supabase.from("reports").insert({
    report_type: input.reportType,
    patient_id: s.patient_id,
    course_id: s.course_id,
    session_id: input.sessionId,
    author_id: user.id,
    check_in_id: checkInId,
    status: "completed",
    completed_at: new Date().toISOString(),
    payload: input.payload as never,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/session/${input.sessionId}`);
  revalidatePath("/staff/reports");
  return { ok: true };
}
