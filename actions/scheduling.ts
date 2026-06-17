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

  // Attach the patient's current (latest on_process) course if any.
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("patient_id", input.patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const courseId = (course as { id: string } | null)?.id ?? null;

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
