"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import type { PatientAssessmentHistory } from "@/lib/data/queries";

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" } as const;
const TICK = { fontSize: 10, fill: "#6B7280" } as const;

type Kpi = PatientAssessmentHistory["kpi"];

const METRICS: {
  key: "fois" | "barthel" | "fim";
  title: string;
  color: string;
  domain: [number, number | "auto"];
  ticks?: number[];
}[] = [
  { key: "fois", title: "FOIS", color: "var(--primary)", domain: [0, 7], ticks: [1, 2, 3, 4, 5, 6, 7] },
  { key: "barthel", title: "Barthel", color: "var(--sky)", domain: [0, 100] },
  { key: "fim", title: "FIM", color: "var(--accent)", domain: [0, "auto"] },
];

/** Per-recipient KPI trends over time (FOIS / Barthel / FIM) — line per metric. */
export function PatientAssessmentCharts({ kpi }: { kpi: Kpi }) {
  const labelOf = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${Number(d)}/${Number(m)}`;
  };
  const hasAny = METRICS.some((m) => kpi.some((k) => k[m.key] != null));
  if (!hasAny) {
    return (
      <Card>
        <CardTitle className="mb-1 text-base">แนวโน้มคะแนนประเมิน</CardTitle>
        <p className="text-sm text-muted">ยังไม่มีคะแนนการวัดผล (FOIS / Barthel / FIM) ของผู้รับบริการรายนี้</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <CardTitle className="text-base">แนวโน้มคะแนนประเมิน</CardTitle>
      <div className="grid gap-6 lg:grid-cols-3">
        {METRICS.map((m) => {
          const data = kpi
            .map((k) => ({ label: labelOf(k.dateISO), value: k[m.key] }))
            .filter((d): d is { label: string; value: number } => d.value != null);
          return (
            <div key={m.key} className="space-y-1.5">
              <p className="text-sm font-medium text-ink">{m.title} score</p>
              {data.length === 0 ? (
                <p className="text-xs text-faint">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
                      <YAxis domain={m.domain} ticks={m.ticks} allowDecimals={false} width={28} tick={TICK} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#1F2A37" }} />
                      <Line type="monotone" dataKey="value" name={m.title} stroke={m.color} strokeWidth={2} dot={{ r: 3, fill: m.color }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-faint">FOIS · Barthel · FIM แสดงตามวันที่ประเมิน</p>
    </Card>
  );
}
