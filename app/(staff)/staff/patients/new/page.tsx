import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IntakeForm } from "@/components/forms/intake-form";
import { createPatient } from "@/actions/patients";
import { getEmployees, getTrainingPrograms } from "@/lib/data/queries";

export default async function NewPatientPage() {
  const [employees, programs] = await Promise.all([getEmployees(), getTrainingPrograms()]);
  const empOpts = employees.map((e) => ({ id: e.id, name: e.full_name, code: e.employee_code }));
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/staff/patients" className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> ผู้รับบริการทั้งหมด
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">ประวัติผู้รับบริการ</h1>
      <IntakeForm action={createPatient} mode="staff" backHref="/staff/patients" employees={empOpts} programs={programs} />
    </div>
  );
}
