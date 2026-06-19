import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PatientsTable } from "@/components/staff/patients-table";
import { PatientStats } from "@/components/staff/patient-stats";
import { getPatients, getPatientStats } from "@/lib/data/queries";

export default async function PatientsPage() {
  const [patients, stats] = await Promise.all([getPatients(), getPatientStats()]);
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">ผู้รับบริการ</h1>
          <p className="text-sm text-muted">ทะเบียนผู้รับบริการ {patients.length} ราย</p>
        </div>
        <Link href="/staff/patients/new">
          <Button>+ เพิ่มผู้รับบริการ</Button>
        </Link>
      </header>
      <PatientStats stats={stats} />
      <PatientsTable patients={patients} />
    </div>
  );
}
