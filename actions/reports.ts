"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit/log";
import { bangkokToday } from "@/lib/data/queries";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

type ReportType = "assessment_swallow" | "assessment_hand" | "summary" | "assessment_report";

/**
 * Report types written up away from the patient's home, so no check-in is
 * required (mirrors the DB's `chk_report_requires_checkin`, which gates only
 * assessment_swallow / assessment_hand / followup).
 */
const UNGATED_TYPES: ReadonlySet<ReportType> = new Set(["summary", "assessment_report"]);

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
 * Persist an Assessment (swallowing/hand), รายงานประเมินแรกรับ or Summary report as
 * completed. Assessments require a check-in (DB CHECK + this guard); the two
 * written-up reports are anytime. Saved as status='completed' → vanishes from
 * the employee's view (RLS).
 */
export async function saveReport(input: {
  sessionId: string;
  reportType: ReportType;
  payload: Record<string, unknown>;
  reportId?: string | null;
  draftId?: string | null;
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
  if (!UNGATED_TYPES.has(input.reportType)) {
    const { data: ci } = await supabase
      .from("check_ins")
      .select("id")
      .eq("session_id", input.sessionId)
      .eq("kind", "check_in")
      .maybeSingle();
    checkInId = (ci as { id: string } | null)?.id ?? null;
    if (!checkInId) return { error: "ต้องเช็คอินก่อนจึงจะบันทึกได้" };
  }

  const fields = {
    report_type: input.reportType,
    patient_id: s.patient_id,
    course_id: s.course_id,
    session_id: input.sessionId,
    author_id: user.id,
    check_in_id: checkInId,
    status: "completed" as const,
    completed_at: new Date().toISOString(),
    // Stamped explicitly (Asia/Bangkok): a report filed from a draft started days
    // earlier is dated the day it was FILED, not the day the draft was opened.
    report_date: bangkokToday(),
    payload: input.payload as never,
  };
  const row = { ...(input.reportId ? { id: input.reportId } : {}), ...fields };

  // Filing a report the employee had drafted promotes that very row, so the draft
  // does not survive alongside the filed copy. If it is gone (already filed from
  // another device), fall through and file normally rather than losing the work.
  //
  // Service-role write: `reports_update_employee` pins the author's own row to
  // status='draft' in its WITH CHECK, so the author cannot file it themselves —
  // the draft would linger and the case keep showing "ร่าง" (client 6 ส.ค. 2569).
  // Ownership is proved here first.
  let filed = false;
  if (input.draftId) {
    const { data: current } = await supabase
      .from("reports")
      .select("author_id, status")
      .eq("id", input.draftId)
      .maybeSingle();
    const draft = current as { author_id: string; status: string } | null;
    if (draft && draft.author_id !== user.id) return { error: "ไม่มีสิทธิ์ในร่างนี้" };
    // Already filed — a previous attempt landed and only the response was lost
    // (offline retry). Must not insert a second copy.
    if (draft && draft.status !== "draft") return { ok: true };

    if (draft) {
      const { data: promoted, error: promoteError } = await createAdminClient()
        .from("reports")
        .update(fields)
        .eq("id", input.draftId)
        .eq("author_id", user.id)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();
      if (promoteError) return { error: promoteError.message };
      filed = promoted != null;
    }
  }

  if (!filed) {
    // A client-supplied reportId makes an offline-queued report idempotent on flush.
    const { error } = input.reportId
      ? await supabase.from("reports").upsert(row, { onConflict: "id", ignoreDuplicates: true })
      : await supabase.from("reports").insert(row);
    if (error) return { error: error.message };
  }
  await writeAudit({
    action: "create",
    entity: "report",
    entityId: input.sessionId,
    actorId: user.id,
    context: { reportType: input.reportType },
  });
  revalidatePath(`/app/session/${input.sessionId}`);
  revalidatePath("/staff/reports");
  return { ok: true };
}

/**
 * Staff correct a report the employee already filed (client 3 ส.ค. 2569 — all
 * five report types must be editable by Director/Admin after submission).
 *
 * Values arrive keyed by dot-path so nested payload sections survive the round
 * trip, and each is written back with the type it had: a number stays a number,
 * a checkbox stays a boolean. Editing content never flips the report's status —
 * "จบเคส" is a clinical decision, not a side effect of fixing a typo.
 * `reports_update_staff` RLS already permits this; the audit keeps before/after.
 */
export async function updateReportPayload(input: {
  reportId: string;
  values: Record<string, string>;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role, is_enabled").eq("id", user?.id ?? "").maybeSingle();
  const prof = me as { role?: string; is_enabled?: boolean } | null;
  if (prof?.role !== "admin" && prof?.role !== "director") return { error: "ไม่มีสิทธิ์" };
  if (prof?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };

  const { data: current } = await supabase
    .from("reports")
    .select("payload, patient_id")
    .eq("id", input.reportId)
    .maybeSingle();
  const row = current as { payload?: unknown; patient_id?: string | null } | null;
  if (!row) return { error: "ไม่พบรายงาน" };

  const before = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
  const after = structuredClone(before);
  for (const [path, raw] of Object.entries(input.values)) setByPath(after, path.split("."), raw);

  const { error } = await supabase.from("reports").update({ payload: after as never }).eq("id", input.reportId);
  if (error) return { error: error.message };

  await writeAudit({
    action: "update",
    entity: "report",
    entityId: input.reportId,
    actorId: user?.id ?? null,
    before,
    after,
    context: { editedFields: Object.keys(input.values).length },
  });
  revalidatePath(`/staff/reports/${input.reportId}`);
  revalidatePath("/staff/reports");
  if (row.patient_id) revalidatePath(`/staff/patients/${row.patient_id}`);
  return { ok: true };
}

/** Write `raw` into `target` at `path`, keeping the leaf's original JSON type. */
function setByPath(target: Record<string, unknown>, path: string[], raw: string): void {
  let node: Record<string, unknown> = target;
  for (const seg of path.slice(0, -1)) {
    const next = node[seg];
    if (!next || typeof next !== "object") return; // path no longer exists — skip
    node = next as Record<string, unknown>;
  }
  const leaf = path[path.length - 1]!;
  const previous = node[leaf];
  if (typeof previous === "boolean") node[leaf] = raw === "true";
  else if (typeof previous === "number") {
    const n = Number(raw);
    node[leaf] = raw.trim() === "" ? null : Number.isFinite(n) ? n : previous;
  } else node[leaf] = raw;
}
