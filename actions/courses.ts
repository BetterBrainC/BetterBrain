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

/** Staff creates a course package for a patient (base/bonus derived from type). */
export async function createCourse(input: {
  patientId: string;
  courseType: CoursePackage;
  price?: number | null;
}): Promise<ActionResult> {
  const guard = await requireStaffUser();
  if (!guard.ok) return { error: guard.error };
  if (!PKG[input.courseType]) return { error: "ชนิดคอร์สไม่ถูกต้อง" };
  const { base, bonus } = PKG[input.courseType];
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
  await writeAudit({ action: "create", entity: "course", entityId: (data as { id: string }).id, actorId: guard.id, after: { courseType: input.courseType } });
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
