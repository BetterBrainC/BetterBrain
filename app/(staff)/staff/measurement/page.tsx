import { requireDirector } from "@/lib/auth";
import { getKpiTemplates, getMeasurementResults } from "@/lib/data/queries";
import { MeasurementEditor } from "@/components/staff/measurement-editor";
import { MeasurementResults } from "@/components/staff/measurement-results";
import { MeasurementCharts } from "@/components/staff/measurement-charts";

// การวัดผล/KPI is Director-only (client v3). Page-guarded in addition to the
// nav hiding the link from Admin. Shows results first, then the question-bank editor.
export default async function StaffMeasurementPage() {
  await requireDirector();
  const [templates, results] = await Promise.all([getKpiTemplates(), getMeasurementResults()]);
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="font-display text-2xl font-bold text-navy">ตัวชี้วัด</h1>
        <MeasurementCharts patient={results.patient} />
        <MeasurementResults patient={results.patient} employee={results.employee} />
      </section>
      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="font-display text-lg font-bold text-navy">คลังคำถามประเมิน</h2>
        <MeasurementEditor templates={templates} />
      </section>
    </div>
  );
}
