import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/staff/export-button";
import { ExportRange } from "@/components/staff/export-range";
import { getReports } from "@/lib/data/queries";
import { ThaiDate } from "@/components/ui/thai-date";

const STATUS: Record<string, { label: string; tone: "completed" | "info" | "nocheckin" | "late" }> = {
  completed: { label: "จบเคส", tone: "completed" },
  draft: { label: "ร่าง", tone: "late" },
  corrected: { label: "แก้ไขแล้ว", tone: "info" },
  discarded: { label: "ยกเลิก", tone: "nocheckin" },
};

export default async function ReportsPage() {
  const reports = await getReports();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">รายงาน</h1>
          <p className="text-sm text-muted">
            Assessment · Follow up · Summary — เห็นเฉพาะ Admin/Director (หลัง “จบเคส”)
          </p>
        </div>
        <ExportButton
          filename="tpm-reports"
          headers={["ประเภท", "ผู้รับบริการ", "ผู้บันทึก", "วันที่", "สถานะ"]}
          rows={reports.map((r) => [r.typeLabel, r.patientName, r.authorName, r.date, r.status])}
        />
      </header>

      <ExportRange />

      {reports.length === 0 ? (
        <EmptyState title="ยังไม่มีรายงาน" description="รายงานที่ ‘จบเคส’ แล้วจะปรากฏที่นี่" />
      ) : (
        <DataTable headers={["ประเภท", "ผู้รับบริการ", "ผู้บันทึก", "วันที่", "สถานะ"]}>
          {reports.map((r) => {
            const st = STATUS[r.status] ?? { label: r.status, tone: "info" as const };
            return (
              <tr key={r.id} className="hover:bg-surface-tint">
                <Td className="font-medium text-navy">{r.typeLabel}</Td>
                <Td>{r.patientName}</Td>
                <Td className="text-muted">{r.authorName}</Td>
                <Td className="text-muted"><ThaiDate value={r.date} /></Td>
                <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
