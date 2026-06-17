import { MeasurementForm } from "@/components/employee/measurement-form";
import { getEmployeeKpiQuestions } from "@/lib/data/queries";

// Employee self-assessment only. Patient KPI (FOIS/Barthel/Function/FIM/MFS) is
// recorded inside the case (session page) — it must be done before closing.
export default async function MeasurementPage() {
  const beYear = new Date().getFullYear() + 543;
  const [knowledge, stress] = await Promise.all([
    getEmployeeKpiQuestions("knowledge", beYear),
    getEmployeeKpiQuestions("stress", beYear),
  ]);

  return <MeasurementForm knowledge={knowledge} stress={stress} year={beYear} />;
}
