"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { ReportPhotoUpload } from "@/components/reports/report-photo-upload";
import { saveFollowup } from "@/actions/checkin";
import { loadReportDraft, saveReportDraft, type ReportDraft } from "@/actions/report-drafts";
import { enqueueReport } from "@/lib/sync/checkin-sync";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-[var(--danger-fg)]"> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-primary";

const pillCls =
  "inline-block rounded-pill border border-border bg-surface px-3 py-1.5 text-xs text-ink transition-colors peer-checked:border-primary peer-checked:bg-surface-tint peer-checked:font-medium peer-checked:text-primary-700 peer-focus-visible:ring-2 peer-focus-visible:ring-primary";

/** Pill checkbox group — mirrors the paper form's ☐ Walk ☐ Wheel chair row. */
function CheckPills({ name, options }: { name: string; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input type="checkbox" name={name} value={o} className="peer sr-only" />
          <span className={pillCls}>{o}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * SpO2 % stepper (0–100). A controlled text input (numeric keyboard) instead of
 * type="number": the field starts empty and leading zeros are stripped as you
 * type — client bug: typing over the old default 0 saved/displayed "099".
 */
function Spo2Stepper({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const step = (d: number) => onChange(String(clamp((Number(value) || 0) + d)));
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-surface pl-3 pr-1 focus-within:border-primary">
      <span className="text-sm text-muted">%</span>
      <input
        type="text"
        inputMode="numeric"
        name={name}
        value={value}
        required
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
          if (digits === "") return onChange("");
          onChange(String(clamp(Number(digits))));
        }}
        className="h-11 w-full border-0 bg-transparent text-base outline-none"
      />
      <button type="button" aria-label="ลด" onClick={() => step(-1)} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-tint">
        <Minus className="h-4 w-4" />
      </button>
      <button type="button" aria-label="เพิ่ม" onClick={() => step(1)} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-tint">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Serialize a form; repeated names (e.g. photos) collapse into an array. */
function serialize(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of new FormData(form).entries()) {
    if (k in out) {
      const cur = out[k];
      out[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else out[k] = v;
  }
  return out;
}

/** Restore saved draft values into the sheet's uncontrolled fields. */
function restoreForm(form: HTMLFormElement, data: Record<string, unknown>) {
  for (const [name, val] of Object.entries(data)) {
    const els = form.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(name)}"]`);
    if (!els.length) continue;
    const values = (Array.isArray(val) ? val : [val]).map((v) => String(v));
    els.forEach((el) => {
      if (el.type === "checkbox" || el.type === "radio") el.checked = values.includes(el.value);
      else el.value = values[0] ?? "";
    });
  }
}

/** `photos` out of a saved payload — one value serializes as a string, many as an array. */
function draftPhotos(payload: Record<string, unknown> | undefined): string[] {
  const raw = payload?.photos;
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  return [];
}

/** A payload field as a plain string (draft restore for the controlled inputs). */
function draftText(payload: Record<string, unknown> | undefined, key: string): string {
  const raw = payload?.[key];
  return typeof raw === "string" ? raw : "";
}

/** Current date/time in Asia/Bangkok as {date: yyyy-mm-dd, time: HH:MM:SS}. */
function bangkokNow() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);
  return { date, time };
}

/**
 * Daily report (รายงานประจำวัน / Follow up) — opens automatically after the
 * employee presses "เช็คเอาท์", and also via the รายงานประจำวัน card. Fields mirror
 * the client's sample (28/6/2569): date/time, patient, vitals before→after,
 * problem/goal/treatment, image, OT name.
 */
export function DailyReportSheet({
  open,
  onClose,
  sessionId,
  patientName,
  otName = "",
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  patientName: string;
  otName?: string;
  onSaved: () => void;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [spo2Before, setSpo2Before] = React.useState("");
  const [spo2After, setSpo2After] = React.useState("");
  const [draft, setDraft] = React.useState<ReportDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = React.useState(true);
  const [draftSaving, setDraftSaving] = React.useState(false);
  const [draftNote, setDraftNote] = React.useState<string | null>(null);

  // Default date/time to "now" (Bangkok) when the sheet opens — set client-side
  // to avoid an SSR hydration mismatch.
  React.useEffect(() => {
    if (!open) return;
    const { date: d, time: t } = bangkokNow();
    setDate((cur) => cur || d);
    setTime((cur) => cur || t);
  }, [open]);

  // Pick up a draft of this follow-up, if the employee saved one earlier. The
  // form waits for the answer so the restore (photos included) lands in one pass.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingDraft(true);
    loadReportDraft(sessionId, "followup")
      .then((d) => {
        if (cancelled || !d) return;
        setDraft(d);
        const dDate = draftText(d.payload, "date");
        const dTime = draftText(d.payload, "time");
        if (dDate) setDate(dDate);
        if (dTime) setTime(dTime);
        setSpo2Before(draftText(d.payload, "spo2_before"));
        setSpo2After(draftText(d.payload, "spo2_after"));
        setDraftNote("กู้ร่างที่บันทึกไว้กลับมาแล้ว · ยังไม่ส่งบันทึกจริง");
      })
      .catch(() => {
        // no draft available (offline / not signed in) — start a blank form
      })
      .finally(() => {
        if (!cancelled) setLoadingDraft(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  // Restore the remaining (uncontrolled) fields once the form is on screen.
  React.useEffect(() => {
    if (!draft || loadingDraft || !formRef.current) return;
    restoreForm(formRef.current, draft.payload);
  }, [draft, loadingDraft]);

  /** "บันทึกร่าง" — keep the half-filled form without ending the case. */
  async function handleSaveDraft() {
    if (!formRef.current) return;
    const payload = serialize(formRef.current);
    setDraftSaving(true);
    setError(null);
    try {
      const res = await saveReportDraft({
        sessionId,
        reportType: "followup",
        payload,
        draftId: draft?.id ?? null,
      });
      setDraftSaving(false);
      if (res.error) return setError(res.error);
      if (res.id) setDraft({ id: res.id, payload, savedAtISO: new Date().toISOString() });
      setDraftNote("บันทึกร่างแล้ว · ยังไม่ส่งบันทึกจริง");
    } catch {
      setDraftSaving(false);
      setError("บันทึกร่างไม่สำเร็จ — ต้องออนไลน์จึงจะเก็บร่างขึ้นระบบได้");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = serialize(e.currentTarget);

    // Offline (e.g. at the patient's home with no signal): queue + flush on reconnect.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueReport({ clientUuid: crypto.randomUUID(), reportType: "followup", sessionId, payload, draftId: draft?.id });
      setSaving(false);
      onSaved();
      return;
    }
    try {
      const res = await saveFollowup(sessionId, payload, null, draft?.id ?? null);
      setSaving(false);
      if (res.error) return setError(res.error);
      setDraft(null);
      onSaved();
    } catch {
      await enqueueReport({ clientUuid: crypto.randomUUID(), reportType: "followup", sessionId, payload, draftId: draft?.id });
      setSaving(false);
      onSaved();
    }
  }

  if (open && loadingDraft) {
    return (
      <Sheet open={open} onClose={onClose} title="รายงานประจำวัน (Follow up)">
        <p className="py-8 text-center text-sm text-muted">กำลังเปิดแบบฟอร์ม…</p>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="รายงานประจำวัน (Follow up)">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required>
            <ThaiDateInput name="date" value={date} onChange={setDate} required />
          </Field>
          <Field label="Time" required>
            <input type="time" name="time" step={1} value={time} onChange={(e) => setTime(e.target.value)} required className={inputCls} />
          </Field>
        </div>

        <Field label="Patient Name" required>
          <input name="patient_name" defaultValue={patientName} required className={inputCls} />
        </Field>

        <div className="rounded-md bg-surface-tint p-3">
          <p className="mb-2 text-xs font-semibold text-muted">สัญญาณชีพ — ก่อน</p>
          <div className="space-y-3">
            <Field label="BP Before (mmHg)" required><input name="bp_before" required className={inputCls} /></Field>
            <Field label="HR Before (bpm)" required><input name="hr_before" required className={inputCls} /></Field>
            <Field label="RR Before (times/min)"><input name="rr_before" inputMode="numeric" className={inputCls} /></Field>
            <Field label="SpO2 Before" required><Spo2Stepper name="spo2_before" value={spo2Before} onChange={setSpo2Before} /></Field>
          </div>
        </div>

        {/* Mobility / Fall Risk — the paper form's checkbox row under Subjective & Objective. */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-ink">Mobility</p>
          <CheckPills name="mobility" options={["Walk", "Wheel chair", "Walker/Stretcher/Cane", "Fall Risk"]} />
        </div>

        <div className="rounded-md bg-surface-tint p-3">
          <p className="mb-2 text-xs font-semibold text-muted">สัญญาณชีพ — หลัง</p>
          <div className="space-y-3">
            <Field label="BP After (mmHg)" required><input name="bp_after" required className={inputCls} /></Field>
            <Field label="HR After (bpm)" required><input name="hr_after" required className={inputCls} /></Field>
            <Field label="RR After (times/min)"><input name="rr_after" inputMode="numeric" className={inputCls} /></Field>
            <Field label="SpO2 After" required><Spo2Stepper name="spo2_after" value={spo2After} onChange={setSpo2After} /></Field>
          </div>
        </div>

        <Field label="Diagnosis"><input name="diagnosis" className={inputCls} /></Field>
        <Field label="Problem List" required><textarea name="problem_list" required className={`${inputCls} h-20 py-2`} /></Field>
        <Field label="Goal" required><input name="goal" required className={inputCls} /></Field>
        <Field label="Subject"><input name="subject" className={inputCls} /></Field>
        <Field label="Treatment" required><textarea name="treatment" required className={`${inputCls} h-20 py-2`} /></Field>
        <Field label="Post Treatment" required><textarea name="post_treatment" required className={`${inputCls} h-16 py-2`} /></Field>

        <Field label="Image">
          <ReportPhotoUpload sessionId={sessionId} initialPaths={draftPhotos(draft?.payload)} />
        </Field>

        <Field label="OT Name" required>
          <input name="ot_name" defaultValue={otName} required className={inputCls} />
        </Field>

        {draftNote && <p className="text-xs text-muted">{draftNote}</p>}
        {error && (
          <p className="rounded-md bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="tonal"
            className="flex-1"
            onClick={handleSaveDraft}
            disabled={saving || draftSaving}
          >
            {draftSaving ? "กำลังบันทึกร่าง…" : "บันทึกร่าง"}
          </Button>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={saving || draftSaving}>
          {saving ? "กำลังบันทึก…" : "บันทึก & จบเคส"}
        </Button>
      </form>
    </Sheet>
  );
}
