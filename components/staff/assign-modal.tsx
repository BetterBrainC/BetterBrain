"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { createAssignment } from "@/actions/scheduling";

type Opt = { id: string; name: string };
type EmpOpt = { id: string; name: string; code: string | null };

const SLOTS = ["09:00-10:00", "10:30-11:30", "13:00-14:00", "14:30-15:30"];

/**
 * Admin case assignment (P4): patient → employee → date/time, with the
 * special-case extra-pay toggle. Persists to schedule_sessions + grants the
 * employee access to the patient (RLS backbone).
 */
export function AssignModal({
  patients,
  employees,
}: {
  patients: Opt[];
  employees: EmpOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [patientId, setPatientId] = React.useState("");
  const [employeeId, setEmployeeId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [slot, setSlot] = React.useState("");
  const [kind, setKind] = React.useState<"treatment" | "assessment">("treatment");
  const [special, setSpecial] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setPatientId(""); setEmployeeId(""); setDate(""); setSlot("");
    setKind("treatment"); setSpecial(false); setAmount(""); setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createAssignment({
      patientId,
      employeeId,
      date,
      slot,
      kind,
      isSpecial: special,
      specialAmount: special ? Number(amount) || null : null,
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ มอบหมายเคส</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="มอบหมายเคส">
        <form onSubmit={submit} className="space-y-4">
          <Field label="ผู้รับบริการ">
            <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="" disabled>เลือกผู้รับบริการ</option>
              {patients.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </Select>
          </Field>
          <Field label="พนักงาน">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="" disabled>เลือกพนักงาน</option>
              {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}{e.code ? ` (${e.code})` : ""}</option>))}
            </Select>
          </Field>
          <Field label="ประเภทงาน">
            <Select value={kind} onChange={(e) => setKind(e.target.value as "treatment" | "assessment")}>
              <option value="treatment">การรักษา</option>
              <option value="assessment">ประเมิน · Hand Function (ครั้งแรก ครั้งเดียว)</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="วันที่"><ThaiDateInput value={date} onChange={setDate} required /></Field>
            <Field label="ช่วงเวลา">
              <Select value={slot} onChange={(e) => setSlot(e.target.value)} required>
                <option value="" disabled>เลือก slot</option>
                {SLOTS.map((s) => (<option key={s} value={s}>{s}</option>))}
              </Select>
            </Field>
          </div>
          <div className="rounded-md bg-surface-tint p-3">
            <label className="flex items-center justify-between text-sm font-medium text-ink">
              เคสพิเศษ (เพิ่มเงินพิเศษ)
              <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} />
            </label>
            {special && (
              <div className="mt-2">
                <Field label="จำนวนเงินพิเศษ (บาท)">
                  <TextInput type="number" inputMode="numeric" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={busy}>{busy ? "กำลังบันทึก…" : "มอบหมาย"}</Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
