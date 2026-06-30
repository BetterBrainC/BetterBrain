"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { decideCourseOutcome } from "@/actions/courses";

/**
 * Course progress + lifecycle (P7). At 0 remaining → "ครบคอร์ส" → Continue
 * (opens a new course) or No service (→ Summary + การวัดผล Score). The choice is
 * persisted to courses.outcome + status via decideCourseOutcome.
 */
export function CourseCard({
  used,
  total,
  bonus,
  patientId,
  courseId,
}: {
  used: number;
  total: number;
  bonus: number;
  patientId: string;
  courseId: string;
}) {
  const router = useRouter();
  const base = total - bonus;
  const remaining = Math.max(total - used, 0);
  const pct = Math.min(100, Math.round((used / total) * 100));
  const complete = remaining === 0;
  const nearEnd = !complete && used >= base - 1; // session-9 style alert
  const courseType = base >= 30 ? "pkg_30" : "pkg_10_plus_1";
  const [decision, setDecision] = React.useState<null | "continue" | "no_service">(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function decide(d: "continue" | "no_service") {
    setBusy(true);
    setErr(null);
    const res = await decideCourseOutcome({ patientId, courseId, decision: d, courseType });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setDecision(d);
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">คอร์สการฟื้นฟู</CardTitle>
        {complete ? (
          <Badge tone="late">ครบคอร์ส</Badge>
        ) : nearEnd ? (
          <Badge tone="late">ใกล้ครบคอร์ส</Badge>
        ) : (
          <Badge tone="completed">กำลังดำเนินการ</Badge>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted">
            ใช้ไป {used}/{total} ครั้ง{bonus ? ` (รวมแถม ${bonus})` : ""}
          </span>
          <span className="font-semibold text-navy tabular-nums">เหลือ {remaining}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {complete && !decision && (
        <div className="space-y-2 rounded-md bg-surface-tint p-3">
          <p className="text-sm font-medium text-navy">ครบคอร์สแล้ว — ดำเนินการต่ออย่างไร?</p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={busy} onClick={() => decide("continue")}>
              ต่อคอร์ส (Continue)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={() => decide("no_service")}
            >
              ไม่ต่อ (No service)
            </Button>
          </div>
          {err && <p className="text-sm text-[var(--danger-fg)]">{err}</p>}
        </div>
      )}

      {decision === "no_service" && (
        <p className="rounded-md bg-[var(--surface-sunken)] px-3 py-2 text-sm text-muted">
          ตั้งสถานะ No service แล้ว — ทำ Summary report + ประเมิน Score (การวัดผล)
        </p>
      )}
    </Card>
  );
}
