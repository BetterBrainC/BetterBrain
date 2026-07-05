"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit/log";
import { createAssignment } from "@/actions/scheduling";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

const BOOKING_STATUSES = [
  "booked",
  "awaiting_payment",
  "awaiting_appointment",
  "cancelled",
] as const;
type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Non-redirecting staff guard (role + live is_enabled). */
async function requireStaff(): Promise<
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

/**
 * Public booking submission (unauthenticated). RLS blocks anon writes, so this
 * inserts via the service-role client. A self-service submission always lands as
 * a รอชำระเงิน (awaiting_payment) recipient in the การทำนัด pipeline; staff/an
 * employee tops up the remaining intake fields at the first assessment.
 */
export async function submitPublicBooking(input: {
  fullName: string;
  phone: string;
  area: string;
  consent: boolean;
  website?: string; // honeypot — real users leave this empty
}): Promise<ActionResult> {
  if (input.website) return { ok: true }; // bot trap: pretend success, drop it
  if (!input.fullName.trim()) return { error: "กรอกชื่อ-สกุล" };
  if (!/\d{6,}/.test(input.phone.replace(/\D/g, ""))) return { error: "กรอกเบอร์โทรให้ถูกต้อง" };
  if (!input.consent) return { error: "กรุณายินยอมตาม PDPA" };
  const admin = createAdminClient();
  const { error } = await admin.from("patients").insert({
    full_name: input.fullName.trim(),
    phone: input.phone.trim() || null,
    address: input.area.trim() || null,
    referral_source: "public_form",
    consent_intake: true,
    appointment_status: "awaiting_payment",
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Staff moves a recipient along the appointment pipeline (รอชำระเงิน / รอทำนัด /
 * ทำนัดแล้ว / ยกเลิกนัด). Choosing ทำนัดแล้ว optionally books the first assessment
 * (employee + date + slot) in the same step, which also moves the recipient off
 * the การทำนัด list and onto the ผู้รับบริการ page.
 */
export async function setAppointmentStatus(input: {
  patientId: string;
  status: BookingStatus;
  assignment?: { employeeId: string; date: string; slot: string } | null;
}): Promise<ActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { error: guard.error };
  if (!input.patientId) return { error: "ไม่พบผู้รับบริการ" };
  if (!BOOKING_STATUSES.includes(input.status)) return { error: "สถานะไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({ appointment_status: input.status })
    .eq("id", input.patientId);
  if (error) return { error: error.message };

  // Book the first assessment right away when confirming ทำนัดแล้ว.
  if (input.status === "booked" && input.assignment) {
    const a = input.assignment;
    if (a.employeeId && a.date && a.slot) {
      const res = await createAssignment({
        patientId: input.patientId,
        employeeId: a.employeeId,
        date: a.date,
        slot: a.slot,
        kind: "assessment",
        isSpecial: false,
        specialAmount: null,
      });
      if (res.error) return { error: res.error };
    }
  }

  await writeAudit({
    action: "update",
    entity: "patient",
    entityId: input.patientId,
    actorId: guard.userId,
    after: { appointment_status: input.status },
  });
  revalidatePath("/staff/bookings");
  revalidatePath("/staff/patients");
  revalidatePath("/staff");
  return { ok: true };
}
