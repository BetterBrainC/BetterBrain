import { notFound } from "next/navigation";
import { IntakeForm, type IntakeInitial } from "@/components/forms/intake-form";
import { updatePatient } from "@/actions/patients";
import { getPatientDetail, getTrainingPrograms } from "@/lib/data/queries";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "แก้ไขผู้รับบริการ" };

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const [detail, programs] = await Promise.all([getPatientDetail(id), getTrainingPrograms()]);
  if (!detail) notFound();
  const p = detail.patient;

  const initial: IntakeInitial = {
    full_name: p.full_name,
    age_years: p.age_years,
    dob: p.dob,
    national_id: p.national_id,
    nationality: p.nationality,
    race: p.race,
    marital_status: p.marital_status,
    gender: p.gender,
    phone: p.phone,
    address: p.address,
    underlying: p.underlying,
    drug_allergy: p.drug_allergy,
    past_history: p.past_history,
    surgery_history: p.surgery_history,
    chief_complaint: p.chief_complaint,
    diagnosis_category: p.diagnosis_category,
    training_program: p.training_program,
    ec_name: p.emergency_contact_name,
    ec_relation: p.emergency_contact_relation,
    ec_phone: p.emergency_contact_phone,
    home_lat: p.home_lat,
    home_lng: p.home_lng,
    map_url: p.map_url,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-navy">แก้ไขผู้รับบริการ</h1>
        <p className="text-sm text-muted">{p.full_name} · HN {p.hn ?? "—"}</p>
      </header>
      <IntakeForm
        action={updatePatient}
        mode="edit"
        patientId={id}
        hn={p.hn ?? undefined}
        initial={initial}
        backHref={`/staff/patients/${id}`}
        programs={programs}
      />
    </div>
  );
}
