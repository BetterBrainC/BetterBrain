import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ThaiDate } from "@/components/ui/thai-date";
import { MoodFace } from "@/components/ui/mood";
import type { PatientKpiResult, EmployeeKpiResult } from "@/lib/data/queries";

/** Row list for one employee-KPI kind (เช็คสุขภาพใจ / แบบทบทวนความรู้). */
function EmployeeKpiList({ rows }: { rows: EmployeeKpiResult[] }) {
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm last:border-0">
          <span className="text-ink">{r.employeeName}</span>
          <span className="flex items-center gap-2">
            {r.kind === "stress"
              ? (r.mood != null ? <MoodFace value={r.mood} /> : <span className="text-muted">—</span>)
              : (r.score != null && <span className="tabular-nums text-muted">{r.score}%</span>)}
            <span className="text-2xs text-faint">{r.year ?? ""} · <ThaiDate value={r.dateISO} /></span>
          </span>
        </li>
      ))}
    </ul>
  );
}

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
        <CardTitle className="text-base">การวัดผลผู้รับบริการ ({patient.length})</CardTitle>
        {patient.length === 0 ? (
          <EmptyState title="ยังไม่มีผลการวัดผล" description="FOIS / Barthel / Functional / FIM ที่พนักงานบันทึกจะปรากฏที่นี่" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-2xs text-muted">
                  <th className="py-1.5 pr-2 font-medium">วันที่</th>
                  <th className="py-1.5 pr-2 font-medium">ผู้รับบริการ</th>
                  <th className="py-1.5 pr-2 font-medium">FOIS score</th>
                  <th className="py-1.5 pr-2 font-medium">Barthel</th>
                  <th className="py-1.5 pr-2 font-medium">Functional</th>
                  <th className="py-1.5 font-medium">FIM</th>
                </tr>
              </thead>
              <tbody>
                {patient.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-2 text-muted"><ThaiDate value={r.dateISO} /></td>
                    <td className="py-1.5 pr-2 text-ink">{r.patientName}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{r.fois ?? "—"}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{r.barthel ?? "—"}</td>
                    <td className="py-1.5 pr-2 text-xs text-ink">{r.functionItems.length ? r.functionItems.join(", ") : "—"}</td>
                    <td className="py-1.5 tabular-nums">{r.fim ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Employee KPI split into the client's two headings (22 ก.ค. 2569):
          1. เช็คสุขภาพใจ (stress check-in)  2. แบบทบทวนความรู้ (knowledge test) */}
      {(() => {
        const stress = employee.filter((r) => r.kind === "stress");
        const knowledge = employee.filter((r) => r.kind !== "stress");
        return (
          <Card className="space-y-4">
            <CardTitle className="text-base">การวัดผลพนักงาน ({employee.length})</CardTitle>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-navy">1. เช็คสุขภาพใจ ({stress.length})</h3>
              {stress.length === 0 ? (
                <p className="text-sm text-muted">ยังไม่มีผลเช็คสุขภาพใจ</p>
              ) : (
                <EmployeeKpiList rows={stress} />
              )}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-navy">2. แบบทบทวนความรู้ ({knowledge.length})</h3>
              {knowledge.length === 0 ? (
                <p className="text-sm text-muted">ยังไม่มีผลแบบทบทวนความรู้</p>
              ) : (
                <EmployeeKpiList rows={knowledge} />
              )}
            </section>
          </Card>
        );
      })()}
    </div>
  );
}
