import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionList } from "@/components/employee/session-list";
import { getMyTodaySessions } from "@/lib/data/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatThaiDate } from "@/lib/date/buddhist";

export default async function EmployeeHome() {
  const [sessions, u] = await Promise.all([
    getMyTodaySessions(),
    getCurrentUser(),
  ]);
  const next = sessions.find((s) => s.status !== "completed");
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

      {next && (
        <Card tinted className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">
              เคสถัดไป · {next.timeLabel.split("–")[0]}
            </CardTitle>
            <p className="truncate text-sm text-muted">{next.patientName}</p>
          </div>
          <Link href={`/app/session/${next.id}`}>
            <Button size="md">เช็คอิน</Button>
          </Link>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted">ตารางวันนี้</h2>
        <SessionList sessions={sessions} />
      </section>
    </div>
  );
}
