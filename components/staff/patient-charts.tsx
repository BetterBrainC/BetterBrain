"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import type { PatientStatsData } from "@/lib/data/queries";

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" } as const;
const TICK = { fontSize: 11, fill: "#6B7280" } as const;
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const pad = (n: number) => String(n).padStart(2, "0");

type Series = { dateISO: string; patientId: string }[];
type Granularity = "day" | "month" | "year";

/** Distinct recipients whose ISO date matches a prefix (YYYY / YYYY-MM / YYYY-MM-DD). */
function distinctByPrefix(series: Series, prefix: string): number {
  const set = new Set<string>();
  for (const r of series) if (r.dateISO.startsWith(prefix)) set.add(r.patientId);
  return set.size;
}

/** Diagnosis breakdown — horizontal bars, each in its own --dx identity colour. */
function DiagnosisChart({ diagnosis }: { diagnosis: PatientStatsData["diagnosis"] }) {
  const total = diagnosis.reduce((s, d) => s + d.count, 0);
  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <CardTitle className="text-base">การวินิจฉัยโรค (สถิติ)</CardTitle>
        <span className="text-sm text-muted">รวม <span className="font-bold tabular-nums text-navy">{total}</span> ราย</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted">ยังไม่มีข้อมูลการวินิจฉัย</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={diagnosis} layout="vertical" margin={{ top: 4, right: 28, bottom: 0, left: 8 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" width={116} tick={{ fontSize: 11, fill: "#1F2A37" }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--surface-tint)" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#1F2A37" }} />
              <Bar dataKey="count" name="จำนวน (ราย)" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                {diagnosis.map((d) => (
                  <Cell key={d.label} fill={`var(${d.varName})`} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** จำนวนผู้รับบริการ by day / month / year — default today, changeable filter. */
function RecipientTimeSeries({ series }: { series: Series }) {
  const todayISO = React.useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()),
    [],
  );
  const [gran, setGran] = React.useState<Granularity>("year");
  const [date, setDate] = React.useState(todayISO);

  const [y, m] = date.split("-").map(Number);
  const year = y || Number(todayISO.slice(0, 4));
  const month = m || 1;

  const { data, total, dayValue } = React.useMemo(() => {
    if (gran === "year") {
      const d = THAI_MONTHS_SHORT.map((label, i) => ({ label, value: distinctByPrefix(series, `${year}-${pad(i + 1)}`) }));
      return { data: d, total: distinctByPrefix(series, `${year}`), dayValue: 0 };
    }
    if (gran === "month") {
      const days = new Date(year, month, 0).getDate();
      const d = Array.from({ length: days }, (_, i) => ({ label: String(i + 1), value: distinctByPrefix(series, `${year}-${pad(month)}-${pad(i + 1)}`) }));
      return { data: d, total: distinctByPrefix(series, `${year}-${pad(month)}`), dayValue: 0 };
    }
    return { data: [], total: 0, dayValue: distinctByPrefix(series, date) };
  }, [series, gran, year, month, date]);

  const GRAN: { key: Granularity; label: string }[] = [
    { key: "day", label: "รายวัน" },
    { key: "month", label: "รายเดือน" },
    { key: "year", label: "รายปี" },
  ];

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">จำนวนผู้รับบริการ</CardTitle>
        {gran !== "day" && (
          <span className="text-sm text-muted">รวม <span className="font-bold tabular-nums text-navy">{total}</span> ราย</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-pill bg-surface-sunken p-1">
          {GRAN.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGran(g.key)}
              className={"rounded-pill px-3 py-1.5 text-sm font-medium transition-colors " + (gran === g.key ? "bg-surface text-primary-700 shadow-sm" : "text-muted")}
            >
              {g.label}
            </button>
          ))}
        </div>
        <ThaiDateInput value={date} onChange={(v) => v && setDate(v)} className="h-9 text-sm" />
      </div>

      {gran === "day" ? (
        <div className="flex h-64 flex-col items-center justify-center">
          <span className="font-display text-6xl font-bold tabular-nums text-navy">{dayValue}</span>
          <span className="mt-2 text-sm text-muted">ผู้รับบริการในวันที่เลือก</span>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval={gran === "month" ? 2 : 0} />
              <YAxis allowDecimals={false} width={32} tick={TICK} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--surface-tint)" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#1F2A37" }} />
              <Bar dataKey="value" name="ผู้รับบริการ (ราย)" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** สถิติซื้อคอร์สซ้ำ — a radial meter (repeat buyers over recipients with a course). */
function RepeatCourseMeter({ repeatCourse }: { repeatCourse: PatientStatsData["repeatCourse"] }) {
  const { repeatCount, totalWithCourse } = repeatCourse;
  const pct = totalWithCourse > 0 ? Math.round((repeatCount / totalWithCourse) * 100) : 0;
  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">สถิติซื้อคอร์สซ้ำ</CardTitle>
      <div className="relative h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value: repeatCount }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, Math.max(1, totalWithCourse)]} tick={false} axisLine={false} />
            <RadialBar dataKey="value" cornerRadius={10} fill="var(--primary)" background={{ fill: "var(--surface-sunken)" }} isAnimationActive={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold tabular-nums text-navy">{repeatCount}</span>
          <span className="text-sm text-muted">/ {totalWithCourse} ราย</span>
        </div>
      </div>
      <p className="text-center text-2xs text-muted">ผู้รับบริการที่ซื้อคอร์สตั้งแต่ 2 ครั้งขึ้นไป ({pct}%)</p>
    </Card>
  );
}

/** Redesigned patients-page statistics: three mixed-form charts. */
export function PatientCharts({
  stats,
  series,
}: {
  stats: PatientStatsData;
  series: Series;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <RecipientTimeSeries series={series} />
      </div>
      <RepeatCourseMeter repeatCourse={stats.repeatCourse} />
      <div className="lg:col-span-3">
        <DiagnosisChart diagnosis={stats.diagnosis} />
      </div>
    </div>
  );
}
