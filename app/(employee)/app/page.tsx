import { TodayBoard } from "@/components/employee/today-board";
import { getMyTodaySessions, getCheckinSettings } from "@/lib/data/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatThaiDate } from "@/lib/date/buddhist";

export default async function EmployeeHome() {
  const [sessions, u, checkinCfg] = await Promise.all([
    getMyTodaySessions(),
    getCurrentUser(),
    getCheckinSettings(),
  ]);
  const doneCount = sessions.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-6 px-[var(--gutter-page)] pt-6">
      <header className="space-y-1">
        <p className="text-sm text-muted">
          {formatThaiDate(new Date(), { weekday: "long" })}
        </p>
        <h1 className="font-display text-2xl font-bold text-navy">
          สวัสดี {u?.profile?.full_name ?? ""} 👋
        </h1>
        <p className="text-sm text-muted">
          วันนี้มี {sessions.length} เคส · เข้าฝึกแล้ว {doneCount}
        </p>
      </header>

      <TodayBoard
        sessions={sessions}
        lateThresholdMin={checkinCfg.lateThresholdMin}
        serverNowMs={Date.now()}
      />
    </div>
  );
}
