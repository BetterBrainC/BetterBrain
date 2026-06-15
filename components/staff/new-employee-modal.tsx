"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { createEmployee } from "@/actions/employees";

/** Admin provisions a new employee account (auth user + profile). */
export function NewEmployeeModal() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({
    fullName: "", email: "", password: "", employeeCode: "",
    positionTitle: "", licenseNo: "", phone: "",
    employmentType: "monthly" as "monthly" | "part_time",
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createEmployee(f);
    setBusy(false);
    if (res.error) return setError(res.error);
    setOpen(false);
    setF({ fullName: "", email: "", password: "", employeeCode: "", positionTitle: "", licenseNo: "", phone: "", employmentType: "monthly" });
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ เพิ่มพนักงาน</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="เพิ่มพนักงาน">
        <form onSubmit={submit} className="space-y-4">
          <Field label="ชื่อ-สกุล"><TextInput value={f.fullName} onChange={set("fullName")} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="อีเมล (สำหรับเข้าระบบ)"><TextInput type="email" value={f.email} onChange={set("email")} required /></Field>
            <Field label="รหัสผ่านเริ่มต้น"><TextInput type="text" value={f.password} onChange={set("password")} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="รหัสพนักงาน"><TextInput value={f.employeeCode} onChange={set("employeeCode")} placeholder="OT-003" /></Field>
            <Field label="ใบอนุญาตเลขที่"><TextInput value={f.licenseNo} onChange={set("licenseNo")} /></Field>
          </div>
          <Field label="ตำแหน่ง"><TextInput value={f.positionTitle} onChange={set("positionTitle")} placeholder="นักกิจกรรมบำบัด" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="โทรศัพท์"><TextInput type="tel" value={f.phone} onChange={set("phone")} /></Field>
            <Field label="ประเภทการจ้าง">
              <Select value={f.employmentType} onChange={set("employmentType")}>
                <option value="monthly">รายเดือน</option>
                <option value="part_time">พาร์ทไทม์</option>
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={busy}>{busy ? "กำลังสร้าง…" : "สร้างบัญชี"}</Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
