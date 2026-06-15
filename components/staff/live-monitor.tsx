"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarClock } from "lucide-react";
import { SESSION_STATUS_LABEL } from "@/lib/i18n/th";

type SessionStatus = keyof typeof SESSION_STATUS_LABEL;
type MonitorRow = { name: string; patient: string; time: string; status: SessionStatus };

const TONE: Record<string, "completed" | "late" | "info" | "neutral" | "nocheckin" | "skipped"> = {
  completed: "completed", attended: "completed", in_progress: "info", late: "late",
  no_checkin: "nocheckin", skipped: "skipped", scheduled: "neutral", rescheduled: "info",
  cancelled: "skipped", corrected: "info",
};

/**
 * Live monitor — today's sessions with a ticking clock + a 60s auto-refresh
 * (lightweight "live" without a realtime subscription).
 */
export function LiveMonitor({ rows, employeeCount }: { rows: MonitorRow[]; employeeCount: number }) {
  const router = useRouter();
  const [clock, setClock] = React.useState("");

  React.useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
    setClock(fmt());
    const tick = setInterval(() => setClock(fmt()), 1000);
    const refresh = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="text-base">ตารางนัดวันนี้ · Live Monitor</CardTitle>
        <span className="inline-flex items-center gap-1 text-2xs font-medium tabular-nums text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" /> {clock}
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="ไม่มีนัดวันนี้" />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((m, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{m.patient}</p>
                <p className="truncate text-2xs text-faint">
                  {m.time ? `${m.time} · ` : ""}{m.name}
                </p>
              </div>
              <Badge tone={TONE[m.status] ?? "neutral"}>{SESSION_STATUS_LABEL[m.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-faint">Admin และ Director เห็นเหมือนกัน · พนักงาน {employeeCount} คน</p>
    </Card>
  );
}
