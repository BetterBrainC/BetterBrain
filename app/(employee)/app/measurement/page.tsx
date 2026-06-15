import { MeasurementForm } from "@/components/employee/measurement-form";
import { getMyAssignedPatients, getEmployeeKpiQuestions } from "@/lib/data/queries";

export default async function MeasurementPage() {
  const beYear = new Date().getFullYear() + 543; // current Buddhist-era year
  const [patients, knowledge, stress] = await Promise.all([
    getMyAssignedPatients(),
    getEmployeeKpiQuestions("knowledge", beYear),
    getEmployeeKpiQuestions("stress", beYear),
  ]);

  return (
    <MeasurementForm
      patients={patients}
      knowledge={knowledge}
      stress={stress}
      year={beYear}
    />
  );
}
