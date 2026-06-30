"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ThaiDate } from "@/components/ui/thai-date";
import { SESSION_STATUS_LABEL } from "@/lib/i18n/th";
import type { CalendarSession } from "@/lib/data/queries";

type View = "month" | "week" | "day";
type SessionStatus = CalendarSession["status"];

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const TONE: Record<SessionStatus, { fg: string; bg: string }> = {
  scheduled: { fg: "--info-fg", bg: "--info-bg" },
  rescheduled: { fg: "--info-fg", bg: "--info-bg" },
  in_progress: { fg: "--status-early-fg", bg: "--status-early-bg" },
  attended: { fg: "--status-completed-fg", bg: "--status-completed-bg" },
  completed: { fg: "--status-completed-fg", bg: "--status-completed-bg" },
  late: { fg: "--status-late-fg", bg: "--status-late-bg" },
  no_checkin: { fg: "--status-nocheckin-fg", bg: "--status-nocheckin-bg" },
  skipped: { fg: "--status-skipped-fg", bg: "--status-skipped-bg" },
  cancelled: { fg: "--status-skipped-fg", bg: "--status-skipped-bg" },
  corrected: { fg: "--info-fg", bg: "--info-bg" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function bangkokTodayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function isoToDate(iso: string): Date {
  const p = iso.split("-");
  return new Date(Number(p[0]) || 0, (Number(p[1]) || 1) - 1, Number(p[2]) || 1, 12);
}
function monthTitle(d: Date) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(d);
}
function weekDays(cursor: Date): Date[] {
  const sunIdx = cursor.getDay();
  const sunday = new Date(cursor);
  sunday.setDate(cursor.getDate() - sunIdx);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(sunday); d.setDate(sunday.getDate() + i); return d; });
}

/** Employee schedule: monthly calendar (month/week/day), tap a day → time-ordered cards → session. */
export function EmployeeCalendar({ sessions }: { sessions: CalendarSession[] }) {
  const todayISO = React.useMemo(bangkokTodayISO, []);
  const [view, setView] = React.useState<View>("month");
  const [cursor, setCursor] = React.useState<Date>(() => isoToDate(todayISO));
  const [day, setDay] = React.useState<string>(todayISO);

  const byDay = React.useMemo(() => {
    const m = new Map<string, CalendarSession[]>();
    for (const s of sessions) (m.get(s.dateISO) ?? m.set(s.dateISO, []).get(s.dateISO)!).push(s);
    return m;
  }, [sessions]);

  const y = cursor.getFullYear();
  const mo = cursor.getMonth();
  const firstWeekday = new Date(y, mo, 1).getDay(); // Sunday-first (0 = Sun)
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(y, mo, i + 1, 12)),
  ];

  const dayList = (byDay.get(day) ?? []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const title = view === "month" ? monthTitle(cursor) : `สัปดาห์/วัน · ${monthTitle(cursor)}`;
  function shift(dir: -1 | 1) {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + dir);
    else if (view === "week") next.setDate(next.getDate() + dir * 7);
    else next.setDate(next.getDate() + dir);
    setCursor(next);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="ก่อนหน้า" onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted hover:bg-surface-tint">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-navy">{title}</span>
          <button type="button" aria-label="ถัดไป" onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted hover:bg-surface-tint">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex rounded-pill bg-surface-sunken p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={"flex-1 rounded-pill py-1.5 text-sm font-medium transition-colors " + (view === v ? "bg-surface text-teal shadow-sm" : "text-muted")}>
              {v === "month" ? "เดือน" : v === "week" ? "สัปดาห์" : "วัน"}
            </button>
          ))}
        </div>

        {view === "month" ? (
          <>
            <div className="grid grid-cols-7 gap-px text-center text-2xs font-medium text-muted">
              {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={`b${i}`} className="min-h-16 sm:min-h-24" />;
                const iso = ymd(date);
                const chips = (byDay.get(iso) ?? []).slice().sort((a, b) => a.time.localeCompare(b.time));
                const isToday = iso === todayISO;
                const picked = iso === day;
                return (
                  <div
                    key={iso}
                    className={
                      "min-h-16 rounded-md border p-1 sm:min-h-24 " +
                      (picked ? "border-primary ring-1 ring-primary" : isToday ? "border-teal bg-[var(--status-completed-bg)]" : "border-border bg-surface")
                    }
                  >
                    <div className="mb-0.5 flex items-center justify-between">
                      <button type="button" onClick={() => setDay(iso)} className={"rounded px-1 text-xs font-semibold tabular-nums hover:bg-surface-tint " + (isToday ? "text-teal" : "text-ink")}>
                        {date.getDate()}
                      </button>
                      {chips.length > 0 && (
                        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-surface-sunken px-1 text-[10px] font-semibold tabular-nums text-muted">{chips.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {chips.slice(0, 3).map((s) => {
                        const tone = TONE[s.status];
                        return (
                          <Link
                            key={s.id}
                            href={`/app/session/${s.id}`}
                            title={`${s.time} ${s.patient}${s.kind === "assessment" ? " · ประเมิน" : ""}`}
                            className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-2xs font-medium"
                            style={{ backgroundColor: `var(${tone.bg})`, color: `var(${tone.fg})` }}
                          >
                            <span className="font-semibold tabular-nums">{s.time}</span>
                            <span className="truncate">{s.patient}</span>
                            {s.kind === "assessment" && <span className="ml-auto shrink-0 text-[9px] font-bold">ปม</span>}
                          </Link>
                        );
                      })}
                      {chips.length > 3 && (
                        <button type="button" onClick={() => setDay(iso)} className="px-1 text-2xs text-faint">+{chips.length - 3} เพิ่มเติม</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(view === "week" ? weekDays(cursor) : [cursor]).map((d) => {
              const iso = ymd(d);
              const count = (byDay.get(iso) ?? []).length;
              const picked = iso === day;
              return (
                <button key={iso} type="button" onClick={() => setDay(iso)}
                  className={"rounded-md border px-2 py-1.5 text-2xs " + (picked ? "border-primary ring-1 ring-primary" : "border-border")}>
                  <ThaiDate value={iso} /> {count > 0 ? `· ${count}` : ""}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-navy">
          คิวฝึกวันที่ <ThaiDate value={day} /> ({dayList.length})
        </p>
        {dayList.length === 0 ? (
          <Card><p className="text-sm text-muted">วันนี้ไม่มีคิว</p></Card>
        ) : (
          dayList.map((s) => {
            const tone = TONE[s.status];
            return (
              <Link key={s.id} href={`/app/session/${s.id}`}>
                <Card className="flex items-center justify-between gap-2 transition hover:bg-surface-tint">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                      {s.time} · {s.patient}
                      {s.kind === "assessment" && (
                        <span className="rounded px-1.5 py-0.5 text-2xs font-semibold" style={{ backgroundColor: "var(--info-bg)", color: "var(--info-fg)" }}>ประเมิน</span>
                      )}
                    </p>
                    {s.address && <p className="mt-0.5 flex items-center gap-1 truncate text-2xs text-muted"><MapPin className="h-3 w-3 shrink-0" /> {s.address}</p>}
                  </div>
                  <span className="shrink-0 rounded-pill px-2 py-0.5 text-2xs font-semibold" style={{ backgroundColor: `var(${tone.bg})`, color: `var(${tone.fg})` }}>
                    {SESSION_STATUS_LABEL[s.status]}
                  </span>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
