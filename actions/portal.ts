"use server";

import { randomUUID } from "node:crypto";
import { getRelativePortal, type RelativePortalData } from "@/lib/data/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

const PORTAL_LINK_TTL_DAYS = 90;

/**
 * Staff: get-or-create a relatives-portal share link for a patient. Reuses an
 * active (non-revoked, unexpired) token; otherwise ensures a relative row and
 * mints a new opaque token. Access is still gated by phone last-4 at the portal.
 * Returns the token; the caller builds `${origin}/r/<token>`.
 */
export async function createRelativeShareLink(
  patientId: string,
): Promise<{ token?: string; error?: string }> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };
  if (!patientId) return { error: "ไม่พบผู้รับบริการ" };

  const admin = createAdminClient();

  // Reuse an existing active link if any.
  const { data: existing } = await admin
    .from("relative_access")
    .select("access_token, expires_at, revoked")
    .eq("patient_id", patientId)
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ex = existing as { access_token: string; expires_at: string | null } | null;
  if (ex && (!ex.expires_at || new Date(ex.expires_at).getTime() > Date.now())) {
    return { token: ex.access_token };
  }

  // Ensure a relative row exists (relative_access.relative_id is NOT NULL).
  const { data: rel } = await admin
    .from("relatives")
    .select("id")
    .eq("patient_id", patientId)
    .limit(1)
    .maybeSingle();
  let relativeId = (rel as { id: string } | null)?.id;
  if (!relativeId) {
    const { data: created, error: relErr } = await admin
      .from("relatives")
      .insert({ patient_id: patientId, full_name: "ครอบครัวผู้รับบริการ", is_active: true })
      .select("id")
      .single();
    if (relErr) return { error: relErr.message };
    relativeId = (created as { id: string }).id;
  }

  const token = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + PORTAL_LINK_TTL_DAYS * 86_400_000).toISOString();
  const { error } = await admin.from("relative_access").insert({
    relative_id: relativeId,
    patient_id: patientId,
    access_token: token,
    consent_relative_portal: true,
    expires_at: expiresAt,
    revoked: false,
  });
  if (error) return { error: error.message };
  return { token };
}

/**
 * Verify the relatives portal phone last-4 SERVER-SIDE. The expected value never
 * reaches the browser — only a matched last-4 unlocks the (stripped) data.
 */
export async function verifyRelativePortal(
  token: string,
  last4: string,
): Promise<{ data?: RelativePortalData; error?: string }> {
  const full = await getRelativePortal(token);
  if (!full) return { error: "ลิงก์ไม่ถูกต้องหรือหมดอายุ" };
  if (!/^\d{4}$/.test(last4) || last4 !== full.phoneLast4) {
    return { error: "รหัสไม่ถูกต้อง" };
  }
  const { phoneLast4: _omit, ...data } = full;
  void _omit;
  return { data };
}
