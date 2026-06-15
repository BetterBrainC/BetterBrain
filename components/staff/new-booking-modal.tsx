"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { createBooking } from "@/actions/bookings";

const STATUSES: { value: "booked" | "awaiting_payment" | "cancelled"; label: string }[] = [
  { value: "booked", label: "ทำนัดแล้ว" },
  { value: "awaiting_payment", label: "รอชำระเงิน" },
  { value: "cancelled", label: "ยกเลิกนัด" },
];

/** Admin manually creates a booking (fallback to the public form). */
export function NewBookingModal() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [area, setArea] = React.useState("");
  const [status, setStatus] = React.useState<"booked" | "awaiting_payment" | "cancelled">("booked");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createBooking({ fullName, phone, area, status });
    setBusy(false);
    if (res.error) return setError(res.error);
    setOpen(false);
    setFullName(""); setPhone(""); setArea(""); setStatus("booked");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ ทำนัด</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="ทำนัดใหม่">
        <form onSubmit={submit} className="space-y-4">
          <Field label="ชื่อ-สกุล"><TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} required /></Field>
          <Field label="เบอร์โทร"><TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></Field>
          <Field label="พื้นที่"><TextInput value={area} onChange={(e) => setArea(e.target.value)} /></Field>
          <Field label="สถานะ">
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              {STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </Select>
          </Field>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
