"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { DataTable, Td } from "@/components/ui/table";
import { PATIENT_STATUS_LABEL } from "@/lib/i18n/th";
import type { PatientRow } from "@/lib/data/queries";

/**
 * Dashboard recipient register (client island). Client asks: always newest
 * first (server pre-sorts), view by วัน/สัปดาห์/เดือน/ปี with the year picked
 * from years that actually have data, plus a ชื่อ/Patient ID search box.
 */

type Range = "day" | "week" | "month" | "year";

const RANGE_LABEL: Record<Range, string> = {
  day: "วัน",
  week: "สัปดาห์",
  month: "เดือน",
  year: "ปี",
};

/** Bangkok-local YYYY-MM-DD for an ISO timestamp (presentation-only). */
function bkkDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + n));
  return dt.toISOString().slice(0, 10);
}

export function DashboardPatientsTable({ patients }: { patients: PatientRow[] }) {
  const [range, setRange] = React.useState<Range>("year");
  const today = bkkDate(new Date().toISOString());
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = React.useState(thisYear);
  const [q, setQ] = React.useState("");

  // Years offered = years that actually contain data (+ always this year).
  const years = React.useMemo(() => {
    const set = new Set<number>([thisYear]);
    for (const p of patients) if (p.createdAt) set.add(Number(bkkDate(p.createdAt).slice(0, 4)));
    return Array.from(set).sort((a, b) => b - a);
  }, [patients, thisYear]);

  // Current week = Monday..Sunday containing today (Bangkok).
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun
  const weekStart = addDays(today, dow === 0 ? -6 : 1 - dow);
  const weekEnd = addDays(weekStart, 6);

  const needle = q.trim().toLowerCase();
  const filtered = patients.filter((p) => {
    if (needle) {
      const hit =
        p.name.toLowerCase().includes(needle) || (p.hn ?? "").toLowerCase().includes(needle);
      if (!hit) return false;
    }
    if (!p.createdAt) return range === "year" && year === thisYear;
    const d = bkkDate(p.createdAt);
    if (range === "day") return d === today;
    if (range === "week") return d >= weekStart && d <= weekEnd;
    if (range === "month") return d.slice(0, 7) === today.slice(0, 7);
    return Number(d.slice(0, 4)) === year;
  });
  const totalVisits = filtered.reduce((sum, p) => sum + (p.visits ?? 0), 0);

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">
          ผู้รับบริการ{RANGE_LABEL[range]}
          {range === "year" ? ` ${year + 543}` : ""}
          <span className="ml-2 text-sm font-normal text-muted">
            จำนวน {filtered.length} เคส · {totalVisits} visit
          </span>
        </CardTitle>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-pill border border-border bg-surface p-0.5" role="tablist" aria-label="ช่วงเวลา">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={
                range === r
                  ? "rounded-pill bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg"
                  : "rounded-pill px-3 py-1.5 text-sm text-muted hover:bg-surface-tint"
              }
            >
              ราย{RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        {range === "year" && (
          <select
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            aria-label="เลือกปี พ.ศ."
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink focus:border-primary"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </select>
        )}
        <label className="relative ml-auto min-w-0 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา ชื่อ / Patient ID"
            aria-label="ค้นหา ชื่อ หรือ Patient ID"
            className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">ไม่พบผู้รับบริการในช่วงที่เลือก</p>
      ) : (
        <DataTable headers={["Patient ID", "ผู้รับบริการ", "โปรแกรม", "คอร์ส", "สถานะ"]}>
          {filtered.map((p) => (
            <tr key={p.id} className="hover:bg-surface-tint">
              <Td className="tabular-nums text-muted">{p.hn ?? "—"}</Td>
              <Td className="font-medium text-navy">
                <Link href={`/staff/patients/${p.id}`} className="text-primary-700 hover:underline">{p.name}</Link>
              </Td>
              <Td>{p.program ?? "—"}</Td>
              <Td className="tabular-nums text-primary-700">{p.courseUsed}/{p.courseTotal}</Td>
              <Td className="text-muted">{PATIENT_STATUS_LABEL[p.status]}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}
