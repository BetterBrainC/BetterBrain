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
        <p className="text-sm text-muted">ลิงก์ญาติ · รายงานที่ให้ญาติเห็น · วิธีออกกำลังกายตามคอร์สการฟื้นฟู</p>
      </header>

      <RelativeAccessManager patients={data.patients} />

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold text-navy">วิธีออกกำลังกาย (ตามคอร์สการฟื้นฟู)</h2>
          <p className="text-sm text-muted">ญาติจะเห็นคำแนะนำตามคอร์สการฟื้นฟู (โปรแกรมการฝึก) ของผู้รับบริการรายนั้น</p>
        </div>
        <ExerciseGuideManager programs={data.programs} />
      </section>
    </div>
  );
}
