import Link from "next/link";
import { Pencil } from "lucide-react";
import { NewEmployeeModal } from "@/components/staff/new-employee-modal";
import { EmployeesView } from "@/components/staff/employees-view";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEmployees, getStaffAdmins, getAccountUsage } from "@/lib/data/queries";
import { ROLE_LABEL } from "@/lib/i18n/th";
import { requireStaff } from "@/lib/auth";

export default async function EmployeesPage() {
  const me = await requireStaff();
  const isDirector = me.profile?.role === "director";
  const myRole = isDirector ? "director" : "admin";
  const [employees, admins, usage] = await Promise.all([
    getEmployees(),
    isDirector ? getStaffAdmins() : Promise.resolve([]),
    getAccountUsage(),
  ]);
  // สถานะต้องสะท้อนการใช้งานจริง (client 30 ก.ค. 2569) — ยังไม่เคยล็อกอิน ≠ ใช้งาน.
  const lastSignIn = Object.fromEntries([...usage].map(([id, u]) => [id, u.lastSignInAt]));

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">รายชื่อพนักงาน</h1>
        </div>
        <NewEmployeeModal myRole={myRole} />
      </header>

      <EmployeesView employees={employees} lastSignIn={lastSignIn} />

      {isDirector && admins.length > 0 && (
        <Card className="space-y-3">
          <CardTitle className="text-base">บัญชีผู้ดูแลระบบ</CardTitle>
          <ul className="divide-y divide-border">
            {admins.map((a) => {
              const signedIn = lastSignIn[a.id];
              const state = !a.is_enabled
                ? { label: "ปิด", tone: "nocheckin" as const }
                : signedIn
                  ? { label: "ใช้งาน", tone: "completed" as const }
                  : { label: "ยังไม่เข้าใช้", tone: "neutral" as const };
              return (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <Link href={`/staff/employees/${a.id}`} className="font-medium text-navy hover:underline">
                    {a.full_name || a.employee_code || "—"}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge tone={a.role === "director" ? "info" : "neutral"}>{ROLE_LABEL[a.role]}</Badge>
                    <Badge tone={state.tone}>{state.label}</Badge>
                    <Link
                      href={`/staff/employees/${a.id}`}
                      aria-label={`แก้ไขข้อมูล ${a.full_name}`}
                      className="rounded-md p-1.5 text-muted hover:bg-surface-tint hover:text-primary-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
