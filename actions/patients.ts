"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit/log";
import { createAssignment } from "@/actions/scheduling";

export interface FormResult {
  ok?: boolean;
  error?: string;
  duplicate?: boolean; // a same-name recipient exists — confirm to add anyway
}

// Registration links stay valid for a bounded window (the relative may re-open
// the link to correct data within it); after that the token is rejected. This
// bounds token replay without breaking the intentional edit-on-reopen flow.
const REGISTRATION_LINK_TTL_DAYS = 14;
function isRegistrationLinkExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  return (
    Number.isFinite(created) &&
    Date.now() - created > REGISTRATION_LINK_TTL_DAYS * 86_400_000
  );
}

const PATIENT_STATUSES = ["active", "hold", "no_service"] as const;
const COURSE_STATUSES = ["on_process", "hold", "course_complete", "no_service"] as const;
const BOOKING_STATUSES = ["booked", "awaiting_payment", "awaiting_appointment", "cancelled"] as const;
type PatientStatus = (typeof PATIENT_STATUSES)[number];
type CourseStatus = (typeof COURSE_STATUSES)[number];
type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Reads the appointment status from an intake form, defaulting to ทำนัดแล้ว. */
function readBookingStatus(v: FormDataEntryValue | null): BookingStatus {
  const s = String(v ?? "").trim();
  return (BOOKING_STATUSES as readonly string[]).includes(s) ? (s as BookingStatus) : "booked";
}

/** Non-redirecting staff guard for server actions (role + live is_enabled). */
async function requireStaffAction(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, error: "ไม่ได้เข้าสู่ระบบ" };
  const role = u.profile?.role;
  if (role !== "admin" && role !== "director")
    return { ok: false, error: "ไม่มีสิทธิ์ดำเนินการ" };
  if (u.profile?.is_enabled === false)
    return { ok: false, error: "บัญชีถูกปิดการใช้งาน" };
  return { ok: true, userId: u.id };
}

function patientFromForm(formData: FormData) {
  const num = (v: FormDataEntryValue | null) => {
    const n = Number(String(v ?? "").trim());
    return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
  };
  return {
    hn: String(formData.get("hn") ?? "").trim() || null,
    full_name: String(formData.get("full_name") ?? "").trim(),
    age_years: num(formData.get("age_years")),
    dob: String(formData.get("dob") ?? "").trim() || null,
    national_id: String(formData.get("national_id") ?? "").trim() || null,
    nationality: String(formData.get("nationality") ?? "").trim() || null,
    race: String(formData.get("race") ?? "").trim() || null,
    marital_status: String(formData.get("marital_status") ?? "").trim() || null,
    gender: (String(formData.get("gender") ?? "").trim() || null) as
      | "male" | "female" | "other" | null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    underlying: String(formData.get("underlying") ?? "").trim() || null,
    drug_allergy: String(formData.get("drug_allergy") ?? "").trim() || null,
    past_history: String(formData.get("past_history") ?? "").trim() || null,
    surgery_history: String(formData.get("surgery_history") ?? "").trim() || null,
    chief_complaint: String(formData.get("chief_complaint") ?? "").trim() || null,
    diagnosis_category: (String(formData.get("diagnosis_category") ?? "").trim() || null) as
      | "stroke" | "parkinson" | "dementia_alzheimer" | "als" | "ms" | "other" | null,
    training_program: String(formData.get("training_program") ?? "").trim() || null,
    emergency_contact_name: String(formData.get("ec_name") ?? "").trim() || null,
    emergency_contact_relation: String(formData.get("ec_relation") ?? "").trim() || null,
    emergency_contact_phone: String(formData.get("ec_phone") ?? "").trim() || null,
    consent_intake: formData.get("consent") === "on",
  };
}

/** Staff creates a service recipient (RLS: staff insert). */
export async function createPatient(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const guard = await requireStaffAction();
  if (!guard.ok) return { error: guard.error };
  const row = patientFromForm(formData);
  if (!row.full_name) return { error: "กรอกชื่อ-สกุล" };
  const supabase = await createClient();
  // Prevent accidental duplicate names; Admin can confirm to add anyway
  // (same names are common in Thai healthcare) — client Final brief (Admin #5).
  const allowDuplicate = formData.get("allow_duplicate") === "on";
  if (!allowDuplicate) {
    const { data: dup } = await supabase
      .from("patients")
      .select("id")
      .eq("full_name", row.full_name)
      .limit(1);
    if (dup && dup.length > 0) {
      return {
        error: `มีผู้รับบริการชื่อ "${row.full_name}" อยู่แล้วในระบบ — หากต้องการเพิ่มจริง ติ๊กยืนยันด้านล่างแล้วบันทึกอีกครั้ง`,
        duplicate: true,
      };
    }
  }
  const appointmentStatus = readBookingStatus(formData.get("appointment_status"));

  // Confirming ทำนัดแล้ว may book the first assessment (พนักงาน/วัน/เวลา) inline.
  // Validate all-or-nothing up front so a partial entry never orphans a record.
  const employeeId = String(formData.get("appt_employee") ?? "").trim();
  const apptDate = String(formData.get("appt_date") ?? "").trim();
  const apptSlot = String(formData.get("appt_slot") ?? "").trim();
  const wantsAssign = appointmentStatus === "booked" && (employeeId || apptDate || apptSlot);
  if (wantsAssign && (!employeeId || !apptDate || !apptSlot))
    return { error: "เลือกพนักงาน วันที่ และช่วงเวลานัดประเมินให้ครบ" };

  const { data: inserted, error } = await supabase
    .from("patients")
    .insert({ ...row, appointment_status: appointmentStatus, created_by: guard.userId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const patientId = (inserted as { id: string }).id;

  if (wantsAssign) {
    const res = await createAssignment({
      patientId,
      employeeId,
      date: apptDate,
      slot: apptSlot,
      kind: "assessment",
      isSpecial: false,
      specialAmount: null,
    });
    if (res.error) return { error: res.error };
  }

  revalidatePath("/staff/patients");
  revalidatePath("/staff/bookings");
  // ทำนัดแล้ว shows on the patients page; the rest stay in the การทำนัด pipeline.
  redirect(appointmentStatus === "booked" ? "/staff/patients" : "/staff/bookings");
}

/** Staff edits an existing service recipient → updates editable fields. */
export async function updatePatient(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const guard = await requireStaffAction();
  if (!guard.ok) return { error: guard.error };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบรหัสผู้รับบริการ" };
  const row = patientFromForm(formData);
  if (!row.full_name) return { error: "กรอกชื่อ-สกุล" };
  const supabase = await createClient();
  // consent_intake is set at intake only; do not flip it false on a staff edit.
  const { consent_intake: _omit, ...editable } = row;
  const { error } = await supabase.from("patients").update(editable).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/staff/patients/${id}`);
  revalidatePath("/staff/patients");
  redirect(`/staff/patients/${id}`);
}

/** Staff transitions a service recipient's status (active/hold/no_service). */
export async function setPatientStatus(input: {
  id: string;
  status: PatientStatus;
}): Promise<FormResult> {
  const guard = await requireStaffAction();
  if (!guard.ok) return { error: guard.error };
  if (!PATIENT_STATUSES.includes(input.status)) return { error: "สถานะไม่ถูกต้อง" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({ status: input.status })
    .eq("id", input.id);
  if (error) return { error: error.message };
  await writeAudit({ action: "update", entity: "patient", entityId: input.id, actorId: guard.userId, after: { status: input.status } });
  revalidatePath(`/staff/patients/${input.id}`);
  revalidatePath("/staff/patients");
  return { ok: true };
}

/** Staff transitions a course's status (on_process/hold/course_complete/no_service). */
export async function setCourseStatus(input: {
  courseId: string;
  patientId: string;
  status: CourseStatus;
}): Promise<FormResult> {
  const guard = await requireStaffAction();
  if (!guard.ok) return { error: guard.error };
  if (!COURSE_STATUSES.includes(input.status)) return { error: "สถานะไม่ถูกต้อง" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ status: input.status })
    .eq("id", input.courseId);
  if (error) return { error: error.message };
  await writeAudit({ action: "update", entity: "course", entityId: input.courseId, actorId: guard.userId, after: { status: input.status } });
  revalidatePath(`/staff/patients/${input.patientId}`);
  return { ok: true };
}

/**
 * Admin creates an opaque, time-bounded registration link for a relative to fill
 * the intake. The token is random (not the HN) so the link is not enumerable, and
 * stays valid for 14 days (re-openable within that window to correct data).
 */
export async function createRegistrationLink(input: {
  hn: string;
}): Promise<{ token?: string; error?: string }> {
  const guard = await requireStaffAction();
  if (!guard.ok) return { error: guard.error };
  const hn = input.hn.trim();
  if (!/^\d{4,}$/.test(hn)) return { error: "HN ต้องเป็นตัวเลขอย่างน้อย 4 หลัก" };
  const token = randomUUID().replace(/-/g, "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("registration_links")
    .insert({ token, hn, created_by: guard.userId });
  if (error) return { error: error.message };
  await writeAudit({ action: "create", entity: "registration_link", entityId: hn, actorId: guard.userId });
  return { token };
}

/**
 * Relative fills the registration link (no auth). The hn is resolved from the
 * opaque token server-side (client-supplied hn is ignored) → upsert by HN via
 * service role, then mark the link used.
 */
export async function submitRegistration(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "ลิงก์ไม่ถูกต้อง" };
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("registration_links")
    .select("hn, created_at")
    .eq("token", token)
    .maybeSingle();
  const l = link as { hn: string; created_at: string } | null;
  if (!l) return { error: "ลิงก์ไม่ถูกต้องหรือหมดอายุ" };
  if (isRegistrationLinkExpired(l.created_at))
    return { error: "ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่จากเจ้าหน้าที่" };
  const hn = l.hn;

  const row = patientFromForm(formData);
  if (!row.full_name) return { error: "กรอกชื่อ-สกุล" };
  // A relative filling the link starts a รอชำระเงิน recipient, but re-opening the
  // link to correct data must not regress an already-advanced appointment status.
  const { data: existing } = await admin
    .from("patients")
    .select("id")
    .eq("hn", hn)
    .maybeSingle();
  const upsertRow = existing
    ? { ...row, hn }
    : { ...row, hn, appointment_status: "awaiting_payment" as const };
  const { error } = await admin
    .from("patients")
    .upsert(upsertRow, { onConflict: "hn" });
  if (error) return { error: error.message };
  const { error: markErr } = await admin
    .from("registration_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);
  if (markErr) console.error("Failed to mark registration link used:", markErr.message);
  return { ok: true };
}
