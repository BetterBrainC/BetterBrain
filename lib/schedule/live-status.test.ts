import { describe, expect, test } from "vitest";
import { classifySession, summarizeDay, type LiveSessionInput } from "./live-status";

// Fixed reference instant: 2026-06-17 13:42 Asia/Bangkok = 06:42 UTC.
const NOW = Date.parse("2026-06-17T06:42:00Z");
const THRESHOLD = 15; // minutes

// Helper: an ISO start N minutes from NOW (negative = in the past).
function startFromNow(min: number): string {
  return new Date(NOW + min * 60_000).toISOString();
}

describe("classifySession", () => {
  test("scheduled, start far in the future → upcoming", () => {
    expect(classifySession({ status: "scheduled", scheduledStartISO: startFromNow(120) }, NOW, THRESHOLD)).toBe("upcoming");
  });

  test("scheduled, started but inside the grace window → due", () => {
    expect(classifySession({ status: "scheduled", scheduledStartISO: startFromNow(-5) }, NOW, THRESHOLD)).toBe("due");
  });

  test("scheduled, started exactly now → due", () => {
    expect(classifySession({ status: "scheduled", scheduledStartISO: startFromNow(0) }, NOW, THRESHOLD)).toBe("due");
  });

  test("scheduled, past the late threshold → overdue (the 10:30-at-13:42 case)", () => {
    expect(classifySession({ status: "scheduled", scheduledStartISO: startFromNow(-192) }, NOW, THRESHOLD)).toBe("overdue");
  });

  test("threshold boundary: exactly start + threshold → due (still on time, mirrors check-in panel `>`)", () => {
    expect(classifySession({ status: "scheduled", scheduledStartISO: startFromNow(-THRESHOLD) }, NOW, THRESHOLD)).toBe("due");
  });

  test("one minute past the threshold → overdue", () => {
    expect(classifySession({ status: "scheduled", scheduledStartISO: startFromNow(-(THRESHOLD + 1)) }, NOW, THRESHOLD)).toBe("overdue");
  });

  test("rescheduled is treated like scheduled (awaiting check-in)", () => {
    expect(classifySession({ status: "rescheduled", scheduledStartISO: startFromNow(-60) }, NOW, THRESHOLD)).toBe("overdue");
  });

  test("checked-in statuses are never overdue", () => {
    for (const status of ["in_progress", "late", "attended", "corrected"]) {
      expect(classifySession({ status, scheduledStartISO: startFromNow(-300) }, NOW, THRESHOLD)).toBe("in_progress");
    }
  });

  test("completed → done; terminal statuses → closed", () => {
    expect(classifySession({ status: "completed", scheduledStartISO: startFromNow(-300) }, NOW, THRESHOLD)).toBe("done");
    for (const status of ["no_checkin", "skipped", "cancelled"]) {
      expect(classifySession({ status, scheduledStartISO: startFromNow(-300) }, NOW, THRESHOLD)).toBe("closed");
    }
  });

  test("pending with no scheduled time → upcoming, never overdue", () => {
    expect(classifySession({ status: "scheduled", scheduledStartISO: null }, NOW, THRESHOLD)).toBe("upcoming");
  });

  // Guard: every session_status enum value must land in a deliberate bucket, so
  // a future enum addition is caught here instead of silently treated as pending.
  test("every session_status enum value maps to the intended category", () => {
    const past = startFromNow(-300);
    const cases: Record<string, string> = {
      scheduled: "overdue", // pending + long past → overdue
      rescheduled: "overdue", // pending + long past → overdue
      in_progress: "in_progress",
      late: "in_progress",
      attended: "in_progress",
      corrected: "in_progress",
      completed: "done",
      no_checkin: "closed",
      skipped: "closed",
      cancelled: "closed",
    };
    for (const [status, expected] of Object.entries(cases)) {
      expect(classifySession({ status, scheduledStartISO: past }, NOW, THRESHOLD)).toBe(expected);
    }
  });
});

describe("summarizeDay", () => {
  test("empty day → no focus, zero counts", () => {
    const s = summarizeDay([], NOW, THRESHOLD);
    expect(s.focus).toBeNull();
    expect(s.pendingCount).toBe(0);
    expect(s.overdueCount).toBe(0);
    expect(s.doneCount).toBe(0);
  });

  test("focus prefers the earliest OVERDUE over later upcoming cases", () => {
    const sessions: LiveSessionInput[] = [
      { status: "completed", scheduledStartISO: startFromNow(-300) }, // done
      { status: "scheduled", scheduledStartISO: startFromNow(180) }, // upcoming (later)
      { status: "scheduled", scheduledStartISO: startFromNow(-192) }, // overdue (10:30)
      { status: "scheduled", scheduledStartISO: startFromNow(-60) }, // overdue (later)
    ];
    const s = summarizeDay(sessions, NOW, THRESHOLD);
    expect(s.focus?.category).toBe("overdue");
    expect(s.focus?.session.scheduledStartISO).toBe(startFromNow(-192)); // earliest overdue
    expect(s.overdueCount).toBe(2);
    expect(s.pendingCount).toBe(3);
    expect(s.doneCount).toBe(1);
  });

  test("with no overdue, focus falls to due, then upcoming", () => {
    const due = summarizeDay(
      [
        { status: "scheduled", scheduledStartISO: startFromNow(60) },
        { status: "scheduled", scheduledStartISO: startFromNow(-3) },
      ],
      NOW,
      THRESHOLD,
    );
    expect(due.focus?.category).toBe("due");

    const upcoming = summarizeDay(
      [
        { status: "scheduled", scheduledStartISO: startFromNow(90) },
        { status: "scheduled", scheduledStartISO: startFromNow(30) },
      ],
      NOW,
      THRESHOLD,
    );
    expect(upcoming.focus?.category).toBe("upcoming");
    expect(upcoming.focus?.session.scheduledStartISO).toBe(startFromNow(30)); // earliest upcoming
  });

  test("all checked-in / done → no focus, no pending", () => {
    const s = summarizeDay(
      [
        { status: "in_progress", scheduledStartISO: startFromNow(-60) },
        { status: "completed", scheduledStartISO: startFromNow(-200) },
      ],
      NOW,
      THRESHOLD,
    );
    expect(s.focus).toBeNull();
    expect(s.pendingCount).toBe(0);
    expect(s.doneCount).toBe(1);
  });
});
