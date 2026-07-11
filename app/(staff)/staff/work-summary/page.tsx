import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth";
import {
  getEmployeeWorkSummary,
  workPeriodRange,
  type EmployeeWorkSummary,
  type WorkPeriod,
} from "@/lib/data/queries";
import { cn } from "@/lib/utils";

const PERIODS: { key: WorkPeriod; label: string }[] = [
  { key: "day", label: "รายวัน" },
  { key: "month", label: "รายเดือน" },
  { key: "year", label: "รายปี" },
  { key: "all", label: "ทั้งหมด" },
];

const num = (n: number) => n.toLocaleString("th-TH");
const hours = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

type Row = EmployeeWorkSummary & { attendanceTotal: number };

/** Staff: per-employee work overview — cases, attendance, hours, special-case pay, substitutions. */
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
  const summary = await getEmployeeWorkSummary(workPeriodRange(period));
  // รวม (การเข้างาน) = ตรงเวลา + มาสาย per employee.
  const rows: Row[] = summary.map((r) => ({ ...r, attendanceTotal: r.onTime + r.late }));

  // For the รวมทุกคน footer row of the table.
  const sum = (key: keyof Row) => rows.reduce((n, r) => n + Number(r[key]), 0);

  // Column groups for the desktop table (mobile uses per-employee cards below).
  const GROUPS: {
    label: string;
    cols: { key: keyof Row; label: string; tone?: string; format?: (n: number) => string }[];
  }[] = [
    {
      label: "เคส",
      cols: [
        { key: "assessment", label: "รับใหม่" },
        { key: "treatment", label: "การรักษา" },
        { key: "total", label: "ทั้งหมด" },
        { key: "patientCount", label: "ผู้รับบริการ" },
      ],
    },
    {
      label: "การเข้างาน",
      cols: [
        { key: "onTime", label: "ตรงเวลา", tone: "var(--status-completed-fg)" },
        { key: "late", label: "มาสาย", tone: "var(--status-late-fg)" },
        { key: "absent", label: "ไม่ได้เช็คอิน", tone: "var(--status-nocheckin-fg)" },
        { key: "skipped", label: "งด", tone: "var(--status-skipped-fg)" },
        { key: "earlyLeave", label: "ออกก่อนเวลา", tone: "var(--status-early-fg)" },
      ],
    },
    {
      label: "ชั่วโมงทำงาน",
      cols: [{ key: "workHours", label: "รวม (ชม.)", format: hours }],
    },
    {
      label: "เคสพิเศษ",
      cols: [
        { key: "specialCount", label: "ครั้ง", tone: "var(--accent-700)" },
        { key: "specialAmount", label: "รวม (บาท)", tone: "var(--accent-700)", format: (n) => (n > 0 ? num(n) : "0") },
      ],
    },
    {
      label: "เวรแทน",
      cols: [{ key: "substituted", label: "รับแทน" }],
    },
  ];
  const COLS = GROUPS.flatMap((g) => g.cols);

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">สรุปการทำงาน</h1>
          <p className="text-sm text-muted">ภาพรวมรายพนักงาน — เคส การเข้างาน ชั่วโมงทำงาน เคสพิเศษ และเวรแทน</p>
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
          <>
            {/* Mobile: one card per employee so nothing hides behind a scroll. */}
            <ul className="space-y-3 md:hidden">
              {rows.map((r) => (
                <li key={r.employeeId} className="rounded-lg border border-border p-3" style={{ background: "var(--surface-tint-2)" }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-navy">{r.name}</p>
                    <p className="shrink-0 text-sm text-muted">
                      <span className="font-display text-lg font-bold tabular-nums text-navy">{hours(r.workHours)}</span> ชม.
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    เคสทั้งหมด {num(r.total)} · รับใหม่ {num(r.assessment)} · การรักษา {num(r.treatment)} · ผู้รับบริการ {num(r.patientCount)} คน
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-2xs font-medium">
                    <span className="rounded-full px-2 py-0.5" style={{ color: "var(--status-completed-fg)", background: "var(--status-completed-bg)" }}>ตรงเวลา {num(r.onTime)}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ color: "var(--status-late-fg)", background: "var(--status-late-bg)" }}>สาย {num(r.late)}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ color: "var(--status-nocheckin-fg)", background: "var(--status-nocheckin-bg)" }}>ไม่ได้เช็คอิน {num(r.absent)}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ color: "var(--status-skipped-fg)", background: "var(--status-skipped-bg)" }}>งด {num(r.skipped)}</span>
                    {r.earlyLeave > 0 && (
                      <span className="rounded-full px-2 py-0.5" style={{ color: "var(--status-early-fg)", background: "var(--status-early-bg)" }}>ออกก่อนเวลา {num(r.earlyLeave)}</span>
                    )}
                  </div>
                  {(r.specialCount > 0 || r.substituted > 0) && (
                    <p className="mt-2 text-xs">
                      {r.specialCount > 0 && (
                        <span className="font-medium" style={{ color: "var(--accent-700)" }}>
                          เคสพิเศษ {num(r.specialCount)} ครั้ง ({baht(r.specialAmount)})
                        </span>
                      )}
                      {r.specialCount > 0 && r.substituted > 0 && <span className="text-faint"> · </span>}
                      {r.substituted > 0 && <span className="text-muted">รับเวรแทน {num(r.substituted)} ครั้ง</span>}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {/* Desktop: full grouped table + totals row. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[64rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-2xs text-muted">
                    <th rowSpan={2} className="py-2 pr-2 text-left align-bottom font-medium">พนักงาน</th>
                    {GROUPS.map((g) => (
                      <th key={g.label} colSpan={g.cols.length} className="border-l border-border px-2 py-1.5 text-center font-semibold text-ink">
                        {g.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-border text-2xs text-muted">
                    {GROUPS.flatMap((g) =>
                      g.cols.map((c, i) => (
                        <th key={c.key} className={"px-2 py-2 text-right font-medium" + (i === 0 ? " border-l border-border" : "")}>
                          {c.label}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.employeeId} className="border-b border-border">
                      <td className="py-2 pr-2 font-medium text-navy">{r.name}</td>
                      {COLS.map((c) => {
                        const v = Number(r[c.key]);
                        return (
                          <td
                            key={c.key}
                            className="px-2 py-2 text-right tabular-nums"
                            style={c.tone && v > 0 ? { color: c.tone, fontWeight: 600 } : undefined}
                          >
                            {(c.format ?? num)(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-surface-tint font-semibold text-navy">
                    <td className="rounded-l-md py-2 pr-2">รวมทุกคน</td>
                    {COLS.map((c, i) => (
                      <td key={c.key} className={"px-2 py-2 text-right tabular-nums" + (i === COLS.length - 1 ? " rounded-r-md" : "")}>
                        {(c.format ?? num)(sum(c.key))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="text-xs text-faint">
          รับใหม่ = เคสประเมินครั้งแรก · ตรงเวลา = เข้าฝึก/จบเคส (ไม่รวมสาย) · ชั่วโมงทำงาน = เวลาเช็คเอาท์ − เช็คอินจริง (Asia/Bangkok) ·
          งด/ไม่ได้เช็คอินไม่นับชั่วโมง · เคสพิเศษ = เคสที่ติ๊ก &quot;เคสพิเศษ&quot; พร้อมค่าตอบแทนเพิ่ม · รับแทน = เคสที่รับเวรแทนเพื่อนร่วมงาน
        </p>
      </Card>
    </div>
  );
}
