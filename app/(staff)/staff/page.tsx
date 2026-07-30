import { Card, CardTitle } from "@/components/ui/card";
import { DashboardTrend } from "@/components/staff/dashboard-charts";
import { DashboardPatientsTable } from "@/components/staff/dashboard-patients-table";
import { LiveMonitor } from "@/components/staff/live-monitor";
import { ThaiDate } from "@/components/ui/thai-date";
import { getDashboard } from "@/lib/data/queries";

export default async function StaffDashboard() {
  const d = await getDashboard();

  const tiles = [
    { label: "เคสทั้งหมดวันนี้", value: String(d.totalToday) },
    { label: "เช็คอินแล้ว", value: String(d.checkedIn) },
    { label: "กำลังทำ", value: String(d.inProgress) },
    { label: "ผู้รับบริการใหม่", value: String(d.newRecipients) },
    { label: "ยกเลิก", value: String(d.cancelledToday) },
    { label: "รออนุมัติ", value: String(d.pendingApprovals) },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
          <p className="text-sm text-muted"><ThaiDate value={new Date()} /></p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label} className="text-center">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 font-display text-stat font-bold tabular-nums text-navy">{t.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle className="mb-3 text-base">แนวโน้มเคส 14 วัน</CardTitle>
        <DashboardTrend data={d.dailySeries} />
      </Card>

      <LiveMonitor rows={d.monitor} employeeCount={d.employeeCount} />

      <DashboardPatientsTable patients={d.patients} />
    </div>
  );
}
