"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getRelativeReport } from "@/actions/portal";
import { portalCodeKey } from "@/components/relatives/portal-gate";
import { Letterhead, SummaryPrint, AssessmentPrint } from "@/components/print/report-print-templates";
import {
  SwallowingAssessmentPrint,
  HandAssessmentPrint,
} from "@/components/print/assessment-print-templates";
import { FollowupPrint } from "@/components/print/followup-print-template";
import { PORTAL_ERR } from "@/lib/i18n/th";
import type { ReportDetail } from "@/lib/data/queries";

const CODE_ERROR: string = PORTAL_ERR.badCode;

/**
 * Relatives-facing report view: the same letterhead layouts staff print, reached
 * with the share token + the recipient's phone last-4. The code is re-verified
 * server-side on every load; sessionStorage only saves the relative retyping it
 * when they came from the portal.
 */
export function PortalReportView({ token, reportId }: { token: string; reportId: string }) {
  const [report, setReport] = React.useState<ReportDetail | null>(null);
  const [val, setVal] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  /** Returns the error, or null on success. */
  const load = React.useCallback(
    async (code: string) => {
      const res = await getRelativeReport(token, code, reportId);
      if (res.error || !res.data) return res.error ?? "เปิดรายงานไม่ได้";
      setReport(res.data);
      return null;
    },
    [token, reportId],
  );

  // Auto-unlock with the code from the portal tab, if there is one.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved: string | null = null;
      try {
        saved = sessionStorage.getItem(portalCodeKey(token));
      } catch {
        // storage unavailable — fall through to the gate
      }
      if (saved) {
        const error = await load(saved);
        // A stale code just means "ask again"; anything else (e.g. the clinic
        // stopped sharing this report) is worth saying instead of silently
        // making them retype a code that will not help.
        if (error && error !== CODE_ERROR && !cancelled) setErr(error);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, load]);

  async function submit() {
    setBusy(true);
    setErr(null);
    const error = await load(val);
    setBusy(false);
    if (error) return setErr(error);
    try {
      sessionStorage.setItem(portalCodeKey(token), val);
    } catch {
      // best effort
    }
  }

  if (checking) {
    return <main className="px-[var(--gutter-page)] py-20 text-center text-sm text-muted">กำลังเปิดรายงาน…</main>;
  }

  if (!report) {
    return (
      <main className="mx-auto max-w-sm space-y-4 px-[var(--gutter-page)] py-16">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 font-display text-xl font-bold text-navy">ยืนยันตัวตน</h1>
          <p className="mt-1 text-sm text-muted">กรอกเบอร์โทร 4 ตัวท้ายของผู้รับบริการเพื่อเปิดรายงาน</p>
        </div>
        <Card className="space-y-3">
          <input
            inputMode="numeric"
            maxLength={4}
            value={val}
            onChange={(e) => { setVal(e.target.value.replace(/\D/g, "")); setErr(null); }}
            onKeyDown={(e) => e.key === "Enter" && val.length === 4 && submit()}
            placeholder="• • • •"
            aria-label="เบอร์โทร 4 ตัวท้าย"
            className="h-12 w-full rounded-md border border-border bg-surface text-center text-2xl tracking-[0.5em] outline-none focus:border-primary"
          />
          {err && <p className="text-center text-sm text-[var(--danger-fg)]">{err}</p>}
          <Button size="lg" className="w-full" disabled={val.length !== 4 || busy} onClick={submit}>
            {busy ? "กำลังตรวจสอบ…" : "เปิดรายงาน"}
          </Button>
          <Link href={`/r/${token}`} className="block text-center text-sm text-muted">
            กลับหน้าติดตามการฟื้นฟู
          </Link>
        </Card>
      </main>
    );
  }

  const body =
    report.reportType === "followup" ? <FollowupPrint r={report} />
    : report.reportType === "summary" ? <SummaryPrint r={report} />
    : report.reportType === "assessment_report" ? <AssessmentPrint r={report} />
    : report.reportType === "assessment_swallow" ? <SwallowingAssessmentPrint r={report} />
    : report.reportType === "assessment_hand" ? <HandAssessmentPrint r={report} />
    : null;

  return (
    <div className="min-h-dvh bg-white text-[13px] leading-relaxed text-black [color-scheme:light]">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 print:hidden">
        <Link href={`/r/${token}`} className="inline-flex items-center gap-1 text-sm text-muted">
          <ArrowLeft className="h-4 w-4" /> กลับ
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> บันทึกเป็น PDF
        </Button>
      </div>
      <p className="px-4 pt-3 text-xs text-muted print:hidden">
        เลือกปลายทาง &ldquo;Save as PDF / บันทึกเป็น PDF&rdquo; ในหน้าต่างพิมพ์
      </p>
      <div className="mx-auto max-w-[210mm] px-6 pb-10 print:px-0 print:pb-0">
        <Letterhead />
        {body}
      </div>
    </div>
  );
}
