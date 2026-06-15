"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { submitPublicBooking } from "@/actions/bookings";

export function BookingForm() {
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [area, setArea] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [website, setWebsite] = React.useState(""); // honeypot
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await submitPublicBooking({ fullName, phone, area, consent, website });
    setBusy(false);
    if (res.error) return setError(res.error);
    setDone(true);
  }

  if (done) {
    return (
      <Card className="space-y-2 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal" />
        <CardTitle className="text-base">ส่งคำขอจองแล้ว</CardTitle>
        <p className="text-sm text-muted">ทีมงานจะติดต่อกลับเพื่อยืนยันการนัดหมายเข้าประเมิน</p>
      </Card>
    );
  }

  const fields = [
    { id: "name", label: "ชื่อ-สกุลผู้รับบริการ", type: "text", value: fullName, set: setFullName },
    { id: "phone", label: "เบอร์โทรติดต่อ", type: "tel", value: phone, set: setPhone },
    { id: "area", label: "พื้นที่/เขตที่พักอาศัย", type: "text", value: area, set: setArea },
  ];

  return (
    <Card className="space-y-4">
      <form onSubmit={submit} className="space-y-4">
        <CardTitle className="text-base">ข้อมูลผู้ติดต่อ</CardTitle>
        {/* honeypot: hidden from humans, bots fill it */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          aria-hidden
        />
        {fields.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <label htmlFor={f.id} className="text-sm font-medium text-ink">{f.label}</label>
            <input
              id={f.id}
              type={f.type}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              required={f.id !== "area"}
              className="h-12 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-primary"
            />
          </div>
        ))}
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" className="mt-0.5" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>ยินยอมให้เก็บและใช้ข้อมูลเพื่อการนัดหมายและให้บริการ ตาม PDPA</span>
        </label>
        {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
        <Button size="lg" className="w-full" type="submit" disabled={busy}>
          {busy ? "กำลังส่ง…" : "ส่งคำขอจอง"}
        </Button>
      </form>
    </Card>
  );
}
