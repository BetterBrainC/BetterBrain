import { EmployeeCalendar } from "@/components/employee/employee-calendar";
import { getCalendarSessions } from "@/lib/data/queries";

export default async function SchedulePage() {
  // RLS scopes schedule_sessions to the employee's own cases.
  const sessions = await getCalendarSessions();
  return (
    <div className="space-y-4 px-[var(--gutter-page)] pt-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">ปฏิทินนัดหมาย</h1>
        <p className="text-sm text-muted">แตะวันที่เพื่อดูคิวฝึก เรียงตามเวลา</p>
      </header>
      <EmployeeCalendar sessions={sessions} />
    </div>
  );
}
