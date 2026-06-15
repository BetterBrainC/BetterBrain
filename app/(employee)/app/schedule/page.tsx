import { SessionList } from "@/components/employee/session-list";
import { getMyTodaySessions } from "@/lib/data/queries";
import { formatThaiDate } from "@/lib/date/buddhist";

export default async function SchedulePage() {
  const sessions = await getMyTodaySessions();
  return (
    <div className="space-y-5 px-[var(--gutter-page)] pt-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">ปฏิทินนัดหมาย</h1>
        <p className="text-sm text-muted">{formatThaiDate(new Date())}</p>
      </header>
      <SessionList sessions={sessions} />
    </div>
  );
}
