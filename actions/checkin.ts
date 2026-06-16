"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

/**
 * Block writes from deactivated accounts via a LIVE is_enabled check. The JWT
 * can lag a deactivation by up to ~1h, and the SECURITY DEFINER RPCs only check
 * session ownership — so enforce it at the action layer (CLAUDE.md §9/§10).
 */
async function requireEnabledUser(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, error: "ไม่ได้เข้าสู่ระบบ" };
  if (u.profile?.is_enabled === false) return { ok: false, error: "บัญชีถูกปิดการใช้งาน" };
  return { ok: true, id: u.id };
}

/** Record a check-in or check-out (via SECURITY DEFINER RPC that also flips session status). */
export async function recordCheckEvent(input: {
  sessionId: string;
  kind: "check_in" | "check_out";
  lat: number;
  lng: number;
  distanceM: number | null;
  within: boolean;
  isLate?: boolean;
  isEarly?: boolean;
  selfieUrl?: string | null;
  eventId?: string | null;
}): Promise<ActionResult> {
  const guard = await requireEnabledUser();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  // Enforce ordering: a check-out requires an existing check-in for this session.
  if (input.kind === "check_out") {
    const { data: ci } = await supabase
      .from("check_ins")
      .select("id")
      .eq("session_id", input.sessionId)
      .eq("kind", "check_in")
      .maybeSingle();
    if (!ci) return { error: "ต้องเช็คอินก่อนจึงจะเช็คเอาท์ได้" };
  }
  const { error } = await supabase.rpc("record_check_event", {
    p_session_id: input.sessionId,
    p_kind: input.kind,
    p_lat: input.lat,
    p_lng: input.lng,
    p_distance_m: input.distanceM,
    p_within: input.within,
    p_is_late: input.isLate ?? false,
    p_is_early: input.isEarly ?? false,
    p_selfie_url: input.selfieUrl ?? null,
    p_event_id: input.eventId ?? null,
  });
  if (error) {
    if (error.message.includes("OUT_OF_GEOFENCE"))
      return { error: "อยู่นอกพื้นที่ที่อนุญาต (เกินรัศมีจากบ้านผู้รับบริการ)" };
    return { error: error.message };
  }
  await writeAudit({
    action: input.kind === "check_in" ? "check_in" : "check_out",
    entity: "session",
    entityId: input.sessionId,
    actorId: guard.id,
    after: { isLate: input.isLate ?? false, isEarly: input.isEarly ?? false, within: input.within, distanceM: input.distanceM },
  });
  revalidatePath(`/app/session/${input.sessionId}`);
  revalidatePath("/app");
  return { ok: true };
}

/** Save the Follow-up (daily) report → marks session completed ("จบเคส"). */
export async function saveFollowup(
  sessionId: string,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  const guard = await requireEnabledUser();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_followup", {
    p_session_id: sessionId,
    p_payload: payload as never,
    p_fois: null,
  });
  if (error) return { error: error.message };
  await writeAudit({ action: "create", entity: "report", entityId: sessionId, actorId: guard.id, context: { type: "followup" } });
  await emitCourseAlerts(sessionId);
  revalidatePath(`/app/session/${sessionId}`);
  revalidatePath("/app");
  return { ok: true };
}

/**
 * After a session completes, alert staff at session 9 (used = base − 1) and at
 * 0 remaining ("ครบคอร์ส"). Idempotent per course via dedupe keys; service-role
 * read of course_progress so the count is authoritative regardless of caller RLS.
 */
async function emitCourseAlerts(sessionId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: s } = await admin
      .from("schedule_sessions")
      .select("course_id, patient_id, patients(full_name)")
      .eq("id", sessionId)
      .maybeSingle();
    const courseId = (s as { course_id: string | null } | null)?.course_id;
    if (!courseId) return;
    const name = (s as { patients?: { full_name?: string } } | null)?.patients?.full_name ?? "ผู้รับบริการ";

    const { data: prog } = await admin
      .from("course_progress")
      .select("base_sessions, bonus_sessions, remaining_sessions")
      .eq("course_id", courseId)
      .maybeSingle();
    const p = prog as { base_sessions: number; bonus_sessions: number; remaining_sessions: number } | null;
    if (!p) return;

    const used = p.base_sessions + p.bonus_sessions - p.remaining_sessions;
    let type: "session_alert_9" | "course_remaining_0" | null = null;
    let body = "";
    if (p.remaining_sessions === 0) {
      type = "course_remaining_0";
      body = `${name} ใช้คอร์สครบแล้ว — เลือกต่อคอร์สหรือยุติบริการ (บันทึกการวัดผลหลังจบ)`;
    } else if (used === p.base_sessions - 1) {
      // "Session 9" alert: used reaches base − 1 (e.g. 9/10) regardless of bonus.
      type = "session_alert_9";
      body = `${name} ใกล้ครบคอร์ส (เหลืออีก ${p.remaining_sessions} ครั้ง)`;
    }
    if (!type) return;

    const { data: staff } = await admin.from("profiles").select("id").in("role", ["admin", "director"]);
    for (const row of (staff ?? []) as { id: string }[]) {
      await createNotification({
        type,
        audience: "admin",
        recipientProfileId: row.id,
        channel: "push",
        title: type === "course_remaining_0" ? "ครบคอร์ส" : "ใกล้ครบคอร์ส",
        body,
        url: "/staff/patients",
        dedupeKey: `${type}:${courseId}:${row.id}`,
      });
    }
  } catch (e) {
    console.error("[checkin] course alert failed", e);
  }
}
