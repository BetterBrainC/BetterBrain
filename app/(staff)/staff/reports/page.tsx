import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/staff/export-button";
import { ReportPatientsTable } from "@/components/staff/report-patients-table";
import { getReportPatients } from "@/lib/data/queries";

export default async function ReportsPage() {
  const patients = await getReportPatients();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">บันทึกรายงาน</h1>
        </div>
        <ExportButton
          filename="tpm-report-patients"
          headers={["Patient ID", "ชื่อ-สกุล", "จำนวนรายงาน", "ประเมิน", "ล่าสุด", "สถานะ"]}
          rows={patients.map((p) => [p.patientHn ?? "", p.patientName, String(p.reportCount), String(p.assessmentCount), p.lastDate, p.lastStatus])}
        />
      </header>

      {patients.length === 0 ? (
        <EmptyState title="ยังไม่มีรายงาน" description="รายงานที่ ‘จบเคส’ แล้วจะปรากฏที่นี่" />
      ) : (
        <ReportPatientsTable patients={patients} />
      )}
    </div>
  );
}
