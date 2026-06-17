"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThaiDate } from "@/components/ui/thai-date";
import { saveFollowup } from "@/actions/checkin";
import { enqueueReport } from "@/lib/sync/checkin-sync";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-primary";

/**
 * Daily report — opened automatically after the employee presses "เช็คเอาท์".
 * Fields mirror บันทึกรายวัน (docs/DOMAIN-SPEC §E). Demo: save is local only.
 */
export function DailyReportSheet({
  open,
  onClose,
  sessionId,
  patientName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  patientName: string;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    // Offline (e.g. at the patient's home with no signal): queue the report and
    // flush on reconnect — idempotent via the client report id.
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
    <Sheet open={open} onClose={onClose} title="บันทึกรายวัน (Follow up)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          {patientName} · <ThaiDate value={new Date()} />
        </p>

        <div className="rounded-md bg-surface-tint p-3">
          <p className="mb-2 text-xs font-semibold text-muted">
            สัญญาณชีพ ก่อน → หลัง
          </p>
          <div className="grid grid-cols-3 gap-2">
            {["BP", "HR", "SpO2"].map((v) => (
              <div key={v} className="space-y-1">
                <span className="text-2xs text-muted">{v}</span>
                <input name={`${v}_before`} className={inputCls} placeholder="ก่อน" />
                <input name={`${v}_after`} className={inputCls} placeholder="หลัง" />
              </div>
            ))}
          </div>
        </div>

        <Field label="Problem list">
          <textarea name="problem_list" className={`${inputCls} h-20 py-2`} />
        </Field>
        <Field label="Goal">
          <input name="goal" className={inputCls} />
        </Field>
        <Field label="Treatment">
          <textarea name="treatment" className={`${inputCls} h-20 py-2`} />
        </Field>
        <Field label="Post-treatment">
          <textarea name="post_treatment" className={`${inputCls} h-16 py-2`} />
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
