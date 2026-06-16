"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RelativePushToggle } from "@/components/relatives/relative-push-toggle";
import { APP } from "@/lib/i18n/th";
import { formatThaiDate } from "@/lib/date/buddhist";
import type { RelativePortalData } from "@/lib/data/queries";

const REPORT_LABEL = { followup: "บันทึกรายวัน", summary: "ความก้าวหน้ารายเดือน" } as const;

const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function monthTitle(d: Date): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(d);
}

/** Unlocked relatives portal view (rendered only after server-side verify). */
export function PortalContent({ data, token }: { data: RelativePortalData; token: string }) {
  const remaining = Math.max(data.courseTotal - data.courseUsed, 0);
  const pct = data.courseTotal ? Math.min(100, Math.round((data.courseUsed / data.courseTotal) * 100)) : 0;
  const [cursor, setCursor] = React.useState(() => new Date());

  const byDay = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.sessions) m.set(s.dateISO, (m.get(s.dateISO) ?? 0) + 1);
    return m;
  }, [data.sessions]);

  const y = cursor.getFullYear();
  const mo = cursor.getMonth();
  const firstWeekday = (new Date(y, mo, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(y, mo, i + 1)),
  ];
  const todayISO = ymd(new Date());

  return (
    <main className="mx-auto max-w-md space-y-5 px-[var(--gutter-page)] py-8">
      <header className="space-y-1 text-center">
        <p className="text-sm font-medium text-primary">{APP.org}</p>
        <h1 className="font-display text-xl font-bold text-navy">ติดตามการฟื้นฟู — {data.patientName}</h1>
      </header>

      <Card tinted className="space-y-3">
        <CardTitle className="text-base">คอร์สการฟื้นฟู</CardTitle>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["ใช้ไป", data.courseUsed],
            ["เหลือ", remaining],
            ["แถม", data.bonus],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-surface px-2 py-2">
              <p className="font-display text-lg font-bold tabular-nums text-navy">{v}</p>
              <p className="text-2xs text-muted">{k}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="completed">{data.program ?? "โปรแกรมฟื้นฟู"}</Badge>
          {data.courseComplete && <Badge tone="noservice">ครบคอร์สแล้ว</Badge>}
        </div>
        {data.courseComplete && (
          <p className="text-xs text-muted">คอร์สนี้ครบแล้ว — เมื่อบันทึกสรุปรายเดือน สิทธิ์เข้าดูจะสิ้นสุดลง</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">ปฏิทินคิวฝึก</CardTitle>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="ก่อนหน้า" onClick={() => setCursor(new Date(y, mo - 1, 1))} className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted hover:bg-surface-tint">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-medium text-navy">{monthTitle(cursor)}</span>
            <button type="button" aria-label="ถัดไป" onClick={() => setCursor(new Date(y, mo + 1, 1))} className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted hover:bg-surface-tint">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px text-center text-2xs font-medium text-muted">
          {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`b${i}`} />;
            const iso = ymd(date);
            const count = byDay.get(iso) ?? 0;
            const isToday = iso === todayISO;
            return (
              <div
                key={iso}
                className={
                  "flex aspect-square flex-col items-center justify-center rounded-md text-2xs " +
                  (count ? "bg-surface-tint font-semibold text-primary-700" : "text-ink") +
                  (isToday ? " ring-1 ring-teal" : "")
                }
              >
                <span className="tabular-nums">{date.getDate()}</span>
                {count > 0 && <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />}
              </div>
            );
          })}
        </div>
        <div className="space-y-1 border-t border-border pt-2">
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-muted">ยังไม่มีคิวฝึกที่จะถึง</p>
          ) : (
            data.upcoming.map((s, i) => (
              <p key={i} className="flex justify-between text-sm">
                <span className="text-ink">{formatThaiDate(s.date)} · {s.time}</span>
                <span className="text-muted">{s.therapist}</span>
              </p>
            ))
          )}
          <p className="pt-1 text-xs text-faint">แจ้งเตือน 1 วันก่อนเข้าฝึก + ก่อนจบคอร์ส</p>
          <RelativePushToggle token={token} />
        </div>
      </Card>

      {data.therapist && (
        <Card className="flex items-center gap-3">
          {data.therapist.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.therapist.photoUrl} alt={data.therapist.name} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-tint text-primary">
              <UserRound className="h-6 w-6" />
            </span>
          )}
          <div>
            <p className="text-2xs text-muted">ผู้ดูแล/นักบำบัด</p>
            <p className="font-display font-semibold text-navy">{data.therapist.name}</p>
            {data.therapist.role && <p className="text-xs text-muted">{data.therapist.role}</p>}
          </div>
        </Card>
      )}

      <Card className="space-y-2">
        <CardTitle className="text-base">รายงานการฝึก</CardTitle>
        {data.reports.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีรายงานที่เปิดให้ดู</p>
        ) : (
          <ul className="space-y-2">
            {data.reports.map((r) => (
              <li key={r.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <Badge tone={r.type === "summary" ? "info" : "completed"}>{REPORT_LABEL[r.type]}</Badge>
                  <span className="text-xs text-muted">{formatThaiDate(r.dateISO)}</span>
                </div>
                {r.note && <p className="mt-1 text-sm text-ink">{r.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-2">
        <CardTitle className="text-base">วิธีออกกำลังกาย</CardTitle>
        <p className="text-xs text-muted">ท่าฝึกและคำแนะนำสำหรับทำต่อที่บ้าน</p>
        <ul className="space-y-3">
          {data.exercises.map((ex, i) => (
            <li key={i} className="rounded-md bg-surface-tint p-3">
              <p className="text-sm font-semibold text-navy">{i + 1}. {ex.title}</p>
              <p className="mt-1 text-sm text-ink">{ex.detail}</p>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
