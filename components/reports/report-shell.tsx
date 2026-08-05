"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThaiDate } from "@/components/ui/thai-date";
import { saveReport } from "@/actions/reports";
import { saveReportDraft, type ReportDraft } from "@/actions/report-drafts";
import { enqueueReport } from "@/lib/sync/checkin-sync";

type ReportType = "assessment_swallow" | "assessment_hand" | "summary" | "assessment_report";

/**
 * Photo paths carried by a restored draft. `ReportPhotoUpload` sits deep inside
 * each form and owns its own hidden inputs, so the paths reach it by context
 * instead of being threaded through every form's props.
 */
const DraftPhotosContext = React.createContext<string[]>([]);

export function useDraftPhotos(): string[] {
  return React.useContext(DraftPhotosContext);
}

/** `photos` out of a saved payload — one value serializes as a string, many as an array. */
function draftPhotos(payload: Record<string, unknown> | undefined): string[] {
  const raw = payload?.photos;
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  return [];
}

/** Clock time (Asia/Bangkok) for the "บันทึกร่างแล้ว · HH:MM" line. */
function bangkokTime(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

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
 *  "บันทึกร่าง" (keep working on it later) and submit → persists to `reports` as
 *  completed (vanish-on-save). */
export function ReportFormShell({
  title,
  patientName,
  backHref,
  sessionId,
  reportType,
  requiresCheckin = false,
  submitLabel = "บันทึก & จบเคส",
  draft = null,
  children,
}: {
  title: string;
  patientName: string;
  backHref: string;
  sessionId: string;
  reportType: ReportType;
  requiresCheckin?: boolean;
  submitLabel?: string;
  draft?: ReportDraft | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [done, setDone] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [restored, setRestored] = React.useState(false);
  const [draftId, setDraftId] = React.useState<string | null>(draft?.id ?? null);
  const [draftSaving, setDraftSaving] = React.useState(false);
  const [draftNote, setDraftNote] = React.useState<string | null>(
    draft ? `กู้ร่างที่บันทึกไว้ ${bangkokTime(draft.savedAtISO)} น. กลับมาแล้ว` : null,
  );
  const draftKey = `tpm:report-draft:${sessionId}:${reportType}`;
  const photos = React.useMemo(() => draftPhotos(draft?.payload), [draft]);

  // Restore the saved draft on mount: the server copy first (it survives a lost
  // phone), then any local autosave on top — that one is newer by construction,
  // since saving a draft clears it.
  React.useEffect(() => {
    if (!formRef.current) return;
    if (draft) restoreForm(formRef.current, draft.payload);
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

  /**
   * "บันทึกร่าง" — park a half-filled form server-side and carry on later. No
   * HTML5 validation (that is the point of a draft) and no course side effects;
   * offline it stays in the local autosave, which is honest about where it is.
   */
  async function onSaveDraft() {
    if (!formRef.current) return;
    const payload = serializeForm(formRef.current);
    setDraftSaving(true);
    setError(null);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      onChange();
      setDraftSaving(false);
      setDraftNote("ออฟไลน์อยู่ — เก็บร่างไว้ในเครื่องนี้ก่อน จะบันทึกขึ้นระบบเมื่อกลับมาออนไลน์");
      return;
    }
    try {
      const res = await saveReportDraft({ sessionId, reportType, payload, draftId });
      setDraftSaving(false);
      if (res.error) return setError(res.error);
      if (res.id) setDraftId(res.id);
      clearDraft();
      setRestored(false);
      setDraftNote(`บันทึกร่างแล้ว ${bangkokTime(new Date().toISOString())} น. · ยังไม่ส่งบันทึกจริง`);
    } catch {
      onChange();
      setDraftSaving(false);
      setDraftNote("บันทึกร่างขึ้นระบบไม่สำเร็จ — เก็บไว้ในเครื่องนี้ให้แล้ว");
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
      await enqueueReport({ clientUuid: crypto.randomUUID(), reportType, sessionId, payload, draftId: draftId ?? undefined });
      setSaving(false);
      clearDraft();
      setDone(true);
      return;
    }
    try {
      const res = await saveReport({ sessionId, reportType, payload, draftId });
      setSaving(false);
      if (res.error) return setError(res.error);
    } catch {
      await enqueueReport({ clientUuid: crypto.randomUUID(), reportType, sessionId, payload, draftId: draftId ?? undefined });
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
        <div className="flex flex-wrap items-center gap-2">
          {requiresCheckin && (
            <Badge tone="info">ต้องเช็คอินก่อนจึงจะบันทึกได้</Badge>
          )}
          {draftId && <Badge tone="late">ร่าง</Badge>}
        </div>
      </header>
      <DraftPhotosContext.Provider value={photos}>
        <form ref={formRef} onSubmit={onSubmit} onChange={onChange} className="space-y-4 pb-8">
          {children}
          {restored && (
            <p className="text-xs text-muted">กู้ข้อมูลที่กรอกค้างไว้ในเครื่องกลับมาแล้ว</p>
          )}
          {draftNote && <p className="text-xs text-muted">{draftNote}</p>}
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={onSaveDraft}
              disabled={saving || draftSaving}
            >
              {draftSaving ? "กำลังบันทึกร่าง…" : "บันทึกร่าง"}
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={saving || draftSaving}>
              {saving ? "กำลังบันทึก…" : submitLabel}
            </Button>
          </div>
        </form>
      </DraftPhotosContext.Provider>
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
