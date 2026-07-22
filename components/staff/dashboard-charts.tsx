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

/** 14-day session trend (total vs done), as grouped bars per client request. */
export function DashboardTrend({
  data,
}: {
  data: { label: string; total: number; done: number }[];
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* left margin 0 (was -22, which clipped the Y-axis tick numbers). */}
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "var(--surface-tint)" }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
            labelStyle={{ color: "#1F2A37" }}
          />
          <Bar dataKey="total" name="ทั้งหมด" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="done" name="เข้าฝึกแล้ว" fill="var(--teal)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
