"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Textarea, Select } from "@/components/ui/field";
import { substituteSession } from "@/actions/scheduling";

type EmpOpt = { id: string; name: string; code: string | null };
type SessionOpt = { id: string; label: string };

/**
 * Standalone substitution / shift-swap (จัดเวรแทน/สลับเวร), decoupled from leave.
 * Pick an upcoming session and reassign it to a covering employee; the swap is
 * recorded (substituted_from + coverage_status) and the substitute is granted
 * patient access.
 */
export function SubstituteModal({
  employees,
  sessions,
}: {
  employees: EmpOpt[];
  sessions: SessionOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [sessionId, setSessionId] = React.useState("");
  const [substituteId, setSubstituteId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await substituteSession({ sessionId, substituteEmployeeId: substituteId, reason });
    setBusy(false);
    if (res.error) return setError(res.error);
    setOpen(false);
    setSessionId(""); setSubstituteId(""); setReason("");
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>จัดเวรแทน / สลับเวร</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="จัดเวรแทน / สลับเวร">
        <form onSubmit={submit} className="space-y-4">
          <Field label="เวรที่ต้องการจัดแทน (วัน · เวลา · ผู้รับบริการ · พนักงานเดิม)">
            <Select value={sessionId} onChange={(e) => setSessionId(e.target.value)} required>
              <option value="" disabled>เลือกเวร</option>
              {sessions.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
            </Select>
          </Field>
          <Field label="พนักงานแทน (ต้องว่าง/ไม่ชนเวลา)">
            <Select value={substituteId} onChange={(e) => setSubstituteId(e.target.value)} required>
              <option value="" disabled>เลือกพนักงานแทน</option>
              {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}{e.code ? ` (${e.code})` : ""}</option>))}
            </Select>
          </Field>
          <Field label="เหตุผล"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
          {sessions.length === 0 && <p className="text-xs text-muted">ยังไม่มีเวรที่จะถึง</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={busy}>{busy ? "กำลังบันทึก…" : "ยืนยันจัดเวรแทน"}</Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
