"use client";

import { Clock3 } from "lucide-react";
import { formatThaiTime } from "@/lib/date/buddhist";
import { useLiveDay } from "@/lib/schedule/use-live-day";
import { LiveSessionList } from "@/components/employee/live-session-list";
import type { SessionRow } from "@/lib/data/queries";

/**
 * Check-in landing list — same live, clock-aware status as the home board
 * (overdue cases flagged "เลยเวลา · ยังไม่ได้เช็คอิน"). Completed cases are
 * hidden since this surface is for picking a case to check in.
 */
export function CheckInList({
  sessions,
  lateThresholdMin,
  serverNowMs,
}: {
  sessions: SessionRow[];
  lateThresholdMin: number;
  serverNowMs: number;
}) {
  const { nowMs, summary } = useLiveDay(sessions, lateThresholdMin, serverNowMs);
  const items = summary.items.filter((i) => i.category !== "done");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <span className="flex items-center gap-1 text-2xs text-muted">
          <Clock3 className="h-3.5 w-3.5" /> ตอนนี้ {formatThaiTime(nowMs)}
        </span>
      </div>
      <LiveSessionList items={items} />
    </div>
  );
}
