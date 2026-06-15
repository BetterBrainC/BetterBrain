"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/** 14-day session trend (total vs done). Client island; recharts is ~heavy. */
export function DashboardTrend({
  data,
}: {
  data: { label: string; total: number; done: number }[];
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--teal)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
            labelStyle={{ color: "#1F2A37" }}
          />
          <Area type="monotone" dataKey="total" name="ทั้งหมด" stroke="var(--primary)" fill="url(#gTotal)" strokeWidth={2} />
          <Area type="monotone" dataKey="done" name="เข้าฝึกแล้ว" stroke="var(--teal)" fill="url(#gDone)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
