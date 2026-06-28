"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { updateEmployee, resetPassword, setEmployeeEnabled } from "@/actions/employees";

export interface EmployeeAdminData {
  id: string;
  fullName: string;
  employeeCode: string;
  positionTitle: string;
  licenseNo: string;
  phone: string;
  employmentType: "monthly" | "part_time";
  profession: "pt" | "ot" | "";
  isEnabled: boolean;
}

export function EmployeeAdminPanel({ employee }: { employee: EmployeeAdminData }) {
  const router = useRouter();
  const [f, setF] = React.useState(employee);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);
  const set = (k: keyof EmployeeAdminData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อ-สกุล"><TextInput value={f.fullName} onChange={set("fullName")} required /></Field>
            <Field label="รหัสพนักงาน"><TextInput value={f.employeeCode} onChange={set("employeeCode")} /></Field>
            <Field label="วิชาชีพ">
              <Select value={f.profession} onChange={set("profession")}>
                <option value="">— ไม่ระบุ —</option>
                <option value="ot">นักกิจกรรมบำบัด (OT)</option>
                <option value="pt">นักกายภาพบำบัด (PT)</option>
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
