"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SESSION_STATUS_LABEL } from "@/lib/i18n/th";
import type { LiveCategory, LiveSession } from "@/lib/schedule/live-status";
import type { SessionRow } from "@/lib/data/queries";

type BadgeTone = "late" | "nocheckin" | "skipped" | "completed" | "info" | "neutral";

/** Live, clock-aware badge for a case (escalates upcoming → due → overdue). */
export function liveBadge(category: LiveCategory, status: SessionRow["status"]): { tone: BadgeTone; label: string } {
  switch (category) {
    case "overdue":
      return { tone: "nocheckin", label: "เลยเวลา · ยังไม่ได้เช็คอิน" };
    case "due":
      return { tone: "info", label: "ถึงเวลาเช็คอิน" };
    case "upcoming":
      return { tone: "neutral", label: "รอเช็คอิน" };
    case "in_progress":
      return { tone: "info", label: SESSION_STATUS_LABEL[status] ?? "กำลังทำ" };
    case "done":
      return { tone: "completed", label: "จบเคส" };
    case "closed":
      return {
        tone: status === "skipped" || status === "cancelled" ? "skipped" : "nocheckin",
        label: SESSION_STATUS_LABEL[status] ?? "—",
      };
  }
}

/** Shared list of today's cases with live status badges, linking to check-in. */
export function LiveSessionList({ items }: { items: LiveSession<SessionRow>[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">ไม่มีนัดหมายในวันนี้</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map(({ session, category }) => {
        const badge = liveBadge(category, session.status);
        return (
          <li key={session.id}>
            <Link href={`/app/session/${session.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 transition-shadow hover:shadow-md">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                    {session.patientName}
                    {session.kind === "assessment" && (
                      <span
                        className="rounded px-1.5 py-0.5 text-2xs font-semibold"
                        style={{ backgroundColor: "var(--info-bg)", color: "var(--info-fg)" }}
                      >
                        ประเมิน
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {session.timeLabel}
                    {session.program ? ` · ${session.program}` : ""}
                  </p>
                </div>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
