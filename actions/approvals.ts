"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications/create";
import { writeAudit } from "@/lib/audit/log";

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** Notify the correction's submitter (in-app + Web Push). */
async function notifyCorrectionEmployee(employeeId: string | null | undefined, body: string) {
  if (!employeeId) return;
  await createNotification({
    type: "correction_decision",
    audience: "employee",
    recipientProfileId: employeeId,
    channel: "push",
    title: "คำขอแก้เช็คอิน",
    body,
    url: "/app/corrections",
  });
}

/** Director approves a check-in correction. (Server-side role gate, not UI-only.) */
export async function approveCorrection(id: string): Promise<{ error?: string } | void> {
  const u = await getCurrentUser();
  if (u?.profile?.role !== "director") return { error: "เฉพาะ Director เท่านั้นที่อนุมัติได้" };
  const { supabase, userId } = await uid();
  const { data: cr } = await supabase
    .from("correction_requests")
    .select("employee_id, status")
    .eq("id", id)
    .maybeSingle();
  if ((cr as { status?: string } | null)?.status !== "pending") return { error: "คำขอนี้ถูกดำเนินการไปแล้ว" };
  await supabase
    .from("correction_requests")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
    .eq("id", id);
  await writeAudit({ action: "approve", entity: "correction_request", entityId: id, actorId: userId, actorRole: "director" });
  await notifyCorrectionEmployee(
    (cr as { employee_id: string } | null)?.employee_id,
    "Director อนุมัติคำขอแก้เช็คอินของคุณแล้ว — รอ Admin ดำเนินการ",
  );
  revalidatePath("/staff/approvals");
}

export async function rejectCorrection(id: string): Promise<{ error?: string } | void> {
  const u = await getCurrentUser();
  if (u?.profile?.role !== "director") return { error: "เฉพาะ Director เท่านั้นที่ปฏิเสธได้" };
  const { supabase, userId } = await uid();
  const { data: cr } = await supabase
    .from("correction_requests")
    .select("employee_id, status")
    .eq("id", id)
    .maybeSingle();
  if ((cr as { status?: string } | null)?.status !== "pending") return { error: "คำขอนี้ถูกดำเนินการไปแล้ว" };
  await supabase
    .from("correction_requests")
    .update({ status: "rejected", approved_by: userId, approved_at: new Date().toISOString() })
    .eq("id", id);
  await writeAudit({ action: "reject", entity: "correction_request", entityId: id, actorId: userId, actorRole: "director" });
  await notifyCorrectionEmployee(
    (cr as { employee_id: string } | null)?.employee_id,
    "คำขอแก้เช็คอินของคุณไม่ได้รับการอนุมัติ",
  );
  revalidatePath("/staff/approvals");
}

/** Admin applies an approved correction: writes the corrected time onto the check-in. */
export async function applyCorrection(id: string): Promise<{ error?: string } | void> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  const { supabase, userId } = await uid();
  const { data: cr } = await supabase
    .from("correction_requests")
    .select("check_in_id, status, employee_id, requested_changes")
    .eq("id", id)
    .maybeSingle();
  const row = cr as
    | { check_in_id: string | null; status: string; employee_id: string; requested_changes: { field?: string; to?: string } | null }
    | null;
  if (row?.status !== "approved") return { error: "ต้องได้รับการอนุมัติจาก Director ก่อน" };

  await supabase
    .from("correction_requests")
    .update({ status: "applied", applied_by: userId, applied_at: new Date().toISOString() })
    .eq("id", id);

  let before: unknown = null;
  if (row.check_in_id) {
    const { data: prevCi } = await supabase.from("check_ins").select("client_event_at").eq("id", row.check_in_id).maybeSingle();
    before = prevCi;
    // Apply the requested corrected time when it parses; always flag as corrected.
    const to = row.requested_changes?.to ?? "";
    const patch: Record<string, unknown> = { corrected: true };
    if (to && !Number.isNaN(Date.parse(to))) patch.client_event_at = new Date(to).toISOString();
    await supabase.from("check_ins").update(patch as never).eq("id", row.check_in_id);
  }
  await writeAudit({
    action: "apply_correction",
    entity: "check_in",
    entityId: row.check_in_id,
    actorId: userId,
    actorRole: (role ?? null) as never,
    before,
    after: row.requested_changes,
  });
  await notifyCorrectionEmployee(row.employee_id, "Admin ดำเนินการแก้เช็คอินของคุณเรียบร้อยแล้ว");
  revalidatePath("/staff/approvals");
}
