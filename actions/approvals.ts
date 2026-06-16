"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";

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

/** Director approves a check-in correction. */
export async function approveCorrection(id: string): Promise<void> {
  const { supabase, userId } = await uid();
  const { data: cr } = await supabase
    .from("correction_requests")
    .select("employee_id")
    .eq("id", id)
    .maybeSingle();
  await supabase
    .from("correction_requests")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
    .eq("id", id);
  await notifyCorrectionEmployee(
    (cr as { employee_id: string } | null)?.employee_id,
    "Director อนุมัติคำขอแก้เช็คอินของคุณแล้ว — รอ Admin ดำเนินการ",
  );
  revalidatePath("/staff/approvals");
}

export async function rejectCorrection(id: string): Promise<void> {
  const { supabase } = await uid();
  const { data: cr } = await supabase
    .from("correction_requests")
    .select("employee_id")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("correction_requests").update({ status: "rejected" }).eq("id", id);
  await notifyCorrectionEmployee(
    (cr as { employee_id: string } | null)?.employee_id,
    "คำขอแก้เช็คอินของคุณไม่ได้รับการอนุมัติ",
  );
  revalidatePath("/staff/approvals");
}

/** Admin applies an approved correction (stamps applied; flags the check-in as corrected). */
export async function applyCorrection(id: string): Promise<void> {
  const { supabase, userId } = await uid();
  const { data: cr } = await supabase
    .from("correction_requests")
    .select("check_in_id, status, employee_id")
    .eq("id", id)
    .maybeSingle();
  if (cr?.status !== "approved") return;
  await supabase
    .from("correction_requests")
    .update({ status: "applied", applied_by: userId, applied_at: new Date().toISOString() })
    .eq("id", id);
  if (cr.check_in_id) {
    await supabase.from("check_ins").update({ corrected: true }).eq("id", cr.check_in_id);
  }
  await notifyCorrectionEmployee(
    (cr as { employee_id: string } | null)?.employee_id,
    "Admin ดำเนินการแก้เช็คอินของคุณเรียบร้อยแล้ว",
  );
  revalidatePath("/staff/approvals");
}
