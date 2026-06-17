import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FOIS_LABEL } from "@/lib/i18n/th";
import { ThaiDate } from "@/components/ui/thai-date";
import type { PatientKpiResult, EmployeeKpiResult } from "@/lib/data/queries";

const KIND_LABEL = { knowledge: "ความรู้ประจำปี", stress: "ความเครียด" } as const;

/** Director-only results view for การวัดผล (patient scales + employee KPI). */
export function MeasurementResults({
  patient,
  employee,
}: {
  patient: PatientKpiResult[];
  employee: EmployeeKpiResult[];
}) {
  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <CardTitle className="text-base">ผลการวัดผลผู้รับบริการ ({patient.length})</CardTitle>
        {patient.length === 0 ? (
          <EmptyState title="ยังไม่มีผลการวัดผล" description="FOIS / Barthel / Function / FIM / MFS ที่พนักงานบันทึกจะปรากฏที่นี่" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-2xs text-muted">
                  <th className="py-1.5 pr-2 font-medium">วันที่</th>
                  <th className="py-1.5 pr-2 font-medium">ผู้รับบริการ</th>
                  <th className="py-1.5 pr-2 font-medium">FOIS</th>
                  <th className="py-1.5 pr-2 font-medium">Barthel</th>
                  <th className="py-1.5 pr-2 font-medium">Function</th>
                  <th className="py-1.5 pr-2 font-medium">FIM</th>
                  <th className="py-1.5 font-medium">MFS</th>
                </tr>
              </thead>
              <tbody>
                {patient.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-2 text-muted"><ThaiDate value={r.dateISO} /></td>
                    <td className="py-1.5 pr-2 text-ink">{r.patientName}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{r.fois ? (FOIS_LABEL[r.fois as keyof typeof FOIS_LABEL] ?? r.fois) : "—"}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{r.barthel ?? "—"}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{r.functionTotal ? `${r.functionDone}/${r.functionTotal}` : "—"}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{r.fim ?? "—"}</td>
                    <td className="py-1.5 tabular-nums">{r.mfs ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-base">ผลประเมินพนักงาน ({employee.length})</CardTitle>
        {employee.length === 0 ? (
          <EmptyState title="ยังไม่มีผลประเมิน" description="แบบประเมินความเครียด + ทดสอบความรู้ประจำปีของพนักงานจะปรากฏที่นี่" />
        ) : (
          <ul className="space-y-1.5">
            {employee.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm last:border-0">
                <span className="text-ink">{r.employeeName}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={r.kind === "stress" ? "info" : "completed"}>{r.kind ? KIND_LABEL[r.kind] : "—"}</Badge>
                  {r.score != null && <span className="tabular-nums text-muted">{r.score}%</span>}
                  <span className="text-2xs text-faint">{r.year ?? ""} · <ThaiDate value={r.dateISO} /></span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
