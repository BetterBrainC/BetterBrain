"use client";

import * as React from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Textarea, Select } from "@/components/ui/field";
import { addKpiQuestion, removeKpiQuestion } from "@/actions/kpi";
import type { KpiTemplate } from "@/lib/data/queries";

const YEARS = [2569, 2568] as const;
const DEFAULT_YEAR = YEARS[0];

/**
 * Director-only: manage the year-versioned knowledge question bank (kpi_templates).
 * Supports free-text and multiple-choice (with answer key) questions.
 */
export function MeasurementEditor({ templates }: { templates: KpiTemplate[] }) {
  const router = useRouter();
  const [year, setYear] = React.useState<number>(DEFAULT_YEAR);
  const [draft, setDraft] = React.useState("");
  const [qType, setQType] = React.useState<"text" | "choice">("text");
  const [optionsText, setOptionsText] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const tmpl = templates.find((t) => t.kind === "knowledge" && t.periodYear === year) ?? null;
  const questions = tmpl?.questions ?? [];

  function add() {
    const q = draft.trim();
    if (!q) return;
    setError(null);
    const options = qType === "choice" ? optionsText.split("\n").map((o) => o.trim()).filter(Boolean) : undefined;
    start(async () => {
      const res = await addKpiQuestion({
        year,
        kind: "knowledge",
        question: q,
        answerType: qType,
        options,
        answer: qType === "choice" ? answer.trim() : undefined,
      });
      if (res.error) setError(res.error);
      else {
        setDraft(""); setOptionsText(""); setAnswer(""); setQType("text");
        router.refresh();
      }
    });
  }

  function remove(qid: string) {
    if (!tmpl) return;
    setError(null);
    start(async () => {
      const res = await removeKpiQuestion({ templateId: tmpl.id, questionId: qid });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">การวัดผล</h1>
        <p className="text-sm text-muted">
          จัดการชุดคำถามประเมินความรู้รายปี · ผลการวัด (ผู้รับบริการ/พนักงาน) เห็นเฉพาะ Director
        </p>
      </header>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">แบบทดสอบความรู้ (รายปี)</CardTitle>
          <div className="w-32">
            <Select value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>พ.ศ. {y}</option>
              ))}
            </Select>
          </div>
        </div>

        <ol className="space-y-2">
          {questions.map((q, i) => (
            <li key={q.id} className="flex items-start gap-2 rounded-md bg-surface-tint px-3 py-2">
              <span className="mt-0.5 text-sm font-semibold text-primary-700 tabular-nums">{i + 1}.</span>
              <div className="flex-1 space-y-1">
                <p className="text-sm text-ink">{q.question}</p>
                {q.answerType === "choice" && q.options && (
                  <ul className="space-y-0.5">
                    {q.options.map((o) => (
                      <li
                        key={o}
                        className={
                          "flex items-center gap-1 text-xs " +
                          (o === q.answer ? "font-medium text-[var(--status-completed-fg)]" : "text-muted")
                        }
                      >
                        {o === q.answer ? <Check className="h-3 w-3" /> : <span className="w-3" />}
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(q.id)}
                disabled={pending}
                aria-label="ลบคำถาม"
                className="text-faint hover:text-[var(--danger-fg)] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {questions.length === 0 && (
            <li className="text-sm text-muted">ยังไม่มีคำถามสำหรับปีนี้</li>
          )}
        </ol>

        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex rounded-pill bg-surface-sunken p-1 text-sm">
            {(["text", "choice"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQType(t)}
                className={"flex-1 rounded-pill py-1.5 font-medium " + (qType === t ? "bg-surface text-primary-700 shadow-sm" : "text-muted")}
              >
                {t === "text" ? "พิมพ์ตอบ" : "เลือกตอบ (ให้คะแนน)"}
              </button>
            ))}
          </div>
          <Field label="คำถาม">
            <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="พิมพ์คำถามใหม่…" />
          </Field>
          {qType === "choice" && (
            <>
              <Field label="ตัวเลือก (บรรทัดละ 1 ข้อ)">
                <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder={"ระดับ 1\nระดับ 7\n…"} />
              </Field>
              <Field label="คำตอบที่ถูก (ต้องตรงกับตัวเลือก)">
                <TextInput value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="พิมพ์คำตอบที่ถูก" />
              </Field>
            </>
          )}
          {error && <p className="text-xs text-[var(--danger-fg)]">{error}</p>}
          <Button onClick={add} disabled={!draft.trim() || pending} className="w-full">
            <Plus className="h-4 w-4" /> เพิ่มคำถาม
          </Button>
        </div>
        <p className="text-xs text-faint">บันทึกเป็น kpi_templates · เฉลยเก็บฝั่งเซิร์ฟเวอร์ (พนักงานมองไม่เห็น)</p>
      </Card>
    </div>
  );
}
