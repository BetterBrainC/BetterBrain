"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { DailyReportSheet } from "@/components/reports/daily-report-sheet";

/**
 * Standalone entry to the daily Follow up report (รายงานประจำวัน). The same sheet
 * also opens automatically after check-out; this card lets the employee open it
 * manually from the บันทึกรายงาน section (client brief 28/6/2569).
 */
export function DailyReportCard({
  sessionId,
  patientName,
  otName,
}: {
  sessionId: string;
  patientName: string;
  otName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-3 text-left text-sm font-medium text-navy hover:bg-surface-tint"
      >
        <ClipboardList className="h-4 w-4 shrink-0 text-muted" /> รายงานประจำวัน
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
