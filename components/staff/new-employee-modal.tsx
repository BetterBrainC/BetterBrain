"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/i18n/th";
import { createEmployee, uploadEmployeePhoto } from "@/actions/employees";

/** Admin provisions a new employee account (auth user + profile). */
export function NewEmployeeModal({ myRole }: { myRole: "admin" | "director" }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({
    fullName: "", email: "", password: "", employeeCode: "",
    positionTitle: "", licenseNo: "", phone: "",
    employmentType: "monthly" as "monthly" | "part_time",
    profession: "ot" as "pt" | "ot" | "other",
    role: "employee" as "employee" | "admin" | "director",
  });
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadEmployeePhoto(fd);
    setUploading(false);
    if (res.error) return setError(res.error);
    setPhotoUrl(res.url ?? null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createEmployee({ ...f, photoUrl });
    setBusy(false);
    if (res.error) return setError(res.error);
    setOpen(false);
    setF({ fullName: "", email: "", password: "", employeeCode: "", positionTitle: "", licenseNo: "", phone: "", employmentType: "monthly", profession: "ot", role: "employee" });
    setPhotoUrl(null);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ เพิ่มพนักงาน</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="เพิ่มพนักงาน">
        <form onSubmit={submit} className="space-y-4">
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
          <Field label="ชื่อ-สกุล"><TextInput value={f.fullName} onChange={set("fullName")} required /></Field>
          {myRole === "director" && (
            <Field label="สิทธิ์การใช้งาน (role)">
              <Select value={f.role} onChange={set("role")}>
                <option value="employee">{ROLE_LABEL.employee}</option>
                <option value="admin">{ROLE_LABEL.admin}</option>
                <option value="director">{ROLE_LABEL.director}</option>
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="อีเมล (สำหรับเข้าระบบ)"><TextInput type="email" value={f.email} onChange={set("email")} required /></Field>
            <Field label="รหัสผ่านเริ่มต้น"><TextInput type="text" value={f.password} onChange={set("password")} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="รหัสพนักงาน"><TextInput value={f.employeeCode} onChange={set("employeeCode")} placeholder="OT-003" /></Field>
            <Field label="ใบอนุญาตเลขที่"><TextInput value={f.licenseNo} onChange={set("licenseNo")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="วิชาชีพ">
              <Select value={f.profession} onChange={set("profession")}>
                <option value="ot">นักกิจกรรมบำบัด (OT)</option>
                <option value="pt">นักกายภาพบำบัด (PT)</option>
                <option value="other">อื่นๆ</option>
              </Select>
            </Field>
            <Field label="ตำแหน่ง"><TextInput value={f.positionTitle} onChange={set("positionTitle")} placeholder="นักกิจกรรมบำบัด" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="โทรศัพท์"><TextInput type="tel" value={f.phone} onChange={set("phone")} /></Field>
            <Field label="ประเภทการจ้าง">
              <Select value={f.employmentType} onChange={set("employmentType")}>
                <option value="monthly">Full-time</option>
                <option value="part_time">Part-time</option>
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={busy || uploading}>{busy ? "กำลังบันทึก…" : "เพิ่ม"}</Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
