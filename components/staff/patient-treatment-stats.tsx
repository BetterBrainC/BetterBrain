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
} from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import type { PatientSession } from "@/lib/data/queries";

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" } as const;
const TICK = { fontSize: 11, fill: "#6B7280" } as const;
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// Session outcomes grouped for the family/treatment summary, each with its token colour.
const OUTCOMES: { label: string; solid: string; match: (s: string) => boolean }[] = [
  { label: "ฝึกแล้ว", solid: "--status-completed-solid", match: (s) => ["completed", "attended", "corrected"].includes(s) },
  { label: "มาสาย", solid: "--status-late-solid", match: (s) => s === "late" },
  { label: "ไม่ได้เช็คอิน", solid: "--status-nocheckin-solid", match: (s) => s === "no_checkin" },
  { label: "งด", solid: "--status-skipped-solid", match: (s) => s === "skipped" || s === "cancelled" },
  { label: "นัด/อื่นๆ", solid: "--primary", match: (s) => ["scheduled", "rescheduled", "in_progress"].includes(s) },
];

/** สถิติการรักษา — treatment-outcome breakdown + monthly session volume charts. */
export function PatientTreatmentStats({ sessions }: { sessions: PatientSession[] }) {
  const outcome = React.useMemo(
    () =>
      OUTCOMES.map((o) => ({ label: o.label, solid: o.solid, value: sessions.filter((s) => o.match(s.status)).length })).filter(
        (o) => o.value > 0,
      ),
    [sessions],
  );

  const monthly = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) {
      const key = s.dateISO.slice(0, 7); // YYYY-MM
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, value]) => {
        const mo = Number(key.slice(5, 7)) - 1;
        return { label: THAI_MONTHS_SHORT[mo] ?? key, value };
      });
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <Card>
        <CardTitle className="mb-1 text-base">สถิติการรักษา</CardTitle>
        <p className="text-sm text-muted">ยังไม่มีเคสสำหรับสรุปสถิติ</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <CardTitle className="text-base">สถิติการรักษา</CardTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-ink">ผลการเข้าฝึก</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcome} layout="vertical" margin={{ top: 4, right: 28, bottom: 0, left: 8 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" width={92} tick={{ fontSize: 11, fill: "#1F2A37" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--surface-tint)" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#1F2A37" }} />
                <Bar dataKey="value" name="จำนวนเคส" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                  {outcome.map((o) => (
                    <Cell key={o.label} fill={`var(${o.solid})`} />
                  ))}
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-ink">จำนวนเคสรายเดือน</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={32} tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--surface-tint)" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#1F2A37" }} />
                <Bar dataKey="value" name="เคส" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
