"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FOIS_LABEL } from "@/lib/i18n/th";
import { cn } from "@/lib/utils";
import { savePatientKpi } from "@/actions/kpi";

// Functional checklist (client Final brief #22) — NOT scored; captured as flags.
const FUNCTION_ITEMS = ["พูดได้เป็นคำ", "พูดได้เข้าใจ", "กินได้ มีสายอยู่", "ถอดสายได้", "กลืนน้ำลายได้"];
const FOIS_ENTRIES = Object.entries(FOIS_LABEL) as [string, string][];

function FoisPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-ink">FOIS score</span>
      <div className="grid gap-1.5">
        {FOIS_ENTRIES.map(([k, label], i) => {
          const active = value === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "" : k)}
              className={cn(
                "flex items-start gap-2 rounded-md border p-2.5 text-left transition",
                active ? "border-primary bg-surface-tint" : "border-border bg-surface hover:bg-surface-tint",
              )}
            >
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums", active ? "bg-primary text-white" : "bg-surface-sunken text-muted")}>
                {i + 1}
              </span>
              <span className="text-xs leading-snug text-ink">{label.replace(/^ระดับ \d+ · /, "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Patient measurement (FOIS/Barthel/Functional/FIM) recorded INSIDE a case —
 * the recipient is fixed (no picker). Moved here from the standalone measurement
 * page because การวัดผล must be recorded before the case is closed.
 */
export function PatientKpiForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [fois, setFois] = React.useState("");
  const [barthel, setBarthel] = React.useState("");
  const [fn, setFn] = React.useState<Record<string, boolean>>({});
  const [fim, setFim] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await savePatientKpi({
      patientId,
      fois: fois || null,
      barthel: barthel === "" ? null : Number(barthel),
      functionChecklist: fn,
      fim: fim === "" ? null : Number(fim),
    });
    setBusy(false);
    setMsg(res);
    if (res.ok) {
      setFois(""); setBarthel(""); setFn({}); setFim("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit}>
      <Card className="space-y-4">
        <CardTitle className="text-base">วัดผลผู้รับบริการ</CardTitle>
        <FoisPicker value={fois} onChange={setFois} />
        <Field label="Barthel score (0–100)">
          <TextInput type="number" min={0} max={100} value={barthel} onChange={(e) => setBarthel(e.target.value)} />
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Functional (สิ่งที่ทำได้)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FUNCTION_ITEMS.map((f) => (
              <label key={f} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink hover:bg-surface-tint">
                <input type="checkbox" checked={!!fn[f]} onChange={(e) => setFn((s) => ({ ...s, [f]: e.target.checked }))} /> {f}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="FIM score">
          <TextInput type="number" value={fim} onChange={(e) => setFim(e.target.value)} />
        </Field>
        {msg?.error && <p className="text-sm text-[var(--danger-fg)]">{msg.error}</p>}
        {msg?.ok && <p className="text-sm text-teal">บันทึกการวัดผลแล้ว</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "กำลังบันทึก…" : "บันทึกการวัดผล"}
        </Button>
      </Card>
    </form>
  );
}
