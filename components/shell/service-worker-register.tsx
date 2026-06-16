"use client";

import * as React from "react";

/**
 * Registers the Serwist-generated service worker (`/sw.js`) at origin scope so
 * the PWA shell, offline sync, and Web Push all work. The SW is only emitted in
 * production builds (next.config.ts disables it in dev), so we no-op in dev.
 * Mounted once in the root layout → covers every route group (employee + staff).
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[sw] registration failed", err);
    });
  }, []);
  return null;
}
