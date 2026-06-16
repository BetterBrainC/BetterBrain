"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit/log";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

/** Returns the admin client only if the caller is staff (admin/director). */
async function adminIfStaff(): Promise<ReturnType<typeof createAdminClient> | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  return role === "admin" || role === "director" ? createAdminClient() : null;
}

/**
 * Admin creates an employee: provisions the auth user (service-role) — the
 * handle_new_user trigger seeds a profile with role='employee' — then fills the
 * employment fields. Director cap (2) is enforced by a DB trigger, so creating
 * employees here is always safe.
 */
export async function createEmployee(input: {
  fullName: string;
  email: string;
  password: string;
  employeeCode: string;
  positionTitle: string;
  licenseNo: string;
  phone: string;
  employmentType: "monthly" | "part_time";
}): Promise<ActionResult> {
  if (!input.fullName.trim()) return { error: "กรอกชื่อ-สกุล" };
  if (!/.+@.+\..+/.test(input.email)) return { error: "อีเมลไม่ถูกต้อง" };
  if (input.password.length < 6) return { error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };

  // Only staff may run this (the page is staff-guarded, re-check here too).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() },
  });
  if (createErr) return { error: createErr.message };
  const newId = created.user?.id;
  if (!newId) return { error: "สร้างผู้ใช้ไม่สำเร็จ" };

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      employee_code: input.employeeCode.trim() || null,
      position_title: input.positionTitle.trim() || null,
      license_no: input.licenseNo.trim() || null,
      phone: input.phone.trim() || null,
      employment_type: input.employmentType,
    })
    .eq("id", newId);
  if (profErr) return { error: profErr.message };

  await writeAudit({ action: "create", entity: "employee", entityId: newId, after: { fullName: input.fullName.trim(), employmentType: input.employmentType } });
  revalidatePath("/staff/employees");
  return { ok: true };
}

/** Admin edits an existing employee's profile fields. */
export async function updateEmployee(input: {
  id: string;
  fullName: string;
  employeeCode: string;
  positionTitle: string;
  licenseNo: string;
  phone: string;
  employmentType: "monthly" | "part_time";
}): Promise<ActionResult> {
  if (!input.fullName.trim()) return { error: "กรอกชื่อ-สกุล" };
  const admin = await adminIfStaff();
  if (!admin) return { error: "ไม่มีสิทธิ์" };
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      employee_code: input.employeeCode.trim() || null,
      position_title: input.positionTitle.trim() || null,
      license_no: input.licenseNo.trim() || null,
      phone: input.phone.trim() || null,
      employment_type: input.employmentType,
    })
    .eq("id", input.id)
    .eq("role", "employee");
  if (error) return { error: error.message };
  await writeAudit({ action: "update", entity: "employee", entityId: input.id, after: { fullName: input.fullName.trim() } });
  revalidatePath(`/staff/employees/${input.id}`);
  revalidatePath("/staff/employees");
  return { ok: true };
}

/** Admin resets an employee's password (service-role). */
export async function resetPassword(input: { id: string; password: string }): Promise<ActionResult> {
  if (input.password.length < 6) return { error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };
  const admin = await adminIfStaff();
  if (!admin) return { error: "ไม่มีสิทธิ์" };
  const { error } = await admin.auth.admin.updateUserById(input.id, { password: input.password });
  if (error) return { error: error.message };
  await writeAudit({ action: "password_change", entity: "employee", entityId: input.id });
  return { ok: true };
}

/** Admin enables/disables an employee account (blocks writes via is_enabled()). */
export async function setEmployeeEnabled(input: { id: string; enabled: boolean }): Promise<ActionResult> {
  const admin = await adminIfStaff();
  if (!admin) return { error: "ไม่มีสิทธิ์" };
  const { error } = await admin
    .from("profiles")
    .update({ is_enabled: input.enabled })
    .eq("id", input.id)
    .eq("role", "employee");
  if (error) return { error: error.message };
  await writeAudit({ action: "update", entity: "employee", entityId: input.id, after: { is_enabled: input.enabled } });
  revalidatePath(`/staff/employees/${input.id}`);
  revalidatePath("/staff/employees");
  return { ok: true };
}
