import { Card, CardTitle } from "@/components/ui/card";
import { DataTable, Td } from "@/components/ui/table";
import { ExportButton } from "@/components/staff/export-button";
import { DashboardTrend } from "@/components/staff/dashboard-charts";
import { LiveMonitor } from "@/components/staff/live-monitor";
import { buddhistYear } from "@/lib/date/buddhist";
import { ThaiDate } from "@/components/ui/thai-date";
import { getDashboard } from "@/lib/data/queries";
import { PATIENT_STATUS_LABEL } from "@/lib/i18n/th";

export default async function StaffDashboard() {
  const d = await getDashboard();
  const maxDx = Math.max(1, ...d.diagnosis.map((x) => x.count));
  const checkedPct = d.totalToday ? Math.round((d.checkedIn / d.totalToday) * 100) : 0;

  const tiles = [
    { label: "เคสทั้งหมดวันนี้", value: String(d.totalToday), hint: "ทุกพนักงาน" },
    { label: "เช็คอินแล้ว", value: String(d.checkedIn), hint: `${checkedPct}% ของวันนี้` },
    { label: "กำลังทำ", value: String(d.inProgress), hint: "กำลังฝึก" },
    { label: "รออนุมัติ", value: String(d.pendingApprovals), hint: "แก้เช็คอิน" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">ภาพรวมพนักงาน</h1>
          <p className="text-sm text-muted"><ThaiDate value={new Date()} /></p>
        </div>
        <ExportButton
          filename={`tpm-cases-${buddhistYear(new Date())}`}
          headers={["HN", "ผู้รับบริการ", "โปรแกรม", "ใช้ไป", "ทั้งหมด", "สถานะ"]}
          rows={d.patients.map((p) => [
            p.hn ?? "",
            p.name,
            p.program ?? "",
            p.courseUsed,
            p.courseTotal,
            PATIENT_STATUS_LABEL[p.status],
          ])}
        />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 font-display text-stat font-bold tabular-nums text-navy">{t.value}</p>
            <p className="mt-1 text-xs text-faint">{t.hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle className="mb-3 text-base">แนวโน้มเคส 14 วัน</CardTitle>
        <DashboardTrend data={d.dailySeries} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-3 text-base">การวินิจฉัยโรค (สถิติ)</CardTitle>
          <ul className="space-y-2">
            {d.diagnosis.map((x) => (
              <li key={x.label} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-ink">{x.label}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className="block h-full rounded-full" style={{ width: `${(x.count / maxDx) * 100}%`, backgroundColor: `var(${x.varName})` }} />
                </span>
                <span className="w-6 text-right tabular-nums text-muted">{x.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <LiveMonitor rows={d.monitor} employeeCount={d.employeeCount} />
      </div>

      <Card className="space-y-3">
        <CardTitle className="text-base">ตารางเคสรายปี · {buddhistYear(new Date())}</CardTitle>
        <DataTable headers={["HN", "ผู้รับบริการ", "โปรแกรม", "คอร์ส", "สถานะ"]}>
          {d.patients.map((p) => (
            <tr key={p.id} className="hover:bg-surface-tint">
              <Td className="tabular-nums text-muted">{p.hn ?? "—"}</Td>
              <Td className="font-medium text-navy">{p.name}</Td>
              <Td>{p.program ?? "—"}</Td>
              <Td className="tabular-nums text-primary-700">{p.courseUsed}/{p.courseTotal}</Td>
              <Td className="text-muted">{PATIENT_STATUS_LABEL[p.status]}</Td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
