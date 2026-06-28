import { Card, CardTitle } from "@/components/ui/card";
import { DataTable, Td } from "@/components/ui/table";
import type { PatientStatsData } from "@/lib/data/queries";

/**
 * สถิติผู้รับบริการ — การวินิจฉัยโรค (สถิติ) + ตารางเคสรายเดือน/สรุปจำนวนเคสรายเดือน
 * (client 18/6/2569: ย้ายสถิติการวินิจฉัยมาอยู่ใต้ผู้รับบริการ).
 */
export function PatientStats({ stats }: { stats: PatientStatsData }) {
  const maxDx = Math.max(1, ...stats.diagnosis.map((x) => x.count));
  const monthsWithCases = stats.monthly.filter((m) => m.total > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle className="mb-3 text-base">การวินิจฉัยโรค (สถิติ)</CardTitle>
        <ul className="space-y-2">
          {stats.diagnosis.map((x) => (
            <li key={x.label} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 text-ink">{x.label}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full" style={{ width: `${(x.count / maxDx) * 100}%`, backgroundColor: `var(${x.varName})` }} />
              </span>
              <span className="w-6 text-right tabular-nums text-muted">{x.count}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-tint px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-ink">สถิติซื้อคอร์สซ้ำ</p>
            <p className="text-2xs text-muted">ผู้รับบริการที่ซื้อคอร์สตั้งแต่ 2 ครั้งขึ้นไป</p>
          </div>
          <p className="text-right">
            <span className="font-display text-xl font-bold tabular-nums text-navy">{stats.repeatCourse.repeatCount}</span>
            <span className="text-sm text-muted"> / {stats.repeatCourse.totalWithCourse} ราย</span>
          </p>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-base">ตารางเคสรายเดือน · {stats.buddhistYear}</CardTitle>
          <span className="text-sm text-muted">รวม <span className="font-bold tabular-nums text-navy">{stats.monthlyTotal}</span> เคส</span>
        </div>
        {monthsWithCases.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีเคสในปีนี้</p>
        ) : (
          <DataTable headers={["เดือน", "เคสทั้งหมด", "ผ่านมาแล้ว"]}>
            {stats.monthly.map((m) => (
              <tr key={m.label} className="hover:bg-surface-tint">
                <Td className="font-medium text-navy">{m.label}</Td>
                <Td className="tabular-nums">{m.total}</Td>
                <Td className="tabular-nums text-primary-700">{m.done}</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
