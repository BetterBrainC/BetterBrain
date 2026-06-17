/**
 * Live, clock-aware classification of an employee's day.
 *
 * Pure + timezone-safe: it compares absolute instants (a UTC ISO start vs an
 * epoch-ms "now"), so the verdict is correct regardless of the device
 * timezone. Presentation (พ.ศ. / Asia/Bangkok) stays in the date helpers; this
 * module only decides *what state* each case is in right now.
 *
 * Mirrors the server/DB late rule used by the check-in panel: a case is "สาย"
 * (overdue) once `now > start + lateThreshold`.
 */

export type LiveCategory =
  | "upcoming" // awaiting check-in; start is still in the future
  | "due" // awaiting check-in; started, still inside the late grace window
  | "overdue" // awaiting check-in; past the late threshold → ได้เวลายังไม่ได้เช็คอิน
  | "in_progress" // already checked in (or checked out, not yet finalized)
  | "done" // จบเคส
  | "closed"; // งด / ไม่ได้เช็คอิน / ยกเลิก — no action possible

// session_status values that mean the employee has already checked in.
const CHECKED_IN = new Set(["in_progress", "late", "attended", "corrected"]);
// finalized
const DONE = new Set(["completed"]);
// terminal — nothing the employee can do
const CLOSED = new Set(["no_checkin", "skipped", "cancelled"]);

const MINUTE_MS = 60_000;

export interface LiveSessionInput {
  status: string;
  scheduledStartISO: string | null;
}

/** Classify ONE session against the current instant + late threshold. */
export function classifySession(
  session: LiveSessionInput,
  nowMs: number,
  lateThresholdMin: number,
): LiveCategory {
  if (DONE.has(session.status)) return "done";
  if (CLOSED.has(session.status)) return "closed";
  if (CHECKED_IN.has(session.status)) return "in_progress";

  // Otherwise the case is still awaiting a check-in (scheduled / rescheduled /
  // any unexpected status): decide upcoming vs due vs overdue by the clock.
  // The overdue boundary uses strict `>` to mirror the check-in panel's
  // isLateNow() (and the DB `late` flag) exactly — at start + threshold the
  // case is still "due", not yet "overdue".
  const start = session.scheduledStartISO ? Date.parse(session.scheduledStartISO) : NaN;
  if (Number.isNaN(start)) return "upcoming"; // no scheduled time → never "overdue"
  if (nowMs > start + Math.max(0, lateThresholdMin) * MINUTE_MS) return "overdue";
  if (nowMs >= start) return "due";
  return "upcoming";
}

export interface LiveSession<T extends LiveSessionInput> {
  session: T;
  category: LiveCategory;
  startMs: number | null;
}

export interface DaySummary<T extends LiveSessionInput> {
  items: LiveSession<T>[];
  /** Single most relevant case to act on now: earliest overdue → due → upcoming. */
  focus: LiveSession<T> | null;
  overdueCount: number;
  /** Anything still awaiting a check-in (upcoming + due + overdue). */
  pendingCount: number;
  doneCount: number;
}

// Ascending start, with un-timed (null) sessions sorted last.
function byStart<T extends LiveSessionInput>(a: LiveSession<T>, b: LiveSession<T>): number {
  if (a.startMs == null && b.startMs == null) return 0;
  if (a.startMs == null) return 1;
  if (b.startMs == null) return -1;
  return a.startMs - b.startMs;
}

const FOCUS_ORDER: LiveCategory[] = ["overdue", "due", "upcoming"];

/** Classify every session and pick the one the employee should act on now. */
export function summarizeDay<T extends LiveSessionInput>(
  sessions: readonly T[],
  nowMs: number,
  lateThresholdMin: number,
): DaySummary<T> {
  const items: LiveSession<T>[] = sessions.map((session) => ({
    session,
    category: classifySession(session, nowMs, lateThresholdMin),
    startMs: session.scheduledStartISO ? Date.parse(session.scheduledStartISO) : null,
  }));

  let focus: LiveSession<T> | null = null;
  for (const cat of FOCUS_ORDER) {
    const inCat = items.filter((i) => i.category === cat).sort(byStart);
    if (inCat.length > 0) {
      focus = inCat[0]!;
      break;
    }
  }

  const overdueCount = items.filter((i) => i.category === "overdue").length;
  const pendingCount = items.filter(
    (i) => i.category === "overdue" || i.category === "due" || i.category === "upcoming",
  ).length;
  const doneCount = items.filter((i) => i.category === "done").length;

  return { items, focus, overdueCount, pendingCount, doneCount };
}
