import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmployeeAdminPanel } from "@/components/staff/employee-admin-panel";
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
          isEnabled: e.is_enabled,
        }}
      />

      <Card>
        <CardTitle className="mb-3 text-base">ช่วงเวลาทำงาน (slots)</CardTitle>
        <div className="flex flex-wrap gap-2">
          {slots.length === 0 && <span className="text-sm text-muted">ยังไม่กำหนด</span>}
          {slots.map((s, i) => (
            <Badge key={i} tone="info">{s.slot_start.slice(0, 5)}–{s.slot_end.slice(0, 5)}</Badge>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          ชั่วโมงทำงานคำนวณจากเช็คอิน/เช็คเอาท์ (Asia/Bangkok) — งด/ไม่ได้เช็คอินไม่นับ
        </p>
      </Card>

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
