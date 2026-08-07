"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export interface DraftResult {
  ok?: boolean;
  id?: string;
  error?: string;
}

export type DraftReportType =
  | "assessment_swallow"
  | "assessment_hand"
  | "summary"
  | "assessment_report"
  | "followup";

export interface ReportDraft {
  id: string;
  payload: Record<string, unknown>;
  savedAtISO: string;
}

/**
 * Types the DB's `chk_report_requires_checkin` gates — the constraint has no
 * status clause, so even a draft of these needs the check-in row to exist. In
 * practice that is where they are written anyway (at the recipient's home).
 */
const CHECKIN_GATED: ReadonlySet<DraftReportType> = new Set([
  "assessment_swallow",
  "assessment_hand",
  "followup",
]);

async function requireEnabledUser(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, error: "ไม่ได้เข้าสู่ระบบ" };
  if (u.profile?.is_enabled === false) return { ok: false, error: "บัญชีถูกปิดการใช้งาน" };
  return { ok: true, id: u.id };
}

/**
 * The employee's in-progress draft for one report of one session, if any.
 *
 * Drafts exist so a report can be filled in over the visit and re-read before it
 * is filed (client 5 ส.ค. 2569: "อยากให้เพิ่มระบบดราฟ ก่อนส่งบันทึกจริง") — filing is
 * one-way, since a completed report vanishes from the employee's view (RLS).
 * Stored server-side, so a draft survives a lost phone or a second device.
 */
export async function loadReportDraft(
  sessionId: string,
  reportType: DraftReportType,
): Promise<ReportDraft | null> {
  const guard = await requireEnabledUser();
  if (!guard.ok) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, payload, updated_at")
    .eq("session_id", sessionId)
    .eq("report_type", reportType)
    .eq("author_id", guard.id)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { id: string; payload: unknown; updated_at: string } | null;
  if (!row) return null;

  // Report already filed → the draft is spent; do not reopen it as unfinished work.
  const { count: filedCount } = await createAdminClient()
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("report_type", reportType)
    .in("status", ["completed", "corrected"]);
  if ((filedCount ?? 0) > 0) return null;

  return {
    id: row.id,
    payload: (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>,
    savedAtISO: row.updated_at,
  };
}

/**
 * Report types that currently have a draft on this session (for the "ร่าง" badge).
 * A draft whose report has since been filed does not count — the case must not
 * look unfinished once the work is in (client 6 ส.ค. 2569).
 */
export async function getSessionDraftTypes(sessionId: string): Promise<string[]> {
  const guard = await requireEnabledUser();
  if (!guard.ok) return [];
  // Service-role read: a filed report is invisible to its author by design
  // (vanish-on-save), so RLS alone cannot tell "still unfinished" from "already
  // filed". Only the caller's own draft TYPES leave this function.
  const { data } = await createAdminClient()
    .from("reports")
    .select("report_type, status, author_id")
    .eq("session_id", sessionId);
  const all = (Array.isArray(data) ? data : []) as { report_type: string; status: string; author_id: string }[];
  const filed = new Set(
    all.filter((r) => r.status === "completed" || r.status === "corrected").map((r) => r.report_type),
  );
  return [
    ...new Set(
      all
        .filter((r) => r.status === "draft" && r.author_id === guard.id && !filed.has(r.report_type))
        .map((r) => r.report_type),
    ),
  ];
}

/**
 * Create or overwrite the draft for this session + report type. Never marks the
 * session complete and never fires the course alerts — that is what filing does.
 *
 * Not audit-logged: a draft is the author's own unsubmitted working copy, and
 * autosaving one would bury the real events (filings, corrections) in noise. The
 * filed report and every later staff edit are audited as before.
 */
export async function saveReportDraft(input: {
  sessionId: string;
  reportType: DraftReportType;
  payload: Record<string, unknown>;
  draftId?: string | null;
}): Promise<DraftResult> {
  const guard = await requireEnabledUser();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("schedule_sessions")
    .select("patient_id, course_id, employee_id")
    .eq("id", input.sessionId)
    .maybeSingle();
  const s = session as { patient_id: string; course_id: string | null; employee_id: string } | null;
  if (!s) return { error: "ไม่พบเวร" };
  if (s.employee_id !== guard.id) return { error: "ไม่มีสิทธิ์ในเวรนี้" };

  let checkInId: string | null = null;
  if (CHECKIN_GATED.has(input.reportType)) {
    const { data: ci } = await supabase
      .from("check_ins")
      .select("id")
      .eq("session_id", input.sessionId)
      .eq("kind", "check_in")
      .maybeSingle();
    checkInId = (ci as { id: string } | null)?.id ?? null;
    if (!checkInId) return { error: "ต้องเช็คอินก่อนจึงจะบันทึกร่างได้" };
  }

  // Reuse the row we already have so a session never accumulates stale drafts.
  const existingId =
    input.draftId ?? (await loadReportDraft(input.sessionId, input.reportType))?.id ?? null;

  if (existingId) {
    const { data: updated, error } = await supabase
      .from("reports")
      .update({ payload: input.payload as never, check_in_id: checkInId })
      .eq("id", existingId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (error) return { error: error.message };
    // Row gone or already filed → fall through and start a fresh draft.
    if (updated) {
      revalidatePath(`/app/session/${input.sessionId}`);
      return { ok: true, id: (updated as { id: string }).id };
    }
  }

  const { data: inserted, error } = await supabase
    .from("reports")
    .insert({
      report_type: input.reportType,
      patient_id: s.patient_id,
      course_id: s.course_id,
      session_id: input.sessionId,
      author_id: guard.id,
      check_in_id: checkInId,
      status: "draft" as const,
      payload: input.payload as never,
    })
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  revalidatePath(`/app/session/${input.sessionId}`);
  return { ok: true, id: (inserted as { id: string } | null)?.id };
}

/**
 * Retire a draft that has been superseded by a filed report. Employees cannot
 * DELETE reports (director-only in RLS), so the row is parked as `discarded` —
 * which also keeps the trail of what was drafted.
 *
 * The status change goes through the service-role client: `reports_update_employee`
 * lets an author edit their draft's CONTENT but its WITH CHECK pins the row to
 * `status = 'draft'`, so the author cannot move it out of draft at all. That is why
 * filed follow-ups kept showing "ร่าง" on the case (client 6 ส.ค. 2569). Ownership is
 * therefore proved here, in the action, before the privileged write — the pattern
 * CLAUDE.md §10 prescribes: getUser → authorize → write.
 */
export async function discardReportDraft(draftId: string): Promise<DraftResult> {
  const guard = await requireEnabledUser();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, author_id, status, session_id")
    .eq("id", draftId)
    .maybeSingle();
  const row = data as { author_id: string; status: string; session_id: string | null } | null;
  if (!row) return { ok: true }; // already gone — nothing to retire
  if (row.author_id !== guard.id) return { error: "ไม่มีสิทธิ์ในร่างนี้" };
  if (row.status !== "draft") return { ok: true }; // already filed/retired

  const { error } = await createAdminClient()
    .from("reports")
    .update({ status: "discarded" as const, discarded_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("author_id", guard.id)
    .eq("status", "draft");
  if (error) return { error: error.message };
  if (row.session_id) revalidatePath(`/app/session/${row.session_id}`);
  return { ok: true };
}
