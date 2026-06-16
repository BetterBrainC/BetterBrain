"use client";

import * as React from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env";
import { subscribePush, unsubscribePush, sendTestPush } from "@/actions/push";

/** base64url VAPID public key → Uint8Array for PushManager.subscribe(). */
function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Per-device Web Push opt-in. Requests Notification permission, subscribes via
 * the registered SW + VAPID public key, and persists the subscription server-side.
 */
export function PushToggle() {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [enabled, setEnabled] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const key = clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setMsg("ยังไม่ได้ตั้งค่า VAPID บนเซิร์ฟเวอร์");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("เบราว์เซอร์ไม่อนุญาตการแจ้งเตือน");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await subscribePush({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      if (res.error) setMsg(res.error);
      else {
        setEnabled(true);
        setMsg("เปิดการแจ้งเตือนแล้ว");
      }
    } catch {
      setMsg("เปิดการแจ้งเตือนไม่สำเร็จ (ต้องเป็น production build + HTTPS/localhost)");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      setMsg("ปิดการแจ้งเตือนแล้ว");
    } catch {
      setMsg("ปิดการแจ้งเตือนไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    const res = await sendTestPush();
    setMsg(res.error ? res.error : "ส่งการแจ้งเตือนทดสอบแล้ว — รอสักครู่");
    setBusy(false);
  }

  if (supported === false) {
    return <p className="text-xs text-muted">อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับ Web Push</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {enabled ? (
          <Button size="sm" variant="secondary" onClick={disable} disabled={busy}>
            <BellOff className="h-4 w-4" /> ปิดการแจ้งเตือน
          </Button>
        ) : (
          <Button size="sm" onClick={enable} disabled={busy}>
            <Bell className="h-4 w-4" /> เปิดการแจ้งเตือน
          </Button>
        )}
        {enabled && (
          <Button size="sm" variant="ghost" onClick={test} disabled={busy}>
            ส่งทดสอบ
          </Button>
        )}
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
