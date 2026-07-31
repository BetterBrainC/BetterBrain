"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit/log";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

async function requireStaffUser(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { ok: false, error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { ok: false, error: "บัญชีถูกปิดการใช้งาน" };
  return { ok: true, id: u!.id };
}

/** Patient last-minute cancel → mark the session "งด" (no session consumed). */
export async function markSessionSkipped(sessionId: string, reason?: string): Promise<ActionResult> {
  const guard = await requireStaffUser();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_sessions")
    .update({ status: "skipped", note: reason ?? null })
    .eq("id", sessionId);
  if (error) return { error: error.message };
  await writeAudit({ action: "update", entity: "session", entityId: sessionId, actorId: guard.id, after: { status: "skipped", reason: reason ?? null } });
  revalidatePath("/staff/assign");
  return { ok: true };
}

/**
 * Reschedule a session: either "indefinite" (parked, status=rescheduled) or to a
 * specific new date/time. Notifies the assigned employee.
 */
export async function rescheduleSession(input: {
  sessionId: string;
  mode: "indefinite" | "datetime";
  date?: string;
  slot?: string; // "09:00-10:00"
}): Promise<ActionResult> {
  const guard = await requireStaffUser();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("schedule_sessions")
    .select("employee_id, patients(full_name)")
    .eq("id", input.sessionId)
    .maybeSingle();
  const sess = s as { employee_id: string; patients: { full_name: string | null } | null } | null;
  if (!sess) return { error: "ไม่พบเวร" };
  const name = sess.patients?.full_name ?? "ผู้รับบริการ";

  let patch: Record<string, unknown> = { status: "rescheduled" };
  let body = `เวร ${name} ถูกเลื่อนแบบไม่มีกำหนด`;
  if (input.mode === "datetime") {
    if (!input.date || !input.slot) return { error: "เลือกวันและเวลาที่จะเลื่อนไป" };
    const [start, end] = input.slot.split("-");
    if (!start || !end) return { error: "เลือกช่วงเวลา" };
    patch = {
      status: "rescheduled",
      scheduled_date: input.date,
      scheduled_start: bangkokTimestamp(input.date, start),
      scheduled_end: bangkokTimestamp(input.date, end),
      note: "เลื่อนนัด",
    };
    body = `เวร ${name} ถูกเลื่อนไปวันที่ ${input.date} เวลา ${start}`;
  } else {
    patch.note = "เลื่อนไม่มีกำหนด";
  }

  const { error } = await supabase.from("schedule_sessions").update(patch as never).eq("id", input.sessionId);
  if (error) return { error: error.message };
  await writeAudit({ action: "update", entity: "session", entityId: input.sessionId, actorId: guard.id, after: { rescheduled: input.mode } });
  await createNotification({
    type: "generic",
    audience: "employee",
    recipientProfileId: sess.employee_id,
    channel: "push",
    title: "เลื่อนนัด",
    body,
    url: "/app/schedule",
  });
  revalidatePath("/staff/assign");
  return { ok: true };
}

/** Toggle/set เคสพิเศษ (extra pay) on an EXISTING session. */
export async function updateSessionSpecial(input: {
  sessionId: string;
  isSpecial: boolean;
  amount: number | null;
}): Promise<ActionResult> {
  const guard = await requireStaffUser();
  if (!guard.ok) return { error: guard.error };
  if (input.isSpecial && (input.amount == null || input.amount <= 0))
    return { error: "ระบุจำนวนเงินเคสพิเศษ" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_sessions")
    .update({ is_special_case: input.isSpecial, special_amount: input.isSpecial ? input.amount : null })
    .eq("id", input.sessionId);
  if (error) return { error: error.message };
  await writeAudit({ action: "update", entity: "session", entityId: input.sessionId, actorId: guard.id, after: { is_special_case: input.isSpecial, special_amount: input.isSpecial ? input.amount : null } });
  revalidatePath("/staff/assign");
  return { ok: true };
}

// Bangkok has no DST → fixed +07:00. A local "HH:MM" on a given date maps to a
// stable timestamptz with this offset.
const TZ_OFFSET = "+07:00";

function bangkokTimestamp(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00${TZ_OFFSET}`;
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** Session statuses that occupy a slot in a course (งด/ไม่ได้เช็คอิน/ยกเลิก never do). */
const OCCUPYING_STATUSES = ["scheduled", "in_progress", "attended", "late", "completed", "corrected"];

/**
 * Which course a newly booked session belongs to.
 *
 * Fills the running course first, then rolls over into the next one the
 * recipient has already bought — relatives confirm a month up front, so dates
 * past the current course's last session must land in the follow-on course
 * rather than pile onto a full one (client 31 ก.ค. 2569).
 *
 * Capacity counts booked sessions too, not just attended ones: a slot that is
 * already on the calendar is spoken for even though nobody has checked in yet.
 * Falls back to the newest course when everything is full, so the session stays
 * linked to something the reports can roll up.
 */
async function pickCourseForNewSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
): Promise<string | null> {
  const { data: cData } = await supabase
    .from("courses")
    .select("id, total_sessions")
    .eq("patient_id", patientId)
    .eq("status", "on_process")
    .order("created_at", { ascending: true });
  const courses = (cData ?? []) as { id: string; total_sessions: number | null }[];
  if (courses.length === 0) return null;

  const { data: sData } = await supabase
    .from("schedule_sessions")
    .select("course_id")
    .in("course_id", courses.map((c) => c.id))
    .in("status", OCCUPYING_STATUSES);
  const taken = new Map<string, number>();
  for (const s of (sData ?? []) as { course_id: string | null }[]) {
    if (s.course_id) taken.set(s.course_id, (taken.get(s.course_id) ?? 0) + 1);
  }

  const withRoom = courses.find((c) => (taken.get(c.id) ?? 0) < (c.total_sessions ?? 0));
  return (withRoom ?? courses[courses.length - 1]!).id;
}

/** Admin assigns a case on the monthly calendar (patient → employee → date/slot). */
export async function createAssignment(input: {
  patientId: string;
  employeeId: string;
  date: string;
  slot: string; // "09:00-10:00"
  isSpecial: boolean;
  specialAmount: number | null;
  kind?: "assessment" | "treatment";
}): Promise<ActionResult> {
  if (!input.patientId || !input.employeeId) return { error: "เลือกผู้รับบริการและพนักงาน" };
  if (!input.date) return { error: "เลือกวันที่" };
  const [start, end] = input.slot.split("-");
  if (!start || !end) return { error: "เลือกช่วงเวลา" };
  if (input.isSpecial && (input.specialAmount == null || input.specialAmount <= 0)) {
    return { error: "ระบุจำนวนเงินเคสพิเศษ" };
  }

  const { supabase, userId } = await authed();
  const courseId = await pickCourseForNewSession(supabase, input.patientId);

  const { error } = await supabase.from("schedule_sessions").insert({
    patient_id: input.patientId,
    employee_id: input.employeeId,
    course_id: courseId,
    scheduled_date: input.date,
    scheduled_start: bangkokTimestamp(input.date, start),
    scheduled_end: bangkokTimestamp(input.date, end),
    status: "scheduled",
    kind: input.kind ?? "treatment",
    is_special_case: input.isSpecial,
    special_amount: input.isSpecial ? input.specialAmount : null,
    assigned_by: userId,
  });
  if (error) return { error: error.message };

  // Grant the assigned employee access to the patient (RLS backbone).
  await supabase
    .from("patient_assignments")
    .upsert(
      { employee_id: input.employeeId, patient_id: input.patientId },
      { onConflict: "employee_id,patient_id" },
    );

  revalidatePath("/staff/assign");
  revalidatePath("/staff");
  return { ok: true };
}

/** Standalone substitution / shift-swap (จัดเวรแทน/สลับเวร): reassign a session. */
export async function substituteSession(input: {
  sessionId: string;
  substituteEmployeeId: string;
  reason: string;
}): Promise<ActionResult> {
  if (!input.sessionId || !input.substituteEmployeeId) {
    return { error: "เลือกเวรและพนักงานแทน" };
  }
  const { supabase } = await authed();

  const { data: session } = await supabase
    .from("schedule_sessions")
    .select("employee_id, patient_id, scheduled_date, patients(full_name)")
    .eq("id", input.sessionId)
    .maybeSingle();
  const s = session as
    | { employee_id: string; patient_id: string; scheduled_date: string; patients: { full_name: string } | null }
    | null;
  if (!s) return { error: "ไม่พบเวร" };
  if (s.employee_id === input.substituteEmployeeId) {
    return { error: "พนักงานแทนต้องไม่ใช่คนเดิม" };
  }

  const { error } = await supabase
    .from("schedule_sessions")
    .update({
      employee_id: input.substituteEmployeeId,
      substituted_from: s.employee_id,
      substitution_reason: input.reason.trim() || null,
      coverage_status: "covered",
    })
    .eq("id", input.sessionId);
  if (error) return { error: error.message };

  // The substitute must be able to see the patient.
  await supabase
    .from("patient_assignments")
    .upsert(
      { employee_id: input.substituteEmployeeId, patient_id: s.patient_id },
      { onConflict: "employee_id,patient_id" },
    );

  // Notify the substitute (in-app + Web Push).
  await createNotification({
    type: "substitute_assigned",
    audience: "employee",
    recipientProfileId: input.substituteEmployeeId,
    channel: "push",
    title: "คุณได้รับมอบเวรแทน",
    body: `รับเวรแทน${s.patients?.full_name ? ` · ${s.patients.full_name}` : ""} วันที่ ${s.scheduled_date}`,
    url: "/app/schedule",
  });

  revalidatePath("/staff/assign");
  revalidatePath("/staff");
  return { ok: true };
}
