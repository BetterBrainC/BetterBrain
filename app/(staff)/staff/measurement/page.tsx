import { requireDirector } from "@/lib/auth";
import { getKpiTemplates } from "@/lib/data/queries";
import { MeasurementEditor } from "@/components/staff/measurement-editor";

// การวัดผล/KPI is Director-only (client v3). Page-guarded in addition to the
// nav hiding the link from Admin.
export default async function StaffMeasurementPage() {
  await requireDirector();
  const templates = await getKpiTemplates();
  return <MeasurementEditor templates={templates} />;
}
