import { AssignBoard } from "@/components/staff/assign-board";
import { getCalendarSessions, getPatients, getEmployees, getUpcomingSessions } from "@/lib/data/queries";

export default async function AssignPage() {
  const [sessions, patients, employees, upcoming] = await Promise.all([
    getCalendarSessions(),
    getPatients(),
    getEmployees(),
    getUpcomingSessions(),
  ]);

  const empOpts = employees.map((e) => ({ id: e.id, name: e.full_name, code: e.employee_code }));

  return (
    <AssignBoard
      sessions={sessions}
      patients={patients.map((p) => ({ id: p.id, name: p.name }))}
      employees={empOpts}
      upcoming={upcoming}
    />
  );
}
