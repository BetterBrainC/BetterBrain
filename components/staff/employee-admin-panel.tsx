"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/i18n/th";
import {
  updateEmployee, resetPassword, setEmployeeEnabled, setEmployeeRole,
  setEmployeeEmail, uploadEmployeePhoto,
} from "@/actions/employees";

type Role = "employee" | "admin" | "director";

export interface EmployeeAdminData {
  id: string;
  fullName: string;
  employeeCode: string;
  positionTitle: string;
  licenseNo: string;
  phone: string;
  employmentType: "monthly" | "part_time";
  profession: "pt" | "ot" | "other" | "";
  role: Role;
  isEnabled: boolean;
  photoUrl: string | null;
  email: string;
}

export function EmployeeAdminPanel({ employee, canEditRole }: { employee: EmployeeAdminData; canEditRole: boolean }) {
  const router = useRouter();
  const [f, setF] = React.useState(employee);

  const [role, setRole] = React.useState<Role>(employee.role);
  const [roleBusy, setRoleBusy] = React.useState(false);
  const [roleMsg, setRoleMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);
  async function saveRole(e: React.FormEvent) {
    e.preventDefault();
    setRoleBusy(true);
    setRoleMsg(null);
    const res = await setEmployeeRole({ id: f.id, role });
    setRoleBusy(false);
    setRoleMsg(res);
    if (res.ok) router.refresh();
  }
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);
  const set = (k: keyof EmployeeAdminData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const [photoUrl, setPhotoUrl] = React.useState<string | null>(employee.photoUrl);
  const [uploading, setUploading] = React.useState(false);
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    // try/finally is the point: a throwing action (offline, timeout, oversized
    // upload) used to leave the label stuck on "กำลังอัปโหลด…" with no error
    // shown at all (client 31 ก.ค. 2569).
    try {
      const fd = new FormData();
      fd.set("file", file);
      const up = await uploadEmployeePhoto(fd);
      if (up.error) return setMsg({ error: up.error });
      // Persist immediately — an uploaded file that is never saved looks like a
      // silent failure ("อัปโหลดแล้วไม่มีรูป", client 30 ก.ค. 2569).
      const res = await updateEmployee({ ...f, profession: f.profession || null, photoUrl: up.url ?? null });
      setMsg(res);
      if (res.ok) {
        setPhotoUrl(up.url ?? null);
        router.refresh();
      }
    } catch {
      setMsg({ error: "อัปโหลดรูปไม่สำเร็จ — ตรวจสอบไฟล์ (ไม่เกิน 4MB) แล้วลองใหม่" });
    } finally {
      setUploading(false);
      e.target.value = ""; // let the same file be picked again after a failure
    }
  }

  const [email, setEmail] = React.useState(employee.email);
  const [emailBusy, setEmailBusy] = React.useState(false);
  const [emailMsg, setEmailMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);
  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailBusy(true);
    setEmailMsg(null);
    const res = await setEmployeeEmail({ id: f.id, email });
    setEmailBusy(false);
    setEmailMsg(res);
    if (res.ok) router.refresh();
  }

  const [pw, setPw] = React.useState("");
  const [pwBusy, setPwBusy] = React.useState(false);
  const [pwMsg, setPwMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  const [enabled, setEnabled] = React.useState(employee.isEnabled);
  const [, startToggle] = React.useTransition();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await updateEmployee({
      id: f.id,
      fullName: f.fullName,
      employeeCode: f.employeeCode,
      positionTitle: f.positionTitle,
      licenseNo: f.licenseNo,
      phone: f.phone,
      employmentType: f.employmentType,
      profession: f.profession || null,
    });
    setBusy(false);
    setMsg(res);
    if (res.ok) router.refresh();
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    setPwMsg(null);
    const res = await resetPassword({ id: f.id, password: pw });
    setPwBusy(false);
    setPwMsg(res);
    if (res.ok) setPw("");
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    startToggle(async () => {
      const res = await setEmployeeEnabled({ id: f.id, enabled: next });
      if (res.error) setEnabled(!next);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save}>
        <Card className="space-y-4">
          <CardTitle className="text-base">แก้ไขโปรไฟล์</CardTitle>
          <div className="flex items-center gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-tint text-muted">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-16 w-16 object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
            </span>
            <label className="cursor-pointer text-sm font-medium text-primary-700 hover:underline">
              {uploading ? "กำลังอัปโหลด…" : photoUrl ? "เปลี่ยนรูป" : "เพิ่มรูปพนักงาน"}
              <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} disabled={uploading} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อ-สกุล"><TextInput value={f.fullName} onChange={set("fullName")} required /></Field>
            <Field label="รหัสพนักงาน"><TextInput value={f.employeeCode} onChange={set("employeeCode")} /></Field>
            <Field label="วิชาชีพ">
              <Select value={f.profession} onChange={set("profession")}>
                <option value="">— ไม่ระบุ —</option>
                <option value="ot">นักกิจกรรมบำบัด (OT)</option>
                <option value="pt">นักกายภาพบำบัด (PT)</option>
                <option value="other">อื่นๆ</option>
              </Select>
            </Field>
            <Field label="ตำแหน่ง"><TextInput value={f.positionTitle} onChange={set("positionTitle")} /></Field>
            <Field label="ใบอนุญาตเลขที่"><TextInput value={f.licenseNo} onChange={set("licenseNo")} /></Field>
            <Field label="โทรศัพท์"><TextInput type="tel" value={f.phone} onChange={set("phone")} /></Field>
            <Field label="ประเภทการจ้าง">
              <Select value={f.employmentType} onChange={set("employmentType")}>
                <option value="monthly">Full-time</option>
                <option value="part_time">Part-time</option>
              </Select>
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3">
            {msg?.error && <p className="text-sm text-[var(--danger-fg)]">{msg.error}</p>}
            {msg?.ok && <p className="text-sm text-teal">บันทึกแล้ว</p>}
            <Button type="submit" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </div>
        </Card>
      </form>

      {canEditRole && (
        <form onSubmit={saveRole}>
          <Card className="space-y-3">
            <CardTitle className="text-base">สิทธิ์การใช้งาน (role)</CardTitle>
            <div className="flex items-end gap-2">
              <Field label="กำหนดสิทธิ์" className="flex-1">
                <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="employee">{ROLE_LABEL.employee}</option>
                  <option value="admin">{ROLE_LABEL.admin}</option>
                  <option value="director">{ROLE_LABEL.director}</option>
                </Select>
              </Field>
              <Button type="submit" variant="secondary" disabled={roleBusy || role === employee.role}>
                {roleBusy ? "กำลังบันทึก…" : "บันทึกสิทธิ์"}
              </Button>
            </div>
            {roleMsg?.error && <p className="text-sm text-[var(--danger-fg)]">{roleMsg.error}</p>}
            {roleMsg?.ok && <p className="text-sm text-teal">อัปเดตสิทธิ์แล้ว</p>}
          </Card>
        </form>
      )}

      <form onSubmit={saveEmail}>
        <Card className="space-y-3">
          <CardTitle className="text-base">อีเมลสำหรับเข้าระบบ</CardTitle>
          <div className="flex items-end gap-2">
            <Field label="อีเมล" className="flex-1">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Button type="submit" variant="secondary" disabled={emailBusy || email.trim() === employee.email}>
              {emailBusy ? "กำลังบันทึก…" : "บันทึกอีเมล"}
            </Button>
          </div>
          {emailMsg?.error && <p className="text-sm text-[var(--danger-fg)]">{emailMsg.error}</p>}
          {emailMsg?.ok && <p className="text-sm text-teal">อัปเดตอีเมลแล้ว</p>}
        </Card>
      </form>

      <form onSubmit={changePw}>
        <Card className="space-y-3">
          <CardTitle className="text-base">รีเซ็ตรหัสผ่าน</CardTitle>
          <div className="flex items-end gap-2">
            <Field label="รหัสผ่านใหม่" className="flex-1">
              <TextInput type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
            </Field>
            <Button type="submit" variant="secondary" disabled={pwBusy || pw.length < 6}>
              {pwBusy ? "กำลังรีเซ็ต…" : "รีเซ็ต"}
            </Button>
          </div>
          {pwMsg?.error && <p className="text-sm text-[var(--danger-fg)]">{pwMsg.error}</p>}
          {pwMsg?.ok && <p className="text-sm text-teal">รีเซ็ตรหัสผ่านแล้ว</p>}
        </Card>
      </form>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">สถานะบัญชี</CardTitle>
            <p className="mt-0.5 text-sm text-muted">
              {enabled ? "ใช้งานอยู่ — เข้าระบบและบันทึกได้" : "ปิดใช้งาน — ถูกบล็อกทุกการเขียน + บังคับออกจากระบบ"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleEnabled}
            aria-pressed={enabled}
            className={"relative h-6 w-11 shrink-0 rounded-full transition-colors " + (enabled ? "bg-primary" : "bg-border-strong")}
          >
            <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " + (enabled ? "left-[22px]" : "left-0.5")} />
          </button>
        </div>
      </Card>
    </div>
  );
}
