import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth";
import { getEmployeeWorkSummary, workPeriodRange, type WorkPeriod } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

const PERIODS: { key: WorkPeriod; label: string }[] = [
  { key: "day", label: "รายวัน" },
  { key: "month", label: "รายเดือน" },
  { key: "year", label: "รายปี" },
  { key: "all", label: "ทั้งหมด" },
];

/** Staff: per-employee case summary (totals, treatment/assessment, outcomes). */
export default async function WorkSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const period: WorkPeriod = PERIODS.some((p) => p.key === sp.period)
    ? (sp.period as WorkPeriod)
    : "all";
  const rows = await getEmployeeWorkSummary(workPeriodRange(period));

  const COLS: { key: keyof (typeof rows)[number]; label: string; tone?: string }[] = [
    { key: "total", label: "ทั้งหมด" },
    { key: "treatment", label: "รักษา" },
    { key: "assessment", label: "ประเมิน" },
    { key: "passed", label: "ผ่านมาแล้ว" },
    { key: "upcoming", label: "ยังไม่ถึง" },
    { key: "absent", label: "ขาด", tone: "var(--status-nocheckin-fg)" },
    { key: "late", label: "สาย", tone: "var(--status-late-fg)" },
    { key: "rescheduled", label: "เลื่อน", tone: "var(--info-fg)" },
  ];

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">สรุปการทำงาน</h1>
          <p className="text-sm text-muted">เคสรายพนักงาน — แยกการรักษา/ประเมิน และผลการเข้างาน</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="ช่วงเวลา">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/staff/work-summary?period=${p.key}`}
              aria-current={period === p.key ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                period === p.key
                  ? "bg-primary text-white"
                  : "bg-surface-tint text-ink hover:bg-surface-sunken",
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </header>

      <Card className="space-y-3">
        <CardTitle className="text-base">พนักงาน ({rows.length})</CardTitle>
        {rows.length === 0 ? (
          <EmptyState title="ยังไม่มีข้อมูล" description="ไม่พบเคสในช่วงเวลาที่เลือก" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-2xs text-muted">
                  <th className="py-2 pr-2 font-medium">พนักงาน</th>
                  {COLS.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-right font-medium">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employeeId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2 font-medium text-navy">{r.name}</td>
                    {COLS.map((c) => (
                      <td key={c.key} className="px-2 py-2 text-right tabular-nums" style={c.tone && Number(r[c.key]) > 0 ? { color: c.tone, fontWeight: 600 } : undefined}>
                        {r[c.key] as number}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-faint">ผ่านมาแล้ว = เข้าฝึก/จบเคส/สาย · ยังไม่ถึง = นัดไว้/เลื่อน/กำลังทำ · ขาด = ไม่ได้เช็คอิน</p>
      </Card>
    </div>
  );
}
