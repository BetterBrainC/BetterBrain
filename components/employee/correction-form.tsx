"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Textarea, Select } from "@/components/ui/field";
import { Time24Input } from "@/components/ui/time24-input";
import { createCorrection, type FormResult } from "@/actions/requests";

export function CorrectionForm({
  sessions,
}: {
  sessions: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createCorrection,
    {},
  );

  if (state.ok) {
    return (
      <div className="px-[var(--gutter-page)] py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal" />
        <h1 className="mt-3 font-display text-xl font-bold text-navy">ส่งคำขอแก้ไขแล้ว</h1>
        <p className="mt-1 text-sm text-muted">Director อนุมัติ → Admin เป็นผู้แก้ไขให้</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 px-[var(--gutter-page)] pt-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">ขอแก้ไขเช็คอิน</h1>
        <p className="text-sm text-muted">กรณีลืมเช็คอิน/เช็คเอาท์ หรือเวลาผิด</p>
      </header>

      <Card className="space-y-4">
        <CardTitle className="text-base">รายละเอียดคำขอ</CardTitle>
        <Field label="เลือกผู้รับบริการ">
          <Select name="session_id" defaultValue="" required>
            <option value="" disabled>เลือกผู้รับบริการ</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="หัวข้อที่ขอแก้">
          <Select name="field" defaultValue="checkin_time">
            <option value="checkin_time">เวลาเช็คอิน</option>
            <option value="checkout_time">เวลาเช็คเอาท์</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="เวลาเดิม"><Time24Input name="from_time" /></Field>
          <Field label="เวลาที่ถูกต้อง"><Time24Input name="to_time" /></Field>
        </div>
        <Field label="เหตุผล"><Textarea name="reason" required /></Field>
        {state.error && (
          <p className="rounded-md bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">{state.error}</p>
        )}
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "กำลังส่ง…" : "ส่งคำขอแก้ไข"}
      </Button>
    </form>
  );
}
