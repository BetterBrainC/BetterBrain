import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PatientsTable } from "@/components/staff/patients-table";
import { PatientCharts } from "@/components/staff/patient-charts";
import { getPatients, getPatientStats, getRecipientTimeSeries } from "@/lib/data/queries";

export default async function PatientsPage() {
  const [patients, stats, series] = await Promise.all([
    getPatients(),
    getPatientStats(),
    getRecipientTimeSeries(),
  ]);
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">ผู้รับบริการ</h1>
        </div>
        <Link href="/staff/patients/new">
          <Button>+ เพิ่มผู้รับบริการ</Button>
        </Link>
      </header>
      <PatientCharts stats={stats} series={series} />
      <PatientsTable patients={patients} />
    </div>
  );
}
