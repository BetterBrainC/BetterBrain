"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setEmployeeSlots } from "@/actions/slots";

type Slot = { start: string; end: string };

/** Add/remove work-hour slots for an employee (admin). */
export function SlotsEditor({
  employeeId,
  initial,
}: {
  employeeId: string;
  initial: { slot_start: string; slot_end: string }[];
}) {
  const [slots, setSlots] = React.useState<Slot[]>(
    initial.map((s) => ({ start: s.slot_start.slice(0, 5), end: s.slot_end.slice(0, 5) })),
  );
  const [start, setStart] = React.useState("09:00");
  const [end, setEnd] = React.useState("17:00");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  async function persist(next: Slot[]) {
    setBusy(true);
    setMsg(null);
    const res = await setEmployeeSlots({ employeeId, slots: next.map((s) => ({ ...s, weekday: null })) });
    setBusy(false);
    setMsg(res);
    if (res.ok) setSlots(next);
  }

  function add() {
    if (end <= start) return setMsg({ error: "เวลาสิ้นสุดต้องมากกว่าเริ่ม" });
    persist([...slots, { start, end }]);
  }
  function remove(i: number) {
    persist(slots.filter((_, idx) => idx !== i));
  }

  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">ช่วงเวลาทำงาน (slots)</CardTitle>
      <div className="flex flex-wrap gap-2">
        {slots.length === 0 && <span className="text-sm text-muted">ยังไม่กำหนด</span>}
        {slots.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-pill bg-surface-tint px-2.5 py-1 text-sm text-ink">
            {s.start}–{s.end}
            <button type="button" aria-label="ลบ" disabled={busy} onClick={() => remove(i)} className="text-muted hover:text-[var(--danger-fg)]">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-2 text-sm" />
        <span className="text-muted">–</span>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-2 text-sm" />
        <Button size="sm" variant="secondary" disabled={busy} onClick={add}>
          <Plus className="h-4 w-4" /> เพิ่มช่วง
        </Button>
      </div>
      {msg?.error && <p className="text-sm text-[var(--danger-fg)]">{msg.error}</p>}
    </Card>
  );
}
