"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Textarea, Select } from "@/components/ui/field";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { DIAGNOSIS_LABEL, BOOKING_STATUS_LABEL } from "@/lib/i18n/th";
import type { FormResult } from "@/actions/patients";

type Action = (prev: FormResult, formData: FormData) => Promise<FormResult>;
type EmpOpt = { id: string; name: string; code: string | null };

// First-assessment slots (kept in step with the assignment calendar).
const APPT_SLOTS = ["09:00-10:00", "10:30-11:30", "13:00-14:00", "14:30-15:30"];

export type IntakeInitial = Partial<
  Record<
    | "full_name" | "age_years" | "dob" | "national_id" | "nationality" | "race"
    | "marital_status" | "gender" | "phone" | "address" | "underlying"
    | "drug_allergy" | "past_history" | "surgery_history" | "chief_complaint"
    | "diagnosis_category"
    | "training_program" | "ec_name" | "ec_relation" | "ec_phone",
    string | number | null
  >
>;

/**
 * Shared service-recipient intake form (ใบประวัติการรักษา / ประวัติผู้รับบริการ),
 * Thai-only labels. `action` is supplied by the caller:
 *  - "staff"    Admin create (redirects on success)
 *  - "relative" tokenized registration link (opaque token, hn read-only)
 *  - "edit"     Admin edit existing patient (hidden id; redirects on success)
 */
export function IntakeForm({
  action,
  mode,
  hn,
  token,
  patientId,
  initial,
  backHref,
  employees = [],
}: {
  action: Action;
  mode: "staff" | "relative" | "edit";
  hn?: string;
  token?: string;
  patientId?: string;
  initial?: IntakeInitial;
  backHref?: string;
  employees?: EmpOpt[];
}) {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(
    action,
    {},
  );
  // Appointment status is set only when Admin creates a new recipient.
  const [apptStatus, setApptStatus] = useState<keyof typeof BOOKING_STATUS_LABEL>("booked");
  const dv = (k: keyof IntakeInitial): string | undefined => {
    const v = initial?.[k];
    return v === null || v === undefined ? undefined : String(v);
  };
  const isIntake = mode !== "edit"; // edit does not re-collect consent

  if (state.ok) {
    return (
      <div className="py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal" />
        <h2 className="mt-3 font-display text-xl font-bold text-navy">
          {mode === "relative" ? "ส่งข้อมูลแล้ว ขอบคุณค่ะ" : "บันทึกผู้รับบริการแล้ว"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {mode === "relative"
            ? "หากข้อมูลไม่ครบ พนักงานจะเติมให้ตอนเข้าประเมินแรกรับ"
            : "บันทึกเรียบร้อย"}
        </p>
        {backHref && (
          <Link href={backHref}>
            <Button className="mt-5">กลับ</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {mode === "relative" && <input type="hidden" name="token" value={token ?? ""} />}
      {mode === "edit" && <input type="hidden" name="id" value={patientId ?? ""} />}
      <Card className="space-y-4">
        <CardTitle className="text-base">ข้อมูลทั่วไป</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Patient ID">
            <TextInput name="hn" inputMode="numeric" placeholder="69010000" defaultValue={hn} readOnly={mode === "relative"} />
          </Field>
          <Field label="ชื่อ-สกุล"><TextInput name="full_name" required defaultValue={dv("full_name")} /></Field>
          <Field label="อายุ (ปี)"><TextInput name="age_years" type="number" defaultValue={dv("age_years")} /></Field>
          <Field label="วันเดือนปีเกิด"><ThaiDateInput name="dob" defaultValue={dv("dob")} /></Field>
          <Field label="เลขประจำตัวประชาชน"><TextInput name="national_id" inputMode="numeric" defaultValue={dv("national_id")} /></Field>
          <Field label="เพศ">
            <Select name="gender" defaultValue={dv("gender") ?? ""}>
              <option value="" disabled>เลือก</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
              <option value="other">อื่นๆ</option>
            </Select>
          </Field>
          <Field label="โทรศัพท์"><TextInput name="phone" type="tel" defaultValue={dv("phone")} /></Field>
          <Field label="สัญชาติ"><TextInput name="nationality" defaultValue={dv("nationality")} /></Field>
          <Field label="เชื้อชาติ"><TextInput name="race" defaultValue={dv("race")} /></Field>
          <Field label="สถานภาพ"><TextInput name="marital_status" defaultValue={dv("marital_status")} /></Field>
        </div>
        <Field label="ที่อยู่"><Textarea name="address" defaultValue={dv("address")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="การวินิจฉัย">
            <Select name="diagnosis_category" defaultValue={dv("diagnosis_category") ?? ""}>
              <option value="">— ไม่ระบุ —</option>
              {(Object.keys(DIAGNOSIS_LABEL) as (keyof typeof DIAGNOSIS_LABEL)[]).map((k) => (
                <option key={k} value={k}>{DIAGNOSIS_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
          <Field label="คอร์สการฟื้นฟู (โปรแกรมการฝึก)"><TextInput name="training_program" placeholder="เช่น Swallowing Rehab" defaultValue={dv("training_program")} /></Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle className="text-base">ประวัติทางการแพทย์</CardTitle>
        <Field label="โรคประจำตัว (U/D)"><TextInput name="underlying" defaultValue={dv("underlying")} /></Field>
        <Field label="ประวัติการแพ้ยา"><TextInput name="drug_allergy" defaultValue={dv("drug_allergy")} /></Field>
        <Field label="ประวัติการรักษา"><Textarea name="past_history" defaultValue={dv("past_history")} /></Field>
        <Field label="ประวัติการผ่าตัด"><Textarea name="surgery_history" defaultValue={dv("surgery_history")} /></Field>
        <Field label="อาการเบื้องต้น"><Textarea name="chief_complaint" defaultValue={dv("chief_complaint")} /></Field>
      </Card>

      <Card className="space-y-4">
        <CardTitle className="text-base">
          {isIntake ? "ผู้ติดต่อฉุกเฉิน & ความยินยอม" : "ผู้ติดต่อฉุกเฉิน"}
        </CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="ชื่อผู้ติดต่อ"><TextInput name="ec_name" defaultValue={dv("ec_name")} /></Field>
          <Field label="ความสัมพันธ์"><TextInput name="ec_relation" defaultValue={dv("ec_relation")} /></Field>
          <Field label="โทรศัพท์"><TextInput name="ec_phone" type="tel" defaultValue={dv("ec_phone")} /></Field>
        </div>
        {isIntake && (
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" name="consent" className="mt-0.5" required />
            <span>ได้รับความยินยอม (PDPA) ให้เก็บและใช้ข้อมูลสุขภาพเพื่อการรักษา</span>
          </label>
        )}
      </Card>

      {mode === "staff" && (
        <Card className="space-y-4">
          <CardTitle className="text-base">สถานะการนัด</CardTitle>
          <Field label="สถานะ">
            <Select
              name="appointment_status"
              value={apptStatus}
              onChange={(e) => setApptStatus(e.target.value as keyof typeof BOOKING_STATUS_LABEL)}
            >
              {(Object.keys(BOOKING_STATUS_LABEL) as (keyof typeof BOOKING_STATUS_LABEL)[]).map((k) => (
                <option key={k} value={k}>{BOOKING_STATUS_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
          {apptStatus === "booked" && (
            <div className="space-y-3 rounded-md bg-surface-tint p-3">
              <p className="text-xs text-muted">นัดประเมินครั้งแรก (ไม่บังคับ — เว้นว่างเพื่อมอบหมายภายหลัง)</p>
              <Field label="พนักงาน">
                <Select name="appt_employee" defaultValue="">
                  <option value="">— ยังไม่เลือก —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}{emp.code ? ` (${emp.code})` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="วันที่"><ThaiDateInput name="appt_date" /></Field>
                <Field label="ช่วงเวลา">
                  <Select name="appt_slot" defaultValue="">
                    <option value="">เลือก slot</option>
                    {APPT_SLOTS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </Select>
                </Field>
              </div>
            </div>
          )}
        </Card>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">{state.error}</p>
      )}

      {state.duplicate && (
        <label className="flex items-start gap-2 rounded-md bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning-fg)]">
          <input type="checkbox" name="allow_duplicate" className="mt-0.5" />
          <span>ยืนยันเพิ่มผู้รับบริการแม้มีชื่อซ้ำในระบบ</span>
        </label>
      )}

      <div className="flex justify-end gap-3">
        {backHref && (
          <Link href={backHref}>
            <Button type="button" variant="secondary">ยกเลิก</Button>
          </Link>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : mode === "relative" ? "ส่งข้อมูล" : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}
