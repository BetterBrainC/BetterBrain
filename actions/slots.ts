"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit/log";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

/** Replace an employee's work-hour slots (delete-all + insert). Staff only. */
export async function setEmployeeSlots(input: {
  employeeId: string;
  slots: { start: string; end: string; weekday: number | null }[];
}): Promise<ActionResult> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };
  for (const s of input.slots) {
    if (!/^\d{2}:\d{2}$/.test(s.start) || !/^\d{2}:\d{2}$/.test(s.end) || s.end <= s.start)
      return { error: "ช่วงเวลาไม่ถูกต้อง (เริ่มต้องน้อยกว่าสิ้นสุด)" };
  }
  // Use the verified server client for the role gate, service-role for the write
  // (work_hour_slots is staff-writable; admin client keeps it simple + audited).
  void (await createClient());
  const admin = createAdminClient();
  const { error: delErr } = await admin.from("work_hour_slots").delete().eq("employee_id", input.employeeId);
  if (delErr) return { error: delErr.message };
  if (input.slots.length > 0) {
    const { error: insErr } = await admin.from("work_hour_slots").insert(
      input.slots.map((s) => ({
        employee_id: input.employeeId,
        slot_start: s.start,
        slot_end: s.end,
        weekday: s.weekday,
        is_active: true,
      })),
    );
    if (insErr) return { error: insErr.message };
  }
  await writeAudit({ action: "update", entity: "work_hour_slots", entityId: input.employeeId, actorId: u!.id, after: { count: input.slots.length } });
  revalidatePath(`/staff/employees/${input.employeeId}`);
  return { ok: true };
}
