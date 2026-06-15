import { AssignModal } from "@/components/staff/assign-modal";
import { SubstituteModal } from "@/components/staff/substitute-modal";
import { SchedulingCalendar } from "@/components/staff/scheduling-calendar";
import { getCalendarSessions, getPatients, getEmployees, getUpcomingSessions } from "@/lib/data/queries";

export default async function AssignPage() {
  const [sessions, patients, employees, upcoming] = await Promise.all([
    getCalendarSessions(),
    getPatients(),
    getEmployees(),
    getUpcomingSessions(),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">มอบหมายงาน</h1>
          <p className="text-sm text-muted">
            ปฏิทินนัดหมายรวม — เลือกผู้รับบริการ → พนักงาน → วัน/เวลา
          </p>
        </div>
        <div className="flex gap-2">
          <SubstituteModal
            employees={employees.map((e) => ({ id: e.id, name: e.full_name, code: e.employee_code }))}
            sessions={upcoming}
          />
          <AssignModal
            patients={patients.map((p) => ({ id: p.id, name: p.name }))}
            employees={employees.map((e) => ({ id: e.id, name: e.full_name, code: e.employee_code }))}
          />
        </div>
      </header>

      <SchedulingCalendar sessions={sessions} />
    </div>
  );
}
