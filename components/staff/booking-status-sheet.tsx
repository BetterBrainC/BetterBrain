"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { setAppointmentStatus } from "@/actions/bookings";
import { BOOKING_STATUS_LABEL } from "@/lib/i18n/th";
import { APPOINTMENT_SLOTS } from "@/lib/constants/slots";

type EmpOpt = { id: string; name: string; code: string | null };
type Status = keyof typeof BOOKING_STATUS_LABEL;

/**
 * Change a recipient's appointment status from the การทำนัด list. Choosing
 * ทำนัดแล้ว can book the first assessment inline (employee/date/slot) and moves
 * the recipient onto the ผู้รับบริการ page.
 */
export function BookingStatusSheet({
  patientId,
  fullName,
  currentStatus,
  employees,
  open,
  onOpenChange,
}: {
  patientId: string;
  fullName: string;
  currentStatus: Status;
  employees: EmpOpt[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>(currentStatus);
  const [employeeId, setEmployeeId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [slot, setSlot] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus);
      setEmployeeId(""); setDate(""); setSlot(""); setError(null);
    }
  }, [open, currentStatus]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const wantsAssign = status === "booked" && (employeeId || date || slot);
    if (wantsAssign && (!employeeId || !date || !slot)) {
      setError("เลือกพนักงาน วันที่ และช่วงเวลาให้ครบ");
      setBusy(false);
      return;
    }
    const res = await setAppointmentStatus({
      patientId,
      status,
      assignment: wantsAssign ? { employeeId, date, slot } : null,
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={() => onOpenChange(false)} title="เปลี่ยนสถานะ">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-surface-tint px-4 py-3 text-sm">
          <p className="font-medium text-navy">{fullName}</p>
        </div>
        <Field label="สถานะ">
          <Select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {(Object.keys(BOOKING_STATUS_LABEL) as Status[]).map((k) => (
              <option key={k} value={k}>{BOOKING_STATUS_LABEL[k]}</option>
            ))}
          </Select>
        </Field>
        {status === "booked" && (
          <div className="space-y-3 rounded-md bg-surface-tint p-3">
            <Field label="พนักงาน">
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">— ยังไม่เลือก —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}{emp.code ? ` (${emp.code})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="วันที่"><ThaiDateInput value={date} onChange={setDate} /></Field>
              <Field label="ช่วงเวลา">
                <Select value={slot} onChange={(e) => setSlot(e.target.value)}>
                  <option value="">เลือก slot</option>
                  {APPOINTMENT_SLOTS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </Select>
              </Field>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Button>
        </div>
      </form>
    </Sheet>
  );
}
