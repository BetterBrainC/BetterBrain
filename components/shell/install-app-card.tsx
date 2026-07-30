"use client";

import * as React from "react";
import { Download, Share, CheckCircle2, Smartphone } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PushToggle } from "@/components/shell/push-toggle";

/** Chrome's install prompt event (not in lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari keeps the legacy flag instead of display-mode
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * "ติดตั้งเป็นแอป" for the employee PWA, then the Web Push opt-in.
 *
 * Notifications are only offered AFTER install (client 30 ก.ค. 2569): asking on
 * a browser tab burns the one permission prompt the user gets, and iOS refuses
 * Web Push entirely until the app sits on the home screen.
 *
 * Chrome/Android/desktop install in-app via beforeinstallprompt. iOS Safari has
 * no programmatic install, so it gets the Share → เพิ่มไปยังหน้าจอโฮม steps.
 * Browsers that can do neither (e.g. Firefox desktop) fall through to the push
 * card so the setting never becomes unreachable.
 */
export function InstallAppCard() {
  const [installed, setInstalled] = React.useState<boolean | null>(null);
  const [prompt, setPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = React.useState(false);
  const [showIOSSteps, setShowIOSSteps] = React.useState(false);
  // beforeinstallprompt fires a beat after load; wait before deciding a browser
  // simply cannot install.
  const [graceOver, setGraceOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    setInstalled(isStandalone());
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it so our own button can replay it
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setGraceOver(true), 2500);

    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onMode = () => setInstalled(isStandalone());
    mq?.addEventListener?.("change", onMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onMode);
      clearTimeout(t);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    setBusy(true);
    setNote(null);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      else setNote("ยังไม่ได้ติดตั้ง — กดปุ่มนี้อีกครั้งได้ทุกเมื่อ");
      setPrompt(null);
    } catch {
      setNote("ติดตั้งไม่สำเร็จ ลองใช้เมนูของเบราว์เซอร์");
    } finally {
      setBusy(false);
    }
  }

  // Don't flash the wrong card before we know which state we're in.
  if (installed === null) return null;

  if (installed) {
    return (
      <Card className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" aria-hidden />
          <CardTitle className="text-base">ติดตั้งแอปแล้ว</CardTitle>
        </div>
        <p className="text-sm text-ink">เปิดการแจ้งเตือนเพื่อรับนัดหมาย เวร และผลอนุมัติบนเครื่องนี้</p>
        <PushToggle />
      </Card>
    );
  }

  const canPrompt = !!prompt;
  // No in-app install path at all → don't hide notifications behind it.
  const dead = graceOver && !canPrompt && !isIOS;

  return (
    <>
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <CardTitle className="text-base">ติดตั้งเป็นแอป</CardTitle>
        </div>
        <p className="text-sm text-ink">
          ติดตั้งไว้บนหน้าจอโฮมเพื่อเปิดใช้งานได้เร็วขึ้น ใช้งานตอนสัญญาณขาดหายได้ และรับการแจ้งเตือน
        </p>

        {canPrompt && (
          <Button onClick={install} disabled={busy} className="w-full">
            <Download className="h-4 w-4" /> {busy ? "กำลังติดตั้ง…" : "ติดตั้งแอป"}
          </Button>
        )}

        {isIOS && (
          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={() => setShowIOSSteps((v) => !v)}>
              <Share className="h-4 w-4" /> วิธีติดตั้งบน iPhone / iPad
            </Button>
            {showIOSSteps && (
              <ol className="list-decimal space-y-1 rounded-md bg-surface-tint p-3 pl-7 text-sm text-ink">
                <li>กดปุ่ม “แชร์” (ไอคอนสี่เหลี่ยมลูกศรขึ้น) ที่แถบล่างของ Safari</li>
                <li>เลื่อนหาและกด “เพิ่มไปยังหน้าจอโฮม”</li>
                <li>กด “เพิ่ม” มุมขวาบน แล้วเปิดแอปจากหน้าจอโฮม</li>
              </ol>
            )}
          </div>
        )}

        {dead && (
          <p className="text-sm text-muted">
            เบราว์เซอร์นี้ติดตั้งจากในแอปไม่ได้ — ใช้เมนูของเบราว์เซอร์ (⋮) แล้วเลือก “ติดตั้งแอป” หรือ
            “เพิ่มลงในหน้าจอหลัก”
          </p>
        )}
        {!graceOver && !canPrompt && !isIOS && <p className="text-sm text-muted">กำลังตรวจสอบ…</p>}
        {note && <p className="text-xs text-muted">{note}</p>}
      </Card>

      {dead && (
        <Card className="space-y-2">
          <CardTitle className="text-base">การแจ้งเตือน</CardTitle>
          <PushToggle />
        </Card>
      )}
    </>
  );
}
