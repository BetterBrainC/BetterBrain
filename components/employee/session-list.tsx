import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SESSION_STATUS_LABEL } from "@/lib/i18n/th";
import type { SessionRow } from "@/lib/data/queries";

type Tone =
  | "completed" | "late" | "skipped" | "nocheckin" | "info" | "neutral";

const TONE: Record<string, Tone> = {
  completed: "completed",
  attended: "completed",
  in_progress: "info",
  late: "late",
  no_checkin: "nocheckin",
  skipped: "skipped",
  scheduled: "neutral",
  rescheduled: "info",
  cancelled: "skipped",
  corrected: "info",
};

/** List of session cards linking to the session detail / check-in. */
export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted">ไม่มีนัดหมายในวันนี้</p>;
  }
  return (
    <ul className="space-y-3">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link href={`/app/session/${s.id}`} className="block">
            <Card className="flex items-center justify-between gap-3 transition-shadow hover:shadow-md">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">{s.patientName}</p>
                <p className="truncate text-xs text-muted">
                  {s.timeLabel}{s.program ? ` · ${s.program}` : ""}
                </p>
              </div>
              <Badge tone={TONE[s.status] ?? "neutral"}>
                {SESSION_STATUS_LABEL[s.status]}
              </Badge>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
