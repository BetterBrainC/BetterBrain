"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThaiDate } from "@/components/ui/thai-date";
import { saveReport } from "@/actions/reports";
import { enqueueReport } from "@/lib/sync/checkin-sync";

type ReportType = "assessment_swallow" | "assessment_hand" | "summary";

/** Serialize a form into a plain object; repeated names (checkbox groups) → arrays. */
function serializeForm(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of new FormData(form).entries()) {
    if (k in out) {
      const cur = out[k];
      out[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Restore saved draft values into an uncontrolled form's fields. */
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

/** Shared wrapper for the clinical report forms: header, check-in gate note,
 *  submit → persists to `reports` as completed (vanish-on-save). */
export function ReportFormShell({
  title,
  patientName,
  backHref,
  sessionId,
  reportType,
  requiresCheckin = false,
  submitLabel = "บันทึก & จบเคส",
  children,
}: {
  title: string;
  patientName: string;
  backHref: string;
  sessionId: string;
  reportType: ReportType;
  requiresCheckin?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [done, setDone] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [restored, setRestored] = React.useState(false);
  const draftKey = `tpm:report-draft:${sessionId}:${reportType}`;

  // Restore an in-progress draft on mount (survives a dropped connection).
  React.useEffect(() => {
    if (!formRef.current) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        restoreForm(formRef.current, JSON.parse(raw) as Record<string, unknown>);
        setRestored(true);
      }
    } catch {
      // corrupt draft — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave on any field change.
  function onChange() {
    if (!formRef.current) return;
    const data = serializeForm(formRef.current);
    try {
      localStorage.setItem(draftKey, JSON.stringify(data));
      setRestored(false);
    } catch {
      // storage full / unavailable — best-effort
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = serializeForm(e.currentTarget);
    setSaving(true);
    setError(null);

    // Offline (e.g. at the patient's home): queue + flush on reconnect. Idempotent
    // via the client report id; assessments flush AFTER their check-in.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueReport({ clientUuid: crypto.randomUUID(), reportType, sessionId, payload });
      setSaving(false);
      clearDraft();
      setDone(true);
      return;
    }
    try {
      const res = await saveReport({ sessionId, reportType, payload });
      setSaving(false);
      if (res.error) return setError(res.error);
    } catch {
      await enqueueReport({ clientUuid: crypto.randomUUID(), reportType, sessionId, payload });
      setSaving(false);
      clearDraft();
      setDone(true);
      return;
    }
    clearDraft();
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="px-[var(--gutter-page)] py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal" />
        <h1 className="mt-3 font-display text-xl font-bold text-navy">บันทึกแล้ว · จบเคส</h1>
        <p className="mt-1 text-sm text-muted">รายงานถูกซ่อนจากพนักงาน เห็นเฉพาะ Admin/Director</p>
        <Link href={backHref}><Button className="mt-5">กลับ</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-[var(--gutter-page)] pt-4">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> กลับ
      </Link>
      <header className="space-y-1">
        <h1 className="font-display text-xl font-bold text-navy">{title}</h1>
        <p className="text-sm text-muted">
          {patientName} · <ThaiDate value={new Date()} />
        </p>
        {requiresCheckin && (
          <Badge tone="info">ต้องเช็คอินก่อนจึงจะบันทึกได้</Badge>
        )}
      </header>
      <form ref={formRef} onSubmit={onSubmit} onChange={onChange} className="space-y-4 pb-8">
        {children}
        {restored && (
          <p className="text-xs text-muted">กู้ร่างที่กรอกค้างไว้กลับมาแล้ว · ระบบบันทึกร่างอัตโนมัติ</p>
        )}
        {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "กำลังบันทึก…" : submitLabel}
        </Button>
      </form>
    </div>
  );
}

/** Small labeled section card used inside report forms. */
export function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}

const pillCls =
  "inline-block rounded-pill border border-border bg-surface px-3 py-1.5 text-xs text-ink transition-colors peer-checked:border-primary peer-checked:bg-surface-tint peer-checked:font-medium peer-checked:text-primary-700 peer-focus-visible:ring-2 peer-focus-visible:ring-primary";

/** Checkbox group as pill toggles. Real checkboxes (FormData), styled via peer. */
export function CheckRow({ options, name }: { options: string[]; name?: string }) {
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
 * Single-choice pill group — the paper forms' ☐ น้อย ☐ ปานกลาง ☐ ดี ☐ ปกติ rows,
 * where exactly one box is ticked. Radios, so FormData yields one value per name.
 */
export function RadioRow({ options, name }: { options: string[]; name: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input type="radio" name={name} value={o} className="peer sr-only" />
          <span className={pillCls}>{o}</span>
        </label>
      ))}
    </div>
  );
}

/** Block sub-heading inside a report section (paper form's inline label rows). */
export function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-ink">{children}</p>;
}
