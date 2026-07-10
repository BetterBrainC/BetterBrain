"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, UserRound, CalendarClock } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RelativePushToggle } from "@/components/relatives/relative-push-toggle";
import { APP } from "@/lib/i18n/th";
import { formatThaiDate } from "@/lib/date/buddhist";
import { ThaiDate } from "@/components/ui/thai-date";
import type { RelativePortalData } from "@/lib/data/queries";

const REPORT_LABEL = {
  assessment_swallow: "รายงานประเมินแรกรับ · Swallowing",
  assessment_hand: "รายงานประเมินแรกรับ · Hand Function",
  followup: "รายงานประจำวัน",
  summary: "รายงานความก้าวหน้ารายเดือน",
} as const;

/** Relative-facing session status (friendlier than the staff labels). */
const SESSION_VIEW: Record<string, { label: string; tone: "completed" | "late" | "info" | "nocheckin" | "skipped" | "neutral" }> = {
  completed: { label: "ฝึกแล้ว", tone: "completed" },
  attended: { label: "ฝึกแล้ว", tone: "completed" },
  corrected: { label: "ฝึกแล้ว", tone: "completed" },
  late: { label: "ฝึกแล้ว (สาย)", tone: "late" },
  in_progress: { label: "กำลังฝึก", tone: "info" },
  scheduled: { label: "นัดฝึก", tone: "info" },
  rescheduled: { label: "เลื่อนนัด", tone: "info" },
  no_checkin: { label: "ไม่ได้เข้าฝึก", tone: "nocheckin" },
  skipped: { label: "งด", tone: "skipped" },
  cancelled: { label: "ยกเลิก", tone: "skipped" },
};

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
  const [selected, setSelected] = React.useState<string | null>(null);

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

  // Sessions in the visible month (then optionally narrowed to a tapped day).
  const monthPrefix = `${y}-${pad(mo + 1)}-`;
  const monthSessions = React.useMemo(
    () =>
      data.sessions
        .filter((s) => s.dateISO.startsWith(monthPrefix))
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.time.localeCompare(b.time)),
    [data.sessions, monthPrefix],
  );
  const listed = selected ? monthSessions.filter((s) => s.dateISO === selected) : monthSessions;
  const next = data.upcoming[0];
  const goMonth = (delta: number) => {
    setCursor(new Date(y, mo + delta, 1));
    setSelected(null);
  };

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
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => goMonth(-1)} className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted hover:bg-surface-tint">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-medium text-navy">{monthTitle(cursor)}</span>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => goMonth(1)} className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted hover:bg-surface-tint">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {next && (
          <div className="flex items-center gap-2 rounded-md bg-surface-tint px-3 py-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-ink">
              <span className="font-semibold text-navy">ครั้งถัดไป</span> <ThaiDate value={next.date} /> · {next.time}
              {next.therapist && next.therapist !== "—" ? ` · ${next.therapist}` : ""}
            </p>
          </div>
        )}

        <div className="grid grid-cols-7 gap-px text-center text-2xs font-medium text-muted">
          {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`b${i}`} />;
            const iso = ymd(date);
            const count = byDay.get(iso) ?? 0;
            const isToday = iso === todayISO;
            const isSelected = iso === selected;
            const base = "flex aspect-square flex-col items-center justify-center rounded-md text-2xs ";
            const tone = count ? "bg-surface-tint font-semibold text-primary-700" : "text-ink";
            const ring = isSelected ? " ring-2 ring-primary" : isToday ? " ring-1 ring-teal" : "";
            if (count > 0) {
              return (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`วันที่ ${date.getDate()} มีคิวฝึก ${count} รายการ`}
                  onClick={() => setSelected(isSelected ? null : iso)}
                  className={base + tone + ring + " hover:bg-surface-sunken"}
                >
                  <span className="tabular-nums">{date.getDate()}</span>
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
                </button>
              );
            }
            return (
              <div key={iso} className={base + tone + ring}>
                <span className="tabular-nums">{date.getDate()}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-2xs text-muted">
          <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" /> วันที่มีคิวฝึก</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full ring-1 ring-teal" /> วันนี้</span>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              {selected ? `คิวฝึกวันที่ ${formatThaiDate(selected)}` : "คิวฝึกเดือนนี้"} ({listed.length})
            </p>
            {selected && (
              <button type="button" onClick={() => setSelected(null)} className="text-xs font-medium text-primary">
                ดูทั้งเดือน
              </button>
            )}
          </div>
          {listed.length === 0 ? (
            <p className="text-sm text-muted">{selected ? "วันนี้ไม่มีคิวฝึก" : "เดือนนี้ยังไม่มีคิวฝึก"}</p>
          ) : (
            <ul className="space-y-1.5">
              {listed.map((s, i) => {
                const v = SESSION_VIEW[s.status] ?? { label: "", tone: "neutral" as const };
                return (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink"><ThaiDate value={s.dateISO} /> · {s.time}</span>
                    <span className="flex items-center gap-2">
                      {s.therapist && s.therapist !== "—" && <span className="text-xs text-muted">{s.therapist}</span>}
                      {v.label && <Badge tone={v.tone}>{v.label}</Badge>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs text-faint">แจ้งเตือน 1 วันก่อนเข้าฝึก + ก่อนจบคอร์ส</p>
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
                  <span className="text-xs text-muted"><ThaiDate value={r.dateISO} /></span>
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
