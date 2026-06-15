"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { FOIS_LABEL } from "@/lib/i18n/th";
import { cn } from "@/lib/utils";
import { savePatientKpi, saveEmployeeKpi } from "@/actions/kpi";
import type { EmployeeKpiTemplate } from "@/lib/data/queries";

const FUNCTION_ITEMS = ["ลุกนั่ง", "ยืน", "เดิน", "กินได้", "ถอดสายได้"];
const STRESS_CHOICES = ["น้อย", "ปานกลาง", "มาก"];
const FOIS_ENTRIES = Object.entries(FOIS_LABEL) as [string, string][];

type PatientOpt = { id: string; name: string };

/** FOIS 1–7 as a tap-friendly clinical-scale picker (replaces a long dropdown). */
function FoisPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-ink">FOIS (ระดับการกินทางปาก)</span>
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
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums",
                  active ? "bg-primary text-white" : "bg-surface-sunken text-muted",
                )}
              >
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

export function MeasurementForm({
  patients,
  knowledge,
  stress,
  year,
}: {
  patients: PatientOpt[];
  knowledge: EmployeeKpiTemplate;
  stress: EmployeeKpiTemplate;
  year: number;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"patient" | "employee">("patient");

  // Patient KPI state
  const [patientId, setPatientId] = React.useState("");
  const [fois, setFois] = React.useState("");
  const [barthel, setBarthel] = React.useState("");
  const [fn, setFn] = React.useState<Record<string, boolean>>({});
  const [fim, setFim] = React.useState("");
  const [mfs, setMfs] = React.useState("");
  const [pBusy, setPBusy] = React.useState(false);
  const [pMsg, setPMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  // Self-assessment state (answers keyed by question id)
  const [stressAns, setStressAns] = React.useState<Record<string, string>>({});
  const [knowAns, setKnowAns] = React.useState<Record<string, string>>({});
  const [eBusy, setEBusy] = React.useState(false);
  const [eMsg, setEMsg] = React.useState<{ ok?: boolean; error?: string; score?: number | null; graded?: boolean } | null>(null);

  async function submitPatient(e: React.FormEvent) {
    e.preventDefault();
    setPBusy(true);
    setPMsg(null);
    const res = await savePatientKpi({
      patientId,
      fois: fois || null,
      barthel: barthel === "" ? null : Number(barthel),
      functionChecklist: fn,
      fim: fim === "" ? null : Number(fim),
      mfs: mfs === "" ? null : Number(mfs),
    });
    setPBusy(false);
    setPMsg(res);
    if (res.ok) {
      setFois(""); setBarthel(""); setFn({}); setFim(""); setMfs("");
      router.refresh();
    }
  }

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
        <h1 className="font-display text-2xl font-bold text-navy">การวัดผล</h1>
        <p className="text-sm text-muted">KPI ผู้รับบริการ และแบบประเมินตนเอง</p>
      </header>

      <div className="flex gap-2 rounded-pill bg-surface-sunken p-1">
        {([["patient", "ผู้รับบริการ"], ["employee", "พนักงาน"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              "flex-1 rounded-pill py-2 text-sm font-medium transition-colors " +
              (tab === k ? "bg-surface text-primary-700 shadow-sm" : "text-muted")
            }
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "patient" ? (
        <form onSubmit={submitPatient}>
          <Card className="space-y-4">
            <CardTitle className="text-base">การวัดผลผู้รับบริการ</CardTitle>
            <Field label="ผู้รับบริการ">
              <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
                <option value="" disabled>เลือกผู้รับบริการ</option>
                {patients.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </Select>
            </Field>
            <FoisPicker value={fois} onChange={setFois} />
            <Field label="Barthel Index (0–100)">
              <TextInput type="number" min={0} max={100} value={barthel} onChange={(e) => setBarthel(e.target.value)} />
            </Field>
            <div>
              <span className="text-sm font-medium text-ink">Function (ทำได้)</span>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                {FUNCTION_ITEMS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={!!fn[f]}
                      onChange={(e) => setFn((s) => ({ ...s, [f]: e.target.checked }))}
                    /> {f}
                  </label>
                ))}
              </div>
            </div>
            <Field label="FIM (Functional Independence Measure)" hint="บันทึกคะแนนรวมได้ · เกณฑ์ย่อยรอจากลูกค้า">
              <TextInput type="number" placeholder="คะแนน FIM" value={fim} onChange={(e) => setFim(e.target.value)} />
            </Field>
            <Field label="MFS (Morse Fall Scale)" hint="บันทึกคะแนนรวมได้ · เกณฑ์ย่อยรอจากลูกค้า">
              <TextInput type="number" placeholder="คะแนน MFS" value={mfs} onChange={(e) => setMfs(e.target.value)} />
            </Field>
            <p className="rounded-md bg-surface-tint px-3 py-2 text-xs text-muted">
              ผลการวัดผลจะเห็นเฉพาะ Director (รวมหัวข้อ “สรุปประเมิน” เข้ามาที่นี่)
            </p>
            {pMsg?.error && <p className="text-sm text-[var(--danger-fg)]">{pMsg.error}</p>}
            {pMsg?.ok && <p className="text-sm text-teal">บันทึกแล้ว</p>}
            <Button type="submit" className="w-full" disabled={pBusy || !patientId}>
              {pBusy ? "กำลังบันทึก…" : "บันทึก KPI ผู้รับบริการ"}
            </Button>
          </Card>
        </form>
      ) : (
        <div className="space-y-4">
          <Card className="space-y-3">
            <CardTitle className="text-base">แบบประเมินความเครียด</CardTitle>
            {stress.questions.map((q) => (
              <div key={q.id} className="space-y-1">
                <p className="text-sm text-ink">{q.question}</p>
                <Select
                  value={stressAns[q.id] ?? ""}
                  onChange={(e) => setStressAns((s) => ({ ...s, [q.id]: e.target.value }))}
                >
                  <option value="" disabled>เลือก</option>
                  {STRESS_CHOICES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </Select>
              </div>
            ))}
            {stress.questions.length === 0 && (
              <p className="text-sm text-muted">ยังไม่มีชุดคำถามปีนี้</p>
            )}
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
                          <input
                            type="radio"
                            name={`know-${q.id}`}
                            value={opt}
                            checked={active}
                            onChange={() => setKnowAns((s) => ({ ...s, [q.id]: opt }))}
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Field key={q.id} label={q.question}>
                  <TextInput
                    value={knowAns[q.id] ?? ""}
                    onChange={(e) => setKnowAns((s) => ({ ...s, [q.id]: e.target.value }))}
                  />
                </Field>
              ),
            )}
            {knowledge.questions.length === 0 && (
              <p className="text-sm text-muted">ยังไม่มีชุดคำถามปีนี้</p>
            )}
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
      )}
    </div>
  );
}
