import { requireStaff } from "@/lib/auth";
import { getTrainingPrograms } from "@/lib/data/queries";
import { ProgramsManager } from "@/components/staff/programs-manager";

export const metadata = { title: "จัดการโปรแกรมฝึก" };

export default async function ProgramsPage() {
  await requireStaff();
  const programs = await getTrainingPrograms();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">จัดการโปรแกรมฝึก</h1>
      </header>
      <ProgramsManager initial={programs} />
    </div>
  );
}
