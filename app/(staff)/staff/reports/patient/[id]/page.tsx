import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { ThaiDate } from "@/components/ui/thai-date";
import { PatientAssessmentCharts } from "@/components/staff/patient-assessment-charts";
import { getPatientAssessmentHistory } from "@/lib/data/queries";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "สถิติการประเมินผู้รับบริการ" };

// จบเคส = สีเทา (neutral) — client 30 ก.ค. 2569; green now means "กำลังใช้งาน" only.
const STATUS: Record<string, { label: string; tone: "neutral" | "info" | "nocheckin" | "late" }> = {
  completed: { label: "จบเคส", tone: "neutral" },
  draft: { label: "ร่าง", tone: "late" },
  corrected: { label: "แก้ไขแล้ว", tone: "info" },
  discarded: { label: "ยกเลิก", tone: "nocheckin" },
};

export default async function ReportPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const data = await getPatientAssessmentHistory(id);
  if (!data) notFound();

  const tiles = [
    { label: "การประเมิน (ครั้ง)", value: data.totals.evaluations },
    { label: "FOIS ล่าสุด", value: data.latest.fois ?? "—" },
    { label: "Barthel ล่าสุด", value: data.latest.barthel ?? "—" },
    { label: "FIM ล่าสุด", value: data.latest.fim ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <Link href="/staff/reports" className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> บันทึกรายงาน
      </Link>
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">{data.patientName}</h1>
        <p className="text-sm text-muted">Patient ID {data.patientHn ?? "—"} · รายงานทั้งหมด {data.totals.reports} ฉบับ</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border bg-surface px-3 py-3 text-center">
            <p className="font-display text-2xl font-bold tabular-nums text-navy">{t.value}</p>
            <p className="mt-0.5 text-2xs text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <PatientAssessmentCharts kpi={data.kpi} />

      <Card className="space-y-3">
        <CardTitle className="text-base">รายงานที่ผ่านมา ({data.reports.length})</CardTitle>
        {data.reports.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีรายงาน</p>
        ) : (
          <DataTable headers={["รายงาน", "วันที่", "สถานะ", ""]}>
            {data.reports.map((r) => {
              const st = STATUS[r.status] ?? { label: r.status, tone: "info" as const };
              return (
                <tr key={r.id} className="hover:bg-surface-tint">
                  <Td className="font-medium text-navy">{r.typeLabel}</Td>
                  <Td className="text-muted"><ThaiDate value={r.date} /></Td>
                  <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                  <Td>
                    <Link href={`/staff/reports/${r.id}`} className="text-sm font-medium text-primary-700 hover:underline">
                      ดูรายงาน
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
