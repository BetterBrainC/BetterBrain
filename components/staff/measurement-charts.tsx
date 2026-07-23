"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import type { PatientKpiResult } from "@/lib/data/queries";

type Metric = {
  key: string;
  title: string;
  color: string;
  domain: [number, number | "auto"];
  ticks?: number[];
  get: (r: PatientKpiResult) => number | null;
};

// FOIS axis trimmed to levels 1–7 (client Final brief #21).
const METRICS: Metric[] = [
  {
    key: "fois",
    title: "FOIS score",
    color: "var(--primary)",
    domain: [0, 7],
    ticks: [1, 2, 3, 4, 5, 6, 7],
    get: (r) => (r.fois ? Number(r.fois.replace(/\D/g, "")) || null : null),
  },
  { key: "barthel", title: "Barthel score", color: "var(--sky)", domain: [0, 100], get: (r) => r.barthel },
  { key: "fim", title: "FIM score", color: "var(--accent)", domain: [0, "auto"], get: (r) => r.fim },
];

/**
 * Director-only comparison graphs (การวัดผล): each metric compares service
 * recipients by their LATEST recorded score. Functional is omitted (it is not
 * scored — captured as flags in the table instead).
 */
export function MeasurementCharts({ patient }: { patient: PatientKpiResult[] }) {
  // Results arrive date-desc, so the first row per name is the latest.
  const latest = new Map<string, PatientKpiResult>();
  for (const r of patient) if (!latest.has(r.patientName)) latest.set(r.patientName, r);
  const rows = [...latest.values()];
  if (rows.length === 0) return null;

  return (
    <Card className="space-y-4">
      <CardTitle className="text-base">กราฟเปรียบเทียบคะแนน</CardTitle>
      <div className="grid gap-6 lg:grid-cols-3">
        {METRICS.map((m) => {
          const data = rows
            .map((r) => ({ name: r.patientName, value: m.get(r) }))
            .filter((d): d is { name: string; value: number } => d.value != null);
          return (
            <div key={m.key} className="space-y-1.5">
              <p className="text-sm font-medium text-ink">{m.title}</p>
              {data.length === 0 ? (
                <p className="text-xs text-faint">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#6B7280" }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={48}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={m.domain}
                        ticks={m.ticks}
                        allowDecimals={false}
                        width={28}
                        tick={{ fontSize: 10, fill: "#6B7280" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                        labelStyle={{ color: "#1F2A37" }}
                      />
                      <Bar dataKey="value" name={m.title} fill={m.color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-faint">เปรียบเทียบคะแนนล่าสุดของผู้รับบริการแต่ละราย · FOIS แสดงระดับ 1–7</p>
    </Card>
  );
}
