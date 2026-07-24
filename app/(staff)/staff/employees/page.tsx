import { NewEmployeeModal } from "@/components/staff/new-employee-modal";
import { EmployeesView } from "@/components/staff/employees-view";
import { getEmployees } from "@/lib/data/queries";
import { requireStaff } from "@/lib/auth";

export default async function EmployeesPage() {
  const [employees, me] = await Promise.all([getEmployees(), requireStaff()]);
  const myRole = me.profile?.role === "director" ? "director" : "admin";
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">รายชื่อพนักงาน</h1>
          <p className="text-sm text-muted">นักกายภาพ/นักกิจกรรมบำบัด {employees.length} คน</p>
        </div>
        <NewEmployeeModal myRole={myRole} />
      </header>

      <EmployeesView employees={employees} />
    </div>
  );
}
