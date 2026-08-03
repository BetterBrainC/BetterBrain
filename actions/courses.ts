"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit/log";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

const PKG = {
  pkg_10_plus_1: { base: 10, bonus: 1 },
  pkg_30: { base: 30, bonus: 0 },
} as const;
export type CoursePackage = keyof typeof PKG;

async function requireStaffUser(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { ok: false, error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { ok: false, error: "บัญชีถูกปิดการใช้งาน" };
  return { ok: true, id: u!.id };
}

/**
 * Staff opens a course for a patient. Presets derive base/bonus from the package;
 * `courseType: "custom"` lets Admin type the number of sessions directly
 * (client Final brief — no fixed package required).
 */
export async function createCourse(input: {
  patientId: string;
  courseType: CoursePackage | "custom";
  baseSessions?: number;
  bonusSessions?: number;
  price?: number | null;
}): Promise<ActionResult> {
  const guard = await requireStaffUser();
  if (!guard.ok) return { error: guard.error };
  let base: number;
  let bonus: number;
  if (input.courseType === "custom") {
    base = Math.floor(Number(input.baseSessions));
    bonus = Math.floor(Number(input.bonusSessions ?? 0));
    if (!Number.isFinite(base) || base < 1) return { error: "ระบุจำนวนครั้งของคอร์ส (อย่างน้อย 1)" };
    if (!Number.isFinite(bonus) || bonus < 0) bonus = 0;
  } else {
    if (!PKG[input.courseType]) return { error: "ชนิดคอร์สไม่ถูกต้อง" };
    ({ base, bonus } = PKG[input.courseType]);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      patient_id: input.patientId,
      course_type: input.courseType,
      base_sessions: base,
      bonus_sessions: bonus,
      price: input.price ?? null,
      status: "on_process",
      started_on: new Date().toISOString().slice(0, 10),
      created_by: guard.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await writeAudit({ action: "create", entity: "course", entityId: (data as { id: string }).id, actorId: guard.id, after: { courseType: input.courseType, base, bonus } });
  revalidatePath(`/staff/patients/${input.patientId}`);
  return { ok: true };
}

/**
 * Delete a course opened by mistake (client 3 ส.ค. 2569 — wrong session count
 * typed in). Refuses once anything hangs off it: sessions already booked or a
 * report written against it must not lose their link, and a course that has
 * been used is clinical history, not a typo. Detach-and-delete would silently
 * orphan the schedule, so the caller is told to fix the sessions first.
 */
export async function deleteCourse(input: { courseId: string; patientId: string }): Promise<ActionResult> {
  const guard = await requireStaffUser();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();

  const { count: sessionCount } = await supabase
    .from("schedule_sessions")
    .select("id", { count: "exact", head: true })
    .eq("course_id", input.courseId);
  if ((sessionCount ?? 0) > 0) {
    return { error: `ลบไม่ได้ — มีคิว ${sessionCount} รายการผูกกับคอร์สนี้ ให้ย้ายหรือลบคิวก่อน` };
  }

  const { count: reportCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("course_id", input.courseId);
  if ((reportCount ?? 0) > 0) return { error: "ลบไม่ได้ — มีรายงานผูกกับคอร์สนี้แล้ว" };

  const { data: before } = await supabase
    .from("courses")
    .select("course_type, base_sessions, bonus_sessions, status")
    .eq("id", input.courseId)
    .maybeSingle();

  const { error } = await supabase.from("courses").delete().eq("id", input.courseId);
  if (error) return { error: error.message };
  await writeAudit({ action: "delete", entity: "course", entityId: input.courseId, actorId: guard.id, before });
  revalidatePath(`/staff/patients/${input.patientId}`);
  return { ok: true };
}

/**
 * Record the ครบคอร์ส decision: Continue → mark current course outcome + open a
 * new course; No service → mark outcome no_service + set course/patient to
 * no_service (the Summary report + การวัดผล Score follow). Persists courses.outcome.
 */
export async function decideCourseOutcome(input: {
  patientId: string;
  courseId: string;
  decision: "continue" | "no_service";
  courseType: CoursePackage;
}): Promise<ActionResult> {
  const guard = await requireStaffUser();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();

  const { error: outErr } = await supabase
    .from("courses")
    .update({ outcome: input.decision })
    .eq("id", input.courseId);
  if (outErr) return { error: outErr.message };

  if (input.decision === "continue") {
    const res = await createCourse({ patientId: input.patientId, courseType: input.courseType });
    if (res.error) return res;
    await supabase.from("patients").update({ status: "active" }).eq("id", input.patientId);
  } else {
    await supabase.from("courses").update({ status: "no_service" }).eq("id", input.courseId);
    await supabase.from("patients").update({ status: "no_service" }).eq("id", input.patientId);
  }
  await writeAudit({ action: "update", entity: "course", entityId: input.courseId, actorId: guard.id, after: { outcome: input.decision } });
  revalidatePath(`/staff/patients/${input.patientId}`);
  return { ok: true };
}
