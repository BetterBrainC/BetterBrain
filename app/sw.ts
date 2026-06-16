/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { type PrecacheEntry, type SerwistGlobalConfig, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Employee PWA service worker. Precaches the app shell and applies runtime
 * caching so the UI loads offline; offline check-ins/reports are queued in
 * IndexedDB (see lib/db/offline.ts) and flushed by the sync layer, not here.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ── Web Push (VAPID) ──────────────────────────────────────────────────────
// Payload shape (see lib/push/send.ts): { title, body, url?, tag? }.
self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }
  const title = payload.title || "TPM";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      tag: payload.tag,
      data: { url: payload.url || "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url || "/app";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        // Focus an existing tab and route it to the target.
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await (client as WindowClient).navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
