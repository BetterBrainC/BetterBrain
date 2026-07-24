"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit/log";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

type Profession = "pt" | "ot";

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
type Role = "employee" | "admin" | "director";

export async function createEmployee(input: {
  fullName: string;
  email: string;
  password: string;
  employeeCode: string;
  positionTitle: string;
  licenseNo: string;
  phone: string;
  employmentType: "monthly" | "part_time";
  profession?: Profession | null;
  role?: Role;
  photoUrl?: string | null;
}): Promise<ActionResult> {
  if (!input.fullName.trim()) return { error: "กรอกชื่อ-สกุล" };
  if (!/.+@.+\..+/.test(input.email)) return { error: "อีเมลไม่ถูกต้อง" };
  if (input.password.length < 6) return { error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };
  const desiredRole: Role = input.role ?? "employee";

  // Only staff may run this (the page is staff-guarded, re-check here too).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  // Assigning Admin/Director is a privilege escalation → Director-only.
  if ((desiredRole === "admin" || desiredRole === "director") && role !== "director") {
    return { error: "เฉพาะ Director เท่านั้นที่กำหนดสิทธิ์ Admin/Director ได้" };
  }

  const admin = createAdminClient();
  // Fail fast on the director cap (2) before creating an auth user we'd have to unwind.
  if (desiredRole === "director") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "director");
    if ((count ?? 0) >= 2) return { error: "มีบัญชี Director ครบ 2 บัญชีแล้ว ไม่สามารถเพิ่มได้" };
  }
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
      role: desiredRole,
      employee_code: input.employeeCode.trim() || null,
      position_title: input.positionTitle.trim() || null,
      license_no: input.licenseNo.trim() || null,
      phone: input.phone.trim() || null,
      employment_type: input.employmentType,
      profession: input.profession ?? null,
      photo_url: input.photoUrl ?? null,
    })
    .eq("id", newId);
  if (profErr) {
    if (/director account cap/i.test(profErr.message)) return { error: "มีบัญชี Director ครบ 2 บัญชีแล้ว ไม่สามารถเพิ่มได้" };
    return { error: profErr.message };
  }

  await writeAudit({ action: "create", entity: "employee", entityId: newId, after: { fullName: input.fullName.trim(), role: desiredRole, employmentType: input.employmentType, profession: input.profession ?? null } });
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
  profession?: Profession | null;
  photoUrl?: string | null;
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
      profession: input.profession ?? null,
      ...(input.photoUrl !== undefined ? { photo_url: input.photoUrl } : {}),
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

/**
 * Admin "ลบพนักงาน" — soft delete: disables the account (blocks every write via
 * is_enabled() + forces sign-out) while keeping the row for schedule/report
 * history. A true row delete would orphan past cases, so we never hard-delete.
 */
export async function deleteEmployee(input: { id: string }): Promise<ActionResult> {
  const admin = await adminIfStaff();
  if (!admin) return { error: "ไม่มีสิทธิ์" };
  const { error } = await admin
    .from("profiles")
    .update({ is_enabled: false })
    .eq("id", input.id)
    .eq("role", "employee");
  if (error) return { error: error.message };
  await writeAudit({ action: "delete", entity: "employee", entityId: input.id, after: { is_enabled: false } });
  revalidatePath("/staff/employees");
  return { ok: true };
}

/** Admin uploads an employee photo to the PUBLIC avatars bucket; returns its URL. */
export async function uploadEmployeePhoto(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "ไม่พบไฟล์" };
  if (file.size > 4_194_304) return { error: "ไฟล์ใหญ่เกิน 4MB" };
  const admin = await adminIfStaff();
  if (!admin) return { error: "ไม่มีสิทธิ์" };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `employees/${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) return { error: error.message };
  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
