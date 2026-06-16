"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PortalContent } from "@/components/relatives/portal-content";
import { verifyRelativePortal } from "@/actions/portal";
import type { RelativePortalData } from "@/lib/data/queries";

/**
 * Security gate: verify the last 4 digits of the recipient's phone SERVER-SIDE
 * (the expected value never reaches the browser). On success the server returns
 * the portal data to render.
 */
export function PortalGate({ token }: { token: string }) {
  const [data, setData] = React.useState<RelativePortalData | null>(null);
  const [val, setVal] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (data) return <PortalContent data={data} token={token} />;

  async function verify() {
    setBusy(true);
    setErr(null);
    const res = await verifyRelativePortal(token, val);
    setBusy(false);
    if (res.error || !res.data) return setErr(res.error ?? "รหัสไม่ถูกต้อง");
    setData(res.data);
  }

  return (
    <main className="mx-auto max-w-sm space-y-4 px-[var(--gutter-page)] py-16">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-3 font-display text-xl font-bold text-navy">ยืนยันตัวตน</h1>
        <p className="mt-1 text-sm text-muted">
          กรอกเบอร์โทร 4 ตัวท้ายของผู้รับบริการเพื่อเข้าดูข้อมูล
        </p>
      </div>
      <Card className="space-y-3">
        <input
          inputMode="numeric"
          maxLength={4}
          value={val}
          onChange={(e) => { setVal(e.target.value.replace(/\D/g, "")); setErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && val.length === 4 && verify()}
          placeholder="• • • •"
          className="h-12 w-full rounded-md border border-border bg-surface text-center text-2xl tracking-[0.5em] outline-none focus:border-primary"
        />
        {err && <p className="text-center text-sm text-[var(--danger-fg)]">{err}</p>}
        <Button size="lg" className="w-full" disabled={val.length !== 4 || busy} onClick={verify}>
          {busy ? "กำลังตรวจสอบ…" : "ยืนยัน"}
        </Button>
      </Card>
    </main>
  );
}
