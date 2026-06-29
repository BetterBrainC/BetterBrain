"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { convertBookingToPatient } from "@/actions/bookings";
import { createAssignment } from "@/actions/scheduling";

type EmpOpt = { id: string; name: string; code: string | null };

const SLOTS = ["09:00-10:00", "10:30-11:30", "13:00-14:00", "14:30-15:30"];

interface Props {
  bookingId: string;
  fullName: string;
  phone: string;
  area: string | null;
  employees: EmpOpt[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Combines convert-to-patient + optional assessment assignment in one Sheet.
 * Stays on /staff/bookings after completing — no redirect.
 */
export function ConvertBookingSheet({
  bookingId,
  fullName,
  phone,
  area,
  employees,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [withAssign, setWithAssign] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [slot, setSlot] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setWithAssign(false);
    setEmployeeId("");
    setDate("");
    setSlot("");
    setError(null);
  }

  function close() {
    onOpenChange(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { patientId, error: convertErr } = await convertBookingToPatient(bookingId);
    if (convertErr || !patientId) {
      setError(convertErr ?? "แปลงไม่สำเร็จ");
      setBusy(false);
      return;
    }

    if (withAssign) {
      if (!employeeId || !date || !slot) {
        setError("เลือกพนักงาน วันที่ และช่วงเวลาให้ครบ");
        setBusy(false);
        return;
      }
      const res = await createAssignment({
        patientId,
        employeeId,
        date,
        slot,
        kind: "assessment",
        isSpecial: false,
        specialAmount: null,
      });
      if (res.error) {
        setError(res.error);
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    close();
    reset();
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={close} title="แปลงเป็นผู้รับบริการ">
      <form onSubmit={submit} className="space-y-4">
        {/* Booking summary — read-only */}
        <div className="rounded-lg bg-surface-tint px-4 py-3 text-sm space-y-1">
          <p className="font-medium text-navy">{fullName}</p>
          <p className="text-muted">{phone}{area ? ` · ${area}` : ""}</p>
        </div>

        {/* Optional assignment toggle */}
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-sm font-medium text-ink">มอบหมายนัดประเมินตอนนี้</span>
          <input
            type="checkbox"
            checked={withAssign}
            onChange={(e) => setWithAssign(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
        </label>

        {withAssign && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <Field label="พนักงาน">
              <Select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required={withAssign}
              >
                <option value="" disabled>เลือกพนักงาน</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}{emp.code ? ` (${emp.code})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="วันที่">
                <ThaiDateInput value={date} onChange={setDate} required={withAssign} />
              </Field>
              <Field label="ช่วงเวลา">
                <Select
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  required={withAssign}
                >
                  <option value="" disabled>เลือก slot</option>
                  {SLOTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={close} disabled={busy}>
            ยกเลิก
          </Button>
          <Button type="submit" className="flex-1" disabled={busy}>
            {busy ? "กำลังบันทึก…" : withAssign ? "แปลง + มอบหมาย" : "แปลงเท่านั้น"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
