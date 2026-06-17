"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { saveEmployeeKpi } from "@/actions/kpi";
import type { EmployeeKpiTemplate } from "@/lib/data/queries";

const STRESS_CHOICES = ["น้อย", "ปานกลาง", "มาก"];

/**
 * Employee self-assessment: stress + yearly knowledge test. (Patient KPI moved
 * into the case — see PatientKpiForm on the session page.)
 */
export function MeasurementForm({
  knowledge,
  stress,
  year,
}: {
  knowledge: EmployeeKpiTemplate;
  stress: EmployeeKpiTemplate;
  year: number;
}) {
  const router = useRouter();
  const [stressAns, setStressAns] = React.useState<Record<string, string>>({});
  const [knowAns, setKnowAns] = React.useState<Record<string, string>>({});
  const [eBusy, setEBusy] = React.useState(false);
  const [eMsg, setEMsg] = React.useState<{ ok?: boolean; error?: string; score?: number | null; graded?: boolean } | null>(null);

  async function submitSelf(kind: "stress" | "knowledge") {
    const templateId = (kind === "stress" ? stress : knowledge).templateId;
    const answers = kind === "stress" ? stressAns : knowAns;
    setEBusy(true);
    setEMsg(null);
    const res = await saveEmployeeKpi({ kind, templateId, year, answers });
    setEBusy(false);
    setEMsg(res);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-5 px-[var(--gutter-page)] pt-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">แบบประเมินตนเอง</h1>
        <p className="text-sm text-muted">แบบประเมินความเครียด + ทดสอบความรู้ประจำปี</p>
      </header>

      <div className="space-y-4">
        <Card className="space-y-3">
          <CardTitle className="text-base">แบบประเมินความเครียด</CardTitle>
          {stress.questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <p className="text-sm text-ink">{q.question}</p>
              <Select value={stressAns[q.id] ?? ""} onChange={(e) => setStressAns((s) => ({ ...s, [q.id]: e.target.value }))}>
                <option value="" disabled>เลือก</option>
                {STRESS_CHOICES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </Select>
            </div>
          ))}
          {stress.questions.length === 0 && <p className="text-sm text-muted">ยังไม่มีชุดคำถามปีนี้</p>}
          <Button type="button" className="w-full" disabled={eBusy || stress.questions.length === 0} onClick={() => submitSelf("stress")}>
            {eBusy ? "กำลังบันทึก…" : "ส่งแบบประเมินความเครียด"}
          </Button>
        </Card>

        <Card className="space-y-3">
          <CardTitle className="text-base">แบบทดสอบความรู้ (ประจำปี)</CardTitle>
          {knowledge.questions.map((q) =>
            q.answerType === "choice" && q.options ? (
              <div key={q.id} className="space-y-1.5">
                <p className="text-sm text-ink">{q.question}</p>
                <div className="grid gap-1.5">
                  {q.options.map((opt) => {
                    const active = knowAns[q.id] === opt;
                    return (
                      <label
                        key={opt}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm transition",
                          active ? "border-primary bg-surface-tint text-primary-700" : "border-border text-ink hover:bg-surface-tint",
                        )}
                      >
                        <input type="radio" name={`know-${q.id}`} value={opt} checked={active} onChange={() => setKnowAns((s) => ({ ...s, [q.id]: opt }))} />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Field key={q.id} label={q.question}>
                <TextInput value={knowAns[q.id] ?? ""} onChange={(e) => setKnowAns((s) => ({ ...s, [q.id]: e.target.value }))} />
              </Field>
            ),
          )}
          {knowledge.questions.length === 0 && <p className="text-sm text-muted">ยังไม่มีชุดคำถามปีนี้</p>}
          <p className="text-xs text-faint">ชุดคำถามแก้ไขได้รายปีโดย Director (kpi_templates)</p>
          <Button type="button" className="w-full" disabled={eBusy || knowledge.questions.length === 0} onClick={() => submitSelf("knowledge")}>
            {eBusy ? "กำลังบันทึก…" : "ส่งแบบทดสอบความรู้"}
          </Button>
        </Card>

        {eMsg?.error && <p className="text-sm text-[var(--danger-fg)]">{eMsg.error}</p>}
        {eMsg?.ok && (
          <p className={"text-sm " + (eMsg.graded && (eMsg.score ?? 0) < 60 ? "text-[var(--status-late-fg)]" : "text-teal")}>
            {eMsg.graded ? `บันทึกแล้ว · คะแนน ${eMsg.score}% — ${(eMsg.score ?? 0) >= 60 ? "ผ่าน" : "ไม่ผ่าน"}` : "บันทึกแล้ว"}
          </p>
        )}
      </div>
    </div>
  );
}
