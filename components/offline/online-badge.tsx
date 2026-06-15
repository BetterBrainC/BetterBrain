"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";

/**
 * Network status badge for the employee PWA. Shows a slim offline banner when
 * the device loses connectivity so field staff know writes won't reach the
 * server yet. (A full offline-queue/sync indicator is future work — no Dexie
 * write-queue exists in this build.)
 */
export function OnlineBadge() {
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-1.5 bg-[var(--status-nocheckin-bg)] px-3 py-1.5 text-2xs font-medium text-[var(--status-nocheckin-fg)]"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      ออฟไลน์ — การบันทึกจะส่งเมื่อกลับมาออนไลน์
    </div>
  );
}
