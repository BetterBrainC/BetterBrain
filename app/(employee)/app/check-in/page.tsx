import { SessionList } from "@/components/employee/session-list";
import { getMyTodaySessions } from "@/lib/data/queries";

export default async function CheckInIndexPage() {
  const sessions = await getMyTodaySessions();
  const pending = sessions.filter((s) => s.status !== "completed");
  return (
    <div className="space-y-5 px-[var(--gutter-page)] pt-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">เช็คอิน</h1>
        <p className="text-sm text-muted">เลือกเคสเพื่อเช็คอินเข้างาน</p>
      </header>
      <SessionList sessions={pending} />
    </div>
  );
}
