import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/staff/export-button";
import { getReportPatients } from "@/lib/data/queries";
import { ThaiDate } from "@/components/ui/thai-date";

const STATUS: Record<string, { label: string; tone: "completed" | "info" | "nocheckin" | "late" }> = {
  completed: { label: "จบเคส", tone: "completed" },
  draft: { label: "ร่าง", tone: "late" },
  corrected: { label: "แก้ไขแล้ว", tone: "info" },
  discarded: { label: "ยกเลิก", tone: "nocheckin" },
};

export default async function ReportsPage() {
  const patients = await getReportPatients();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">บันทึกรายงาน</h1>
          <p className="text-sm text-muted">
            รายชื่อผู้รับบริการ — คลิกเพื่อดูสถิติการประเมินที่ผ่านมาทั้งหมด
          </p>
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
        <DataTable headers={["Patient ID", "ชื่อ-สกุล", "จำนวนรายงาน", "ประเมิน", "ล่าสุด", "สถานะ"]}>
          {patients.map((p) => {
            const st = STATUS[p.lastStatus] ?? { label: p.lastStatus, tone: "info" as const };
            return (
              <tr key={p.patientId} className="hover:bg-surface-tint">
                <Td className="tabular-nums text-muted">{p.patientHn ?? "—"}</Td>
                <Td className="font-medium text-navy">
                  <Link href={`/staff/reports/patient/${p.patientId}`} className="text-primary-700 hover:underline">{p.patientName}</Link>
                </Td>
                <Td className="tabular-nums">{p.reportCount}</Td>
                <Td className="tabular-nums text-muted">{p.assessmentCount}</Td>
                <Td className="text-muted"><ThaiDate value={p.lastDate} /></Td>
                <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
