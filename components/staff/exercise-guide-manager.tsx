"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextInput, Textarea } from "@/components/ui/field";
import { setExerciseGuide } from "@/actions/portal";
import type { ExerciseGuideItem } from "@/lib/content/exercise-guide";

/** Editable home-exercise guide for one course/program (วิธีออกกำลังกาย). */
function ProgramCard({ program, initial }: { program: string; initial: ExerciseGuideItem[] }) {
  const [items, setItems] = React.useState<ExerciseGuideItem[]>(initial);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  const update = (i: number, field: "title" | "detail", value: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  const add = () => setItems((prev) => [...prev, { title: "", detail: "" }]);
  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await setExerciseGuide({ program, items });
    setBusy(false);
    setMsg(res);
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-base">{program}</CardTitle>
        <span className="text-2xs text-muted">{items.filter((i) => i.title.trim()).length} ข้อ</span>
      </div>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted">ยังไม่มีคำแนะนำ — กด “เพิ่มข้อ”</p>}
        {items.map((it, i) => (
          <div key={i} className="space-y-2 rounded-md bg-surface-tint p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy">ข้อ {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`ลบข้อ ${i + 1}`}
                className="ml-auto rounded p-1 text-muted hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <TextInput placeholder="หัวข้อ (เช่น บริหารลิ้น)" value={it.title} onChange={(e) => update(i, "title", e.target.value)} />
            <Textarea placeholder="รายละเอียด/วิธีทำ (ไม่บังคับ)" value={it.detail} onChange={(e) => update(i, "detail", e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus className="h-4 w-4" /> เพิ่มข้อ
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

export function ExerciseGuideManager({
  programs,
}: {
  programs: { program: string; items: ExerciseGuideItem[] }[];
}) {
  if (programs.length === 0) {
    return (
      <Card>
        <CardTitle className="mb-1 text-base">วิธีออกกำลังกาย</CardTitle>
        <p className="text-sm text-muted">ยังไม่มีคอร์สการฟื้นฟู — กำหนดโปรแกรมการฝึกให้ผู้รับบริการก่อน แล้วจะปรากฏที่นี่</p>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {programs.map((p) => (
        <ProgramCard key={p.program} program={p.program} initial={p.items} />
      ))}
    </div>
  );
}
