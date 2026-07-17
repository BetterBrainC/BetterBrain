"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getRelativePortal,
  getRelativeReportDetail,
  type RelativePortalData,
  type ReportDetail,
} from "@/lib/data/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_ERR } from "@/lib/i18n/th";

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
 * Staff: set which report types the relatives portal exposes for a patient.
 * followup/summary live on relative_access; the รายงานประเมินแรกรับ (assessment)
 * flag lives in settings.extra.portal_show_assessment (default ON, no migration).
 */
export async function setRelativeReportVisibility(input: {
  patientId: string;
  showAssessment: boolean;
  showFollowup: boolean;
  showSummary: boolean;
}): Promise<{ ok?: boolean; error?: string }> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("relative_access")
    .update({ show_followup: input.showFollowup, show_summary: input.showSummary })
    .eq("patient_id", input.patientId)
    .eq("revoked", false)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "ยังไม่มีลิงก์ญาติ — สร้างลิงก์ก่อน" };

  const { data: setData } = await admin.from("settings").select("extra").eq("id", 1).maybeSingle();
  const extra = ((setData as { extra?: Record<string, unknown> } | null)?.extra ?? {}) as Record<string, unknown>;
  const showAssess = extra.portal_show_assessment && typeof extra.portal_show_assessment === "object"
    ? { ...(extra.portal_show_assessment as Record<string, unknown>) }
    : {};
  if (input.showAssessment) delete showAssess[input.patientId]; // default = ON
  else showAssess[input.patientId] = false;
  const { error: extraErr } = await admin
    .from("settings")
    .upsert({ id: 1, extra: { ...extra, portal_show_assessment: showAssess } }, { onConflict: "id" });
  if (extraErr) return { error: extraErr.message };
  return { ok: true };
}

/**
 * Staff: pin which โปรแกรมฝึกที่บ้าน the relatives portal shows for a recipient
 * (e.g. ผู้รับบริการฝึกกลืน → ส่งเฉพาะโปรแกรมฝึกกลืน). Empty program clears the
 * pin → the portal falls back to the recipient's own โปรแกรมการฝึก. Stored as a
 * patientId→program map in settings.extra.portal_home_programs (no migration).
 */
export async function setRelativePortalProgram(input: {
  patientId: string;
  program: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };
  if (!input.patientId) return { error: "ไม่พบผู้รับบริการ" };

  const admin = createAdminClient();
  const { data: setData } = await admin.from("settings").select("extra").eq("id", 1).maybeSingle();
  const extra = ((setData as { extra?: Record<string, unknown> } | null)?.extra ?? {}) as Record<string, unknown>;
  const pinned = extra.portal_home_programs && typeof extra.portal_home_programs === "object"
    ? { ...(extra.portal_home_programs as Record<string, unknown>) }
    : {};
  const program = input.program.trim();
  if (program) pinned[input.patientId] = program;
  else delete pinned[input.patientId];

  const { error } = await admin
    .from("settings")
    .upsert({ id: 1, extra: { ...extra, portal_home_programs: pinned } }, { onConflict: "id" });
  if (error) return { error: error.message };
  revalidatePath("/staff/relatives");
  return { ok: true };
}

/**
 * Staff: save the home-exercise guide (โปรแกรมฝึกที่บ้าน) for one course/program.
 * Stored as a program→items map in settings.extra.exercise_guides; the relatives
 * portal pulls the list matching that recipient's โปรแกรมการฝึก (or the pinned
 * portal program).
 */
export async function setExerciseGuide(input: {
  program: string;
  items: { title: string; detail: string }[];
}): Promise<{ ok?: boolean; error?: string }> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };
  const program = input.program.trim();
  if (!program) return { error: "ไม่พบคอร์สการฟื้นฟู" };

  const items = (input.items ?? [])
    .map((i) => ({ title: String(i.title ?? "").trim(), detail: String(i.detail ?? "").trim() }))
    .filter((i) => i.title.length > 0);

  const admin = createAdminClient();
  const { data: setData } = await admin.from("settings").select("extra").eq("id", 1).maybeSingle();
  const extra = ((setData as { extra?: Record<string, unknown> } | null)?.extra ?? {}) as Record<string, unknown>;
  const guides = extra.exercise_guides && typeof extra.exercise_guides === "object"
    ? { ...(extra.exercise_guides as Record<string, unknown>) }
    : {};
  guides[program] = items;

  const { error } = await admin
    .from("settings")
    .upsert({ id: 1, extra: { ...extra, exercise_guides: guides } }, { onConflict: "id" });
  if (error) return { error: error.message };
  revalidatePath("/staff/relatives");
  return { ok: true };
}

/**
 * Relative opts into Web Push from the portal (no auth user). Resolves the
 * token → relative_id server-side and stores the subscription keyed by the
 * relative. Idempotent on endpoint (re-subscribe on the same device upserts).
 */
export async function subscribeRelativePush(input: {
  token: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<{ ok?: boolean; error?: string }> {
  if (!input.endpoint || !input.p256dh || !input.auth) return { error: "ข้อมูล subscription ไม่ครบ" };
  const admin = createAdminClient();
  const { data: aData } = await admin
    .from("relative_access")
    .select("relative_id, revoked, expires_at")
    .eq("access_token", input.token)
    .maybeSingle();
  const access = aData as { relative_id: string; revoked: boolean; expires_at: string | null } | null;
  if (!access || access.revoked) return { error: "ลิงก์ไม่ถูกต้องหรือถูกยกเลิก" };
  if (access.expires_at && new Date(access.expires_at).getTime() <= Date.now())
    return { error: "ลิงก์หมดอายุ" };

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      profile_id: null,
      relative_id: access.relative_id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
      is_active: true,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: error.message };
  return { ok: true };
}

/** Relative turns off Web Push for a device (by endpoint). */
export async function unsubscribeRelativePush(endpoint: string): Promise<{ ok?: boolean; error?: string }> {
  if (!endpoint) return { error: "ไม่พบ endpoint" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint);
  if (error) return { error: error.message };
  return { ok: true };
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

/**
 * Relatives: fetch one report to view/print as PDF. Gated by the same two
 * factors as the portal itself — the opaque share token plus the recipient's
 * phone last-4 — and getRelativeReportDetail additionally checks the report
 * belongs to that recipient and is a type the clinic exposes.
 */
export async function getRelativeReport(
  token: string,
  last4: string,
  reportId: string,
): Promise<{ data?: ReportDetail; error?: string }> {
  const full = await getRelativePortal(token);
  if (!full) return { error: PORTAL_ERR.badLink };
  if (!/^\d{4}$/.test(last4) || last4 !== full.phoneLast4) return { error: PORTAL_ERR.badCode };

  const data = await getRelativeReportDetail(token, reportId);
  if (!data) return { error: PORTAL_ERR.noReport };
  return { data };
}
