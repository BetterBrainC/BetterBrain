"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { ReportPhotoUpload } from "@/components/reports/report-photo-upload";
import { saveFollowup } from "@/actions/checkin";
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
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [spo2Before, setSpo2Before] = React.useState("");
  const [spo2After, setSpo2After] = React.useState("");

  // Default date/time to "now" (Bangkok) when the sheet opens — set client-side
  // to avoid an SSR hydration mismatch.
  React.useEffect(() => {
    if (!open) return;
    const { date: d, time: t } = bangkokNow();
    setDate((cur) => cur || d);
    setTime((cur) => cur || t);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = serialize(e.currentTarget);

    // Offline (e.g. at the patient's home with no signal): queue + flush on reconnect.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueReport({ clientUuid: crypto.randomUUID(), reportType: "followup", sessionId, payload });
      setSaving(false);
      onSaved();
      return;
    }
    try {
      const res = await saveFollowup(sessionId, payload);
      setSaving(false);
      if (res.error) return setError(res.error);
      onSaved();
    } catch {
      await enqueueReport({ clientUuid: crypto.randomUUID(), reportType: "followup", sessionId, payload });
      setSaving(false);
      onSaved();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="รายงานประจำวัน (Follow up)">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <Field label="BP Before" required><input name="bp_before" required className={inputCls} /></Field>
            <Field label="HR Before" required><input name="hr_before" required className={inputCls} /></Field>
            <Field label="SpO2 Before" required><Spo2Stepper name="spo2_before" value={spo2Before} onChange={setSpo2Before} /></Field>
          </div>
        </div>

        <div className="rounded-md bg-surface-tint p-3">
          <p className="mb-2 text-xs font-semibold text-muted">สัญญาณชีพ — หลัง</p>
          <div className="space-y-3">
            <Field label="BP After" required><input name="bp_after" required className={inputCls} /></Field>
            <Field label="HR After" required><input name="hr_after" required className={inputCls} /></Field>
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
          <ReportPhotoUpload sessionId={sessionId} />
        </Field>

        <Field label="OT Name" required>
          <input name="ot_name" defaultValue={otName} required className={inputCls} />
        </Field>

        {error && (
          <p className="rounded-md bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "กำลังบันทึก…" : "บันทึก & จบเคส"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
