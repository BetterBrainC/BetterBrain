"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DailyReportSheet } from "@/components/reports/daily-report-sheet";

/**
 * Standalone entry to the daily Follow up report (รายงานประจำวัน). The same sheet
 * also opens automatically after check-out; this card lets the employee open it
 * manually from the บันทึกรายงาน section (client brief 28/6/2569).
 *
 * Locked until the visit is checked out. Saving this report ends the case, which
 * hides the "เช็คเอาท์" button for good — 22 visits were closed that way and could
 * never record their end time (client 5 ส.ค. 2569, work-hours column).
 */
export function DailyReportCard({
  sessionId,
  patientName,
  otName,
  hasDraft = false,
  hasCheckOut = true,
}: {
  sessionId: string;
  patientName: string;
  otName?: string;
  hasDraft?: boolean;
  hasCheckOut?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  if (!hasCheckOut) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-faint">
          <ClipboardList className="h-4 w-4 shrink-0" /> รายงานประจำวัน
        </p>
        <p className="mt-1 text-xs text-muted">กด “เช็คเอาท์” ก่อน แล้วฟอร์มจะเปิดให้อัตโนมัติ</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-3 text-left text-sm font-medium text-navy hover:bg-surface-tint"
      >
        <ClipboardList className="h-4 w-4 shrink-0 text-muted" /> รายงานประจำวัน
        {hasDraft && <Badge tone="late">ร่าง</Badge>}
      </button>
      <DailyReportSheet
        open={open}
        onClose={() => setOpen(false)}
        sessionId={sessionId}
        patientName={patientName}
        otName={otName}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
