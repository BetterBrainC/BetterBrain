import { CheckInList } from "@/components/employee/check-in-list";
import { getMyTodaySessions, getCheckinSettings } from "@/lib/data/queries";

export default async function CheckInIndexPage() {
  const [sessions, checkinCfg] = await Promise.all([
    getMyTodaySessions(),
    getCheckinSettings(),
  ]);
  return (
    <div className="space-y-5 px-[var(--gutter-page)] pt-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">เช็คอิน</h1>
      </header>
      <CheckInList
        sessions={sessions}
        lateThresholdMin={checkinCfg.lateThresholdMin}
        serverNowMs={Date.now()}
      />
    </div>
  );
}
