"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { flushAll } from "@/lib/sync/checkin-sync";
import { summarizeDay, type DaySummary, type LiveSessionInput } from "@/lib/schedule/live-status";

const REFRESH_MS = 30_000; // re-classify the day on this cadence
const REFRESH_THROTTLE_MS = 2_000; // coalesce focus + visibilitychange double-fire

/**
 * Shared "live day" engine for the employee check-in surfaces. Keeps a ticking
 * clock so cases re-classify (upcoming → due → overdue) without a reload, pulls
 * fresh server data when the tab regains focus (throttled), and flushes any
 * offline-queued check-ins on mount / reconnect so a just-handled case stops
 * showing as overdue. Time math is absolute-instant → timezone-safe.
 */
export function useLiveDay<T extends LiveSessionInput>(
  sessions: readonly T[],
  lateThresholdMin: number,
  serverNowMs: number,
): { nowMs: number; summary: DaySummary<T> } {
  const router = useRouter();
  // null until mounted → the first client render matches SSR (uses serverNowMs).
  const [clientNowMs, setClientNowMs] = React.useState<number | null>(null);
  const lastRefreshRef = React.useRef(0);
  const nowMs = clientNowMs ?? serverNowMs;

  React.useEffect(() => {
    setClientNowMs(Date.now());

    const refresh = () => {
      const t = Date.now();
      if (t - lastRefreshRef.current < REFRESH_THROTTLE_MS) return;
      lastRefreshRef.current = t;
      router.refresh();
    };
    const onFocus = () => {
      setClientNowMs(Date.now());
      refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    const onOnline = () => {
      flushAll()
        .then((r) => r.synced > 0 && router.refresh())
        .catch(() => {});
      onFocus();
    };

    // Sync any check-ins queued while offline, then reflect the fresh statuses.
    flushAll()
      .then((r) => r.synced > 0 && router.refresh())
      .catch(() => {});

    const id = setInterval(() => setClientNowMs(Date.now()), REFRESH_MS);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  const summary = React.useMemo(
    () => summarizeDay(sessions, nowMs, lateThresholdMin),
    [sessions, nowMs, lateThresholdMin],
  );

  return { nowMs, summary };
}
