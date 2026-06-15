"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export interface FormResult {
  ok?: boolean;
  error?: string;
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
type PatientStatus = (typeof PATIENT_STATUSES)[number];
type CourseStatus = (typeof COURSE_STATUSES)[number];

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
  const row = patientFromForm(formData);
  if (!row.full_name) return { error: "กรอกชื่อ-สกุล" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("patients")
    .insert({ ...row, created_by: user?.id ?? null });
  if (error) return { error: error.message };
  revalidatePath("/staff/patients");
  redirect("/staff/patients");
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
  revalidatePath(`/staff/patients/${input.patientId}`);
  return { ok: true };
}

/**
 * Admin creates an opaque, single-use registration link for a relative to fill
 * the intake. The token is random (not the HN) so the link is not enumerable.
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
  const { error } = await admin
    .from("patients")
    .upsert({ ...row, hn }, { onConflict: "hn" });
  if (error) return { error: error.message };
  const { error: markErr } = await admin
    .from("registration_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);
  if (markErr) console.error("Failed to mark registration link used:", markErr.message);
  return { ok: true };
}
