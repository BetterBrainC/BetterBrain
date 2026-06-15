import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { NewEmployeeModal } from "@/components/staff/new-employee-modal";
import { getEmployees } from "@/lib/data/queries";

export default async function EmployeesPage() {
  const employees = await getEmployees();
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">รายชื่อพนักงาน</h1>
          <p className="text-sm text-muted">นักกายภาพ/นักกิจกรรมบำบัด {employees.length} คน</p>
        </div>
        <NewEmployeeModal />
      </header>

      <DataTable headers={["ชื่อ-สกุล", "รหัส", "ตำแหน่ง", "ใบอนุญาตเลขที่", "ประเภท", "สถานะ"]}>
        {employees.map((e) => (
          <tr key={e.id} className="hover:bg-surface-tint">
            <Td>
              <Link href={`/staff/employees/${e.id}`} className="font-medium text-navy">
                {e.full_name}
              </Link>
            </Td>
            <Td className="tabular-nums text-muted">{e.employee_code ?? "—"}</Td>
            <Td>{e.position_title ?? "—"}</Td>
            <Td className="text-muted">{e.license_no ?? "—"}</Td>
            <Td>{e.employment_type === "monthly" ? "รายเดือน" : "พาร์ทไทม์"}</Td>
            <Td>
              <Badge tone={e.is_enabled ? "completed" : "nocheckin"}>
                {e.is_enabled ? "ใช้งาน" : "ปิด"}
              </Badge>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
