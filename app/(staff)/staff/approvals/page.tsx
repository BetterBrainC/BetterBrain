import { Card } from "@/components/ui/card";
import { ApprovalsClient } from "@/components/staff/approvals-client";
import { getCorrections } from "@/lib/data/queries";
import { requireStaff } from "@/lib/auth";

export default async function ApprovalsPage() {
  const [u, items] = await Promise.all([requireStaff(), getCorrections()]);
  const role = u.profile?.role;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">อนุมัติ</h1>
        <p className="text-sm text-muted">Director อนุมัติ · Admin ดำเนินการ</p>
      </header>

      <ApprovalsClient
        items={items}
        canApprove={role === "director"}
        canApply={role === "admin" || role === "director"}
      />

      <Card tinted>
        <p className="text-sm text-muted">
          ระบบลาถูกตัดออกชั่วคราว (ทำรวมในโมดูล HR ภายหลัง) · การ
          <strong className="text-navy"> จัดเวรแทน/สลับเวร </strong>
          ย้ายไปที่หน้า “มอบหมายงาน”
        </p>
      </Card>
    </div>
  );
}
