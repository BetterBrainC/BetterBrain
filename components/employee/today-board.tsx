"use client";

import Link from "next/link";
import { AlertTriangle, Clock3, CalendarCheck2, CheckCircle2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatThaiTime } from "@/lib/date/buddhist";
import { useLiveDay } from "@/lib/schedule/use-live-day";
import { LiveSessionList } from "@/components/employee/live-session-list";
import type { LiveSession } from "@/lib/schedule/live-status";
import type { SessionRow } from "@/lib/data/queries";

/** Minutes between two instants (>= 0). */
function minutesBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.round((toMs - fromMs) / 60_000));
}

/** "2 ชม. 5 นาที" / "45 นาที" / "ไม่ถึงนาที" */
function humanMinutes(total: number): string {
  if (total <= 0) return "ไม่ถึงนาที";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
  return `${m} นาที`;
}

function startTimeText(s: SessionRow): string {
  return s.scheduledStartISO ? formatThaiTime(s.scheduledStartISO) : s.timeLabel.split("–")[0] || "";
}

const ctaClass = cn(buttonVariants({ size: "md" }), "w-full");

/**
 * Live, clock-aware view of the employee's day. A ticking clock re-classifies
 * every case (every 30s + on tab focus, which also re-pulls server data), so
 * "เคสถัดไป" is always correct and a missed check-in surfaces as a warning —
 * never a stale "next case at 10:30" shown at 13:42.
 */
export function TodayBoard({
  sessions,
  lateThresholdMin,
  serverNowMs,
}: {
  sessions: SessionRow[];
  lateThresholdMin: number;
  serverNowMs: number;
}) {
  const { nowMs, summary } = useLiveDay(sessions, lateThresholdMin, serverNowMs);

  return (
    <div className="space-y-6">
      {summary.focus && (
        <FocusCard live={summary.focus} nowMs={nowMs} overdueCount={summary.overdueCount} />
      )}

      {!summary.focus && summary.doneCount > 0 && sessions.length > 0 && (
        <Card className="flex items-center gap-3" style={{ backgroundColor: "var(--status-completed-bg)" }}>
          <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: "var(--status-completed-fg)" }} />
          <div>
            <CardTitle className="text-base" style={{ color: "var(--status-completed-fg)" }}>
              เช็คอินครบทุกเคสแล้ววันนี้
            </CardTitle>
            <p className="text-sm text-muted">เยี่ยมมาก 🎉</p>
          </div>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">ตารางวันนี้</h2>
          <span className="flex items-center gap-1 text-2xs text-muted">
            <Clock3 className="h-3.5 w-3.5" /> ตอนนี้ {formatThaiTime(nowMs)}
          </span>
        </div>
        <LiveSessionList items={summary.items} />
      </section>
    </div>
  );
}

function FocusCard({
  live,
  nowMs,
  overdueCount,
}: {
  live: LiveSession<SessionRow>;
  nowMs: number;
  overdueCount: number;
}) {
  const { session, category, startMs } = live;
  const time = startTimeText(session);

  if (category === "overdue") {
    const lateBy = startMs != null ? humanMinutes(minutesBetween(startMs, nowMs)) : null;
    return (
      <Card
        className="space-y-3 border-2"
        style={{ backgroundColor: "var(--status-nocheckin-bg)", borderColor: "var(--status-nocheckin-solid)" }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" style={{ color: "var(--status-nocheckin-fg)" }} />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base" style={{ color: "var(--status-nocheckin-fg)" }}>
              ได้เวลาแล้ว — ยังไม่ได้เช็คอิน
            </CardTitle>
            <p className="text-sm text-ink">
              {time ? `${time} · ` : ""}
              {session.patientName}
            </p>
            {lateBy && <p className="text-xs text-muted">เลยเวลานัดมาแล้ว {lateBy}</p>}
            {overdueCount > 1 && (
              <p className="mt-0.5 text-xs text-muted">และอีก {overdueCount - 1} เคสที่เลยเวลา</p>
            )}
          </div>
        </div>
        <Link href={`/app/session/${session.id}`} className={ctaClass}>เช็คอินตอนนี้</Link>
      </Card>
    );
  }

  if (category === "due") {
    return (
      <Card
        className="space-y-3"
        style={{ backgroundColor: "var(--info-bg)", borderColor: "var(--status-early-solid)" }}
      >
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-6 w-6 shrink-0" style={{ color: "var(--info-fg)" }} />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base" style={{ color: "var(--info-fg)" }}>
              ถึงเวลาเช็คอินแล้ว
            </CardTitle>
            <p className="text-sm text-ink">
              {time ? `${time} · ` : ""}
              {session.patientName}
            </p>
          </div>
        </div>
        <Link href={`/app/session/${session.id}`} className={ctaClass}>เช็คอิน</Link>
      </Card>
    );
  }

  // upcoming
  const inMins = startMs != null ? humanMinutes(minutesBetween(nowMs, startMs)) : null;
  return (
    <Card tinted className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <CalendarCheck2 className="h-4 w-4 text-primary" />
          เคสถัดไป{time ? ` · ${time}` : ""}
        </CardTitle>
        <p className="truncate text-sm text-muted">{session.patientName}</p>
        {inMins && <p className="text-xs text-muted">อีก {inMins}</p>}
      </div>
      <Link href={`/app/session/${session.id}`} className={cn(buttonVariants({ size: "md" }), "shrink-0")}>
        เช็คอิน
      </Link>
    </Card>
  );
}
