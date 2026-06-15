"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

/**
 * Public booking submission (unauthenticated). RLS blocks anon writes, so this
 * inserts via the service-role client. Honeypot + required-field + consent
 * checks stand in for the P2 rate-limited RPC.
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
  const { error } = await admin.from("bookings").insert({
    full_name: input.fullName.trim(),
    phone: input.phone.trim(),
    area: input.area.trim() || null,
    source: "public_form",
    consent_booking: true,
    status: "booked",
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Admin cancels a booking (optional reason kept in note). */
export async function cancelBooking(input: { id: string; reason?: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status: "cancelled" };
  if (input.reason?.trim()) patch.note = input.reason.trim();
  const { error } = await supabase.from("bookings").update(patch).eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/staff/bookings");
  return { ok: true };
}

/** Admin manually creates a booking/appointment (fallback to the public form). */
export async function createBooking(input: {
  fullName: string;
  phone: string;
  area: string;
  status: "booked" | "awaiting_payment" | "cancelled";
}): Promise<ActionResult> {
  if (!input.fullName.trim()) return { error: "กรอกชื่อ-สกุล" };
  if (!input.phone.trim()) return { error: "กรอกเบอร์โทร" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("bookings").insert({
    full_name: input.fullName.trim(),
    phone: input.phone.trim(),
    area: input.area.trim() || null,
    source: "manual",
    status: input.status,
    created_by: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/staff/bookings");
  return { ok: true };
}

/**
 * Admin converts a booking into a service recipient (ผู้รับบริการ): creates a
 * patient pre-filled from the booking, links it back, then opens the patient so
 * staff can complete the intake. HN is left blank (digits-only, filled later).
 */
export async function convertBookingToPatient(bookingId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, full_name, phone, status, patient_id")
    .eq("id", bookingId)
    .maybeSingle();
  const b = booking as
    | { id: string; full_name: string; phone: string | null; status: string; patient_id: string | null }
    | null;
  if (!b || b.status === "cancelled") return;

  // Already converted → just open the existing patient.
  if (b.patient_id) redirect(`/staff/patients/${b.patient_id}`);

  const { data: inserted, error } = await supabase
    .from("patients")
    .insert({
      full_name: b.full_name,
      phone: b.phone,
      referral_source: "booking",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const patientId = (inserted as { id: string }).id;

  await supabase.from("bookings").update({ patient_id: patientId }).eq("id", bookingId);

  revalidatePath("/staff/bookings");
  revalidatePath("/staff/patients");
  redirect(`/staff/patients/${patientId}`);
}
