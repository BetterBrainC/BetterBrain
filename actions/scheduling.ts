"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok?: boolean;
  error?: string;
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
    .select("employee_id, patient_id")
    .eq("id", input.sessionId)
    .maybeSingle();
  const s = session as { employee_id: string; patient_id: string } | null;
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

  revalidatePath("/staff/assign");
  revalidatePath("/staff");
  return { ok: true };
}
