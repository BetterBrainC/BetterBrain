import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmployeeAdminPanel } from "@/components/staff/employee-admin-panel";
import { SlotsEditor } from "@/components/staff/slots-editor";
import { getEmployeeDetail, getEmployeeWorkHours } from "@/lib/data/queries";

export default async function EmployeeDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, work] = await Promise.all([getEmployeeDetail(id), getEmployeeWorkHours(id)]);
  if (!detail) notFound();
  const { profile: e, slots } = detail;

  return (
    <div className="space-y-5">
      <Link href="/staff/employees" className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> พนักงานทั้งหมด
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-navy">{e.full_name}</h1>
        <Badge tone={e.is_enabled ? "completed" : "nocheckin"}>
          {e.is_enabled ? "ใช้งานอยู่" : "ปิดใช้งาน"}
        </Badge>
      </div>

      <EmployeeAdminPanel
        employee={{
          id: e.id,
          fullName: e.full_name,
          employeeCode: e.employee_code ?? "",
          positionTitle: e.position_title ?? "",
          licenseNo: e.license_no ?? "",
          phone: e.phone ?? "",
          employmentType: e.employment_type,
          profession: e.profession ?? "",
          isEnabled: e.is_enabled,
        }}
      />

      <SlotsEditor employeeId={e.id} initial={slots} />

      <Card>
        <CardTitle className="mb-3 text-base">ชั่วโมงทำงานเดือนนี้</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-tint px-3 py-2.5 text-center">
            <p className="font-display text-2xl font-bold tabular-nums text-navy">{work.totalHours}</p>
            <p className="mt-0.5 text-2xs text-muted">ชั่วโมงรวม</p>
          </div>
          <div className="rounded-lg bg-surface-tint px-3 py-2.5 text-center">
            <p className="font-display text-2xl font-bold tabular-nums text-navy">{work.sessionCount}</p>
            <p className="mt-0.5 text-2xs text-muted">เคสที่เช็คเอาท์</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
