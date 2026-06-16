"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, MapPin, Clock, User, Stethoscope, Ban, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { SESSION_STATUS_LABEL } from "@/lib/i18n/th";
import { formatThaiDate } from "@/lib/date/buddhist";
import { markSessionSkipped, updateSessionSpecial, substituteSession } from "@/actions/scheduling";
import type { CalendarSession } from "@/lib/data/queries";

type EmpOpt = { id: string; name: string; code: string | null };

/** Admin controls inside the visit sheet: จัดเวรแทน + งด + edit เคสพิเศษ on an existing session. */
function SessionActions({ session, employees, onDone }: { session: CalendarSession; employees: EmpOpt[]; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [special, setSpecial] = React.useState(session.isSpecial);
  const [amount, setAmount] = React.useState(session.specialAmount ? String(session.specialAmount) : "");
  const [subOpen, setSubOpen] = React.useState(false);
  const [subEmp, setSubEmp] = React.useState("");
  const [subReason, setSubReason] = React.useState("");

  async function skip() {
    setBusy(true); setErr(null);
    const res = await markSessionSkipped(session.id, "ผู้รับบริการยกเลิก");
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh(); onDone();
  }
  async function saveSpecial(next: boolean, amt: string) {
    setSpecial(next); setAmount(amt);
    setBusy(true); setErr(null);
    const res = await updateSessionSpecial({ sessionId: session.id, isSpecial: next, amount: next ? Number(amt) || 0 : null });
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }
  async function substitute() {
    if (!subEmp) return setErr("เลือกพนักงานแทน");
    setBusy(true); setErr(null);
    const res = await substituteSession({ sessionId: session.id, substituteEmployeeId: subEmp, reason: subReason });
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh(); onDone();
  }

  const canEdit = session.status !== "skipped" && session.status !== "completed";

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {canEdit && (
        <div className="space-y-2">
          {!subOpen ? (
            <Button size="sm" variant="secondary" onClick={() => setSubOpen(true)} disabled={busy}>
              <Repeat className="h-4 w-4" /> จัดเวรแทน / สลับเวร
            </Button>
          ) : (
            <div className="space-y-2 rounded-md bg-surface-tint p-3">
              <p className="text-sm font-medium text-navy">จัดเวรแทนเคสนี้ — เดิม: {session.employeeFull}</p>
              <select
                value={subEmp}
                disabled={busy}
                onChange={(e) => setSubEmp(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
              >
                <option value="" disabled>เลือกพนักงานแทน</option>
                {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}{e.code ? ` (${e.code})` : ""}</option>))}
              </select>
              <input type="text" value={subReason} placeholder="เหตุผล (ไม่บังคับ)" disabled={busy}
                onChange={(e) => setSubReason(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary" />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setSubOpen(false)} disabled={busy}>ยกเลิก</Button>
                <Button size="sm" className="flex-1" onClick={substitute} disabled={busy}>ยืนยันจัดเวรแทน</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={special} disabled={busy}
          onChange={(e) => saveSpecial(e.target.checked, amount)} />
        เคสพิเศษ (เพิ่มเงิน)
      </label>
      {special && (
        <div className="flex items-center gap-2">
          <input type="number" inputMode="numeric" value={amount} placeholder="จำนวนเงิน (บาท)" disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => saveSpecial(true, amount)}
            className="h-9 w-40 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary" />
          <span className="text-xs text-muted">บาท</span>
        </div>
      )}
      {canEdit && (
        <Button size="sm" variant="secondary" onClick={skip} disabled={busy}>
          <Ban className="h-4 w-4" /> งด (ผู้รับบริการยกเลิก)
        </Button>
      )}
      {err && <p className="text-sm text-[var(--danger-fg)]">{err}</p>}
    </div>
  );
}

type View = "day" | "week" | "month";
type SessionStatus = CalendarSession["status"];

// Monday-first weekday headers (matches Thai clinic calendars).
const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

// Map each session status to the design-system status tokens (never colour-only:
// the label always travels with the chip + appears in the legend).
const STATUS_TONE: Record<SessionStatus, { fg: string; bg: string; solid: string }> = {
  scheduled: { fg: "--info-fg", bg: "--info-bg", solid: "--primary" },
  rescheduled: { fg: "--status-early-fg", bg: "--status-early-bg", solid: "--status-early-solid" },
  in_progress: { fg: "--status-early-fg", bg: "--status-early-bg", solid: "--status-early-solid" },
  attended: { fg: "--status-completed-fg", bg: "--status-completed-bg", solid: "--status-completed-solid" },
  completed: { fg: "--status-completed-fg", bg: "--status-completed-bg", solid: "--status-completed-solid" },
  late: { fg: "--status-late-fg", bg: "--status-late-bg", solid: "--status-late-solid" },
  no_checkin: { fg: "--status-nocheckin-fg", bg: "--status-nocheckin-bg", solid: "--status-nocheckin-solid" },
  skipped: { fg: "--status-skipped-fg", bg: "--status-skipped-bg", solid: "--status-skipped-solid" },
  cancelled: { fg: "--status-skipped-fg", bg: "--status-skipped-bg", solid: "--status-skipped-solid" },
  corrected: { fg: "--info-fg", bg: "--info-bg", solid: "--primary" },
};

// Statuses considered "still upcoming" for the คงเหลือ tile; the rest are ผ่านมาแล้ว.
const UPCOMING: SessionStatus[] = ["scheduled", "rescheduled", "in_progress"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parse a YYYY-MM-DD string into a noon-local Date (no TZ drift). */
function isoToDate(iso: string): Date {
  const p = iso.split("-");
  return new Date(Number(p[0]) || 0, (Number(p[1]) || 1) - 1, Number(p[2]) || 1, 12);
}

function bangkokTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function monthTitle(d: Date): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(d);
}

function dayTitle(d: Date): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(d);
}

function SessionChip({ s, onSelect }: { s: CalendarSession; onSelect?: (s: CalendarSession) => void }) {
  const tone = STATUS_TONE[s.status];
  const style = { backgroundColor: `var(${tone.bg})`, color: `var(${tone.fg})` };
  const title = `${s.time} ${s.patient} · ${s.employee} · ${SESSION_STATUS_LABEL[s.status]}${s.isSpecial ? " · เคสพิเศษ" : ""}`;
  const inner = (
    <>
      <span className="font-semibold tabular-nums">{s.time}</span>
      <span className="truncate">{s.patient}</span>
      {s.isSpecial && <Sparkles className="ml-auto h-3 w-3 shrink-0" style={{ color: "var(--accent)" }} aria-label="เคสพิเศษ" />}
    </>
  );
  const cls = "flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-2xs font-medium";
  if (!onSelect) {
    return <div className={cls} style={style} title={title}>{inner}</div>;
  }
  return (
    <button type="button" onClick={() => onSelect(s)} className={cls + " transition hover:brightness-95"} style={style} title={title}>
      {inner}
    </button>
  );
}

/** Detail sheet shown when a calendar chip is clicked. */
function VisitDetailSheet({ session, employees, onClose }: { session: CalendarSession | null; employees: EmpOpt[]; onClose: () => void }) {
  const tone = session ? STATUS_TONE[session.status] : null;
  const mapsHref = session?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.address)}`
    : null;
  return (
    <Sheet open={!!session} onClose={onClose} title="รายละเอียดคิว">
      {session && tone && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-navy">{session.patientFull}</h3>
            <span
              className="rounded-pill px-2.5 py-1 text-2xs font-semibold"
              style={{ backgroundColor: `var(${tone.bg})`, color: `var(${tone.fg})` }}
            >
              {SESSION_STATUS_LABEL[session.status]}
            </span>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-ink">
              <Clock className="h-4 w-4 shrink-0 text-muted" />
              {formatThaiDate(session.dateISO)} · {session.timeLabel || session.time}
            </div>
            {session.program && (
              <div className="flex items-center gap-2 text-ink">
                <Stethoscope className="h-4 w-4 shrink-0 text-muted" /> {session.program}
              </div>
            )}
            <div className="flex items-center gap-2 text-ink">
              <User className="h-4 w-4 shrink-0 text-muted" /> {session.employeeFull}
            </div>
            {session.address && (
              <div className="flex items-start gap-2 text-ink">
                <MapPin className="h-4 w-4 shrink-0 text-muted" /> {session.address}
              </div>
            )}
          </dl>
          {session.isSpecial && (
            <p className="flex items-center gap-1.5 rounded-md bg-surface-tint px-3 py-2 text-sm text-ink">
              <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} />
              เคสพิเศษ{session.specialAmount ? ` · เพิ่ม ${session.specialAmount.toLocaleString()} บาท` : ""}
            </p>
          )}
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill bg-surface-tint text-sm font-medium text-primary-700 hover:bg-surface-sunken"
            >
              <MapPin className="h-4 w-4" /> เปิดแผนที่
            </a>
          )}
          <SessionActions session={session} employees={employees} onDone={onClose} />
        </div>
      )}
    </Sheet>
  );
}

export function SchedulingCalendar({ sessions, employees }: { sessions: CalendarSession[]; employees: EmpOpt[] }) {
  const todayISO = React.useMemo(bangkokTodayISO, []);
  const [view, setView] = React.useState<View>("month");
  const [cursor, setCursor] = React.useState<Date>(() => isoToDate(todayISO));
  const [selected, setSelected] = React.useState<CalendarSession | null>(null);

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const s of sessions) {
      const arr = map.get(s.dateISO);
      if (arr) arr.push(s);
      else map.set(s.dateISO, [s]);
    }
    return map;
  }, [sessions]);

  // Sessions in the cursor's month → drives the stat tiles.
  const monthSessions = React.useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    return sessions.filter((s) => {
      const [sy, sm] = s.dateISO.split("-").map(Number);
      return sy === y && sm === m + 1;
    });
  }, [sessions, cursor]);

  const stats = React.useMemo(() => {
    const total = monthSessions.length;
    const special = monthSessions.filter((s) => s.isSpecial).length;
    const remaining = monthSessions.filter((s) => UPCOMING.includes(s.status)).length;
    return { total, special, remaining, passed: total - remaining };
  }, [monthSessions]);

  function shift(dir: -1 | 1) {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + dir);
    else if (view === "week") next.setDate(next.getDate() + dir * 7);
    else next.setDate(next.getDate() + dir);
    setCursor(next);
  }

  function goToday() {
    setCursor(isoToDate(todayISO));
  }

  const title =
    view === "month" ? monthTitle(cursor) : view === "day" ? dayTitle(cursor) : `สัปดาห์ของ ${dayTitle(cursor)}`;

  const tiles = [
    { label: "เคสทั้งหมด", value: stats.total, solid: "--primary" },
    { label: "เคสพิเศษ", value: stats.special, solid: "--accent" },
    { label: "ผ่านมาแล้ว", value: stats.passed, solid: "--status-completed-solid" },
    { label: "คงเหลือ", value: stats.remaining, solid: "--status-early-solid" },
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="ก่อนหน้า"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:bg-surface-tint"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="ถัดไป"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:bg-surface-tint"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg bg-surface-tint px-3 py-2.5 text-center">
              <p className="font-display text-xl font-bold tabular-nums text-navy">{t.value}</p>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-2xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(${t.solid})` }} />
                {t.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-pill bg-surface-sunken p-1">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={
                  "rounded-pill px-3 py-1.5 text-sm font-medium transition-colors " +
                  (view === v ? "bg-surface text-teal shadow-sm" : "text-muted")
                }
              >
                {v === "day" ? "วัน" : v === "week" ? "สัปดาห์" : "เดือน"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ThaiDateInput
              value={ymd(cursor)}
              onChange={(v) => v && setCursor(isoToDate(v))}
              className="h-9 text-sm"
            />
            <button
              type="button"
              onClick={goToday}
              className="h-9 rounded-pill border border-border px-3 text-sm font-medium text-ink hover:bg-surface-tint"
            >
              กลับวันนี้
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-3">
        {view === "month" && <MonthGrid cursor={cursor} byDay={byDay} todayISO={todayISO} onSelect={setSelected} />}
        {view === "week" && <Agenda days={weekDays(cursor)} byDay={byDay} todayISO={todayISO} onSelect={setSelected} />}
        {view === "day" && <Agenda days={[cursor]} byDay={byDay} todayISO={todayISO} onSelect={setSelected} />}
      </Card>

      <Legend />
      <VisitDetailSheet session={selected} employees={employees} onClose={() => setSelected(null)} />
    </div>
  );
}

function weekDays(cursor: Date): Date[] {
  const monIdx = (cursor.getDay() + 6) % 7;
  const monday = new Date(cursor);
  monday.setDate(cursor.getDate() - monIdx);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function MonthGrid({
  cursor,
  byDay,
  todayISO,
  onSelect,
}: {
  cursor: Date;
  byDay: Map<string, CalendarSession[]>;
  todayISO: string;
  onSelect: (s: CalendarSession) => void;
}) {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(y, m, i + 1, 12)),
  ];

  return (
    <>
      <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} className="min-h-24" />;
          const iso = ymd(date);
          const chips = byDay.get(iso) ?? [];
          const isToday = iso === todayISO;
          return (
            <div
              key={iso}
              className={
                "min-h-24 rounded-md border p-1.5 " +
                (isToday ? "border-teal bg-[var(--status-completed-bg)] ring-1 ring-teal" : "border-border bg-surface")
              }
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={"text-xs font-semibold tabular-nums " + (isToday ? "text-teal" : "text-ink")}>
                  {pad(date.getDate())}
                </span>
                {chips.length > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-surface-sunken px-1 text-2xs font-semibold tabular-nums text-muted">
                    {chips.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {chips.slice(0, 3).map((s) => (
                  <SessionChip key={s.id} s={s} onSelect={onSelect} />
                ))}
                {chips.length > 3 && (
                  <p className="px-1 text-2xs text-faint">+{chips.length - 3} เพิ่มเติม</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Agenda({
  days,
  byDay,
  todayISO,
  onSelect,
}: {
  days: Date[];
  byDay: Map<string, CalendarSession[]>;
  todayISO: string;
  onSelect: (s: CalendarSession) => void;
}) {
  return (
    <div className="space-y-3">
      {days.map((date) => {
        const iso = ymd(date);
        const chips = byDay.get(iso) ?? [];
        const isToday = iso === todayISO;
        return (
          <div key={iso} className="rounded-md border border-border">
            <div
              className={
                "flex items-center justify-between border-b border-border px-3 py-2 text-sm font-semibold " +
                (isToday ? "bg-[var(--status-completed-bg)] text-teal" : "bg-surface-tint text-navy")
              }
            >
              <span>{dayTitle(date)}</span>
              <span className="text-2xs font-medium text-muted">{chips.length} เคส</span>
            </div>
            <div className="space-y-1 p-2">
              {chips.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted">ไม่มีคิว</p>
              ) : (
                chips.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted">{s.time}</span>
                    <div className="flex-1">
                      <SessionChip s={s} onSelect={onSelect} />
                    </div>
                    <span className="hidden shrink-0 text-2xs text-faint sm:block">{s.employee}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  // One entry per distinct tone, labelled — the "คำอธิบายสถานะเคส".
  const entries: { status: SessionStatus; note?: string }[] = [
    { status: "scheduled" },
    { status: "in_progress" },
    { status: "late" },
    { status: "completed" },
    { status: "no_checkin" },
    { status: "skipped" },
    { status: "cancelled" },
  ];
  return (
    <Card className="space-y-2">
      <p className="text-sm font-semibold text-navy">คำอธิบายสถานะเคส</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {entries.map(({ status }) => {
          const tone = STATUS_TONE[status];
          return (
            <span key={status} className="flex items-center gap-1.5 text-xs text-ink">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(${tone.solid})` }} />
              {SESSION_STATUS_LABEL[status]}
            </span>
          );
        })}
        <span className="flex items-center gap-1.5 text-xs text-ink">
          <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          เคสพิเศษ (เพิ่มเงิน)
        </span>
      </div>
    </Card>
  );
}
