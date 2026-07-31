"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { applyTrainingPrograms } from "@/actions/programs";

type Row = { original: string | null; name: string };

/**
 * CRUD the master list of โปรแกรมฝึก / คอร์สการฟื้นฟู. Each row remembers the
 * name it loaded with so a rename really renames (propagating to recipients,
 * guides and portal pins) instead of reading as delete+add — and deletions are
 * tracked explicitly so they actually stick after save.
 */
export function ProgramsManager({ initial }: { initial: string[] }) {
  const [rows, setRows] = React.useState<Row[]>(initial.map((name) => ({ original: name, name })));
  const [removed, setRemoved] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  const add = () => setRows((prev) => [...prev, { original: null, name: "" }]);
  const update = (i: number, v: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, name: v } : r)));
  const remove = (i: number) =>
    setRows((prev) => {
      const target = prev[i];
      if (target?.original) setRemoved((rm) => [...rm, target.original!]);
      return prev.filter((_, idx) => idx !== i);
    });

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await applyTrainingPrograms({ items: rows, removed });
    setBusy(false);
    setMsg(res);
    if (res.ok) {
      const seen = new Set<string>();
      setRows(
        rows
          .map((r) => r.name.trim())
          .filter((s) => s && !seen.has(s) && seen.add(s))
          .map((name) => ({ original: name, name })),
      );
      setRemoved([]);
    }
  }

  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">โปรแกรมฝึก (คอร์สการฟื้นฟู)</CardTitle>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted">ยังไม่มีโปรแกรม — กด “เพิ่มโปรแกรม”</p>}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextInput value={r.name} onChange={(e) => update(i, e.target.value)} placeholder="เช่น Swallowing Rehab" />
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
