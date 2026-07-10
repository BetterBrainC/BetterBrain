import { requireStaff } from "@/lib/auth";
import { getRelativeManage } from "@/lib/data/queries";
import { RelativeAccessManager } from "@/components/staff/relative-access-manager";
import { ExerciseGuideManager } from "@/components/staff/exercise-guide-manager";

export const metadata = { title: "จัดการหน้าญาติ" };

export default async function RelativesManagePage() {
  await requireStaff();
  const data = await getRelativeManage();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">จัดการหน้าญาติ</h1>
        <p className="text-sm text-muted">ลิงก์ญาติ · รายงานที่ให้ญาติเห็น · โปรแกรมฝึกที่บ้าน</p>
      </header>

      <RelativeAccessManager patients={data.patients} programs={data.programs.map((p) => p.program)} />

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold text-navy">โปรแกรมฝึกที่บ้าน</h2>
          <p className="text-sm text-muted">ญาติจะเห็นคำแนะนำตามโปรแกรมการฝึกของผู้รับบริการรายนั้น หรือโปรแกรมที่เลือกส่งไว้ด้านบน</p>
        </div>
        <ExerciseGuideManager programs={data.programs} />
      </section>
    </div>
  );
}
