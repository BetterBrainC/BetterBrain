"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { setTrainingPrograms } from "@/actions/programs";

/** CRUD the master list of โปรแกรมฝึก / คอร์สการฟื้นฟู. */
export function ProgramsManager({ initial }: { initial: string[] }) {
  const [items, setItems] = React.useState<string[]>(initial);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  const add = () => setItems((prev) => [...prev, ""]);
  const update = (i: number, v: string) => setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await setTrainingPrograms(items);
    setBusy(false);
    setMsg(res);
    if (res.ok) {
      const seen = new Set<string>();
      setItems(items.map((s) => s.trim()).filter((s) => s && !seen.has(s) && seen.add(s)));
    }
  }

  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">โปรแกรมฝึก (คอร์สการฟื้นฟู)</CardTitle>
      <p className="text-sm text-muted">
        ใช้เป็นตัวเลือกในฟอร์มผู้รับบริการ และผูกกับ “วิธีออกกำลังกาย” ในหน้าจัดการญาติ
      </p>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted">ยังไม่มีโปรแกรม — กด “เพิ่มโปรแกรม”</p>}
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextInput value={it} onChange={(e) => update(i, e.target.value)} placeholder="เช่น Swallowing Rehab" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`ลบโปรแกรมที่ ${i + 1}`}
              className="shrink-0 rounded p-2 text-muted hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus className="h-4 w-4" /> เพิ่มโปรแกรม
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
        {msg?.error && <span className="text-sm text-[var(--danger-fg)]">{msg.error}</span>}
        {msg?.ok && <span className="text-sm text-teal">บันทึกแล้ว</span>}
      </div>
    </Card>
  );
}
