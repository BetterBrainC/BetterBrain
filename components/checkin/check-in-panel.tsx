"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, CheckCircle2, Loader2, LogOut, Camera, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DailyReportSheet } from "@/components/reports/daily-report-sheet";
import { haversineMeters } from "@/lib/geo/haversine";
import { getCurrentFix } from "@/lib/geo/geolocation";
import { recordCheckEvent, uploadCheckinSelfie } from "@/actions/checkin";
import { enqueueCheckEvent, flushCheckins } from "@/lib/sync/checkin-sync";

type Phase = "idle" | "locating" | "located" | "checkedin" | "done";

/**
 * Check-in signature component. Real GPS; distance vs the patient's home; the
 * geofence is enforced on BOTH client (button gate) and server (RPC). Selfie is
 * required when the clinic enables it. Works offline: events are queued in
 * IndexedDB and flushed on reconnect (idempotent via a client event id).
 * Check-out opens the Follow-up report immediately.
 */
export function CheckInPanel({
  sessionId,
  patientName,
  homeLat,
  homeLng,
  radiusM,
  initialStatus,
  scheduledStartISO,
  scheduledEndISO,
  lateThresholdMin,
  earlyThresholdMin,
  selfieEnforced,
}: {
  sessionId: string;
  patientName: string;
  homeLat: number | null;
  homeLng: number | null;
  radiusM: number;
  initialStatus: string;
  scheduledStartISO: string | null;
  scheduledEndISO: string | null;
  lateThresholdMin: number;
  earlyThresholdMin: number;
  selfieEnforced: boolean;
}) {
  const router = useRouter();
  const alreadyDone = initialStatus === "completed";
  const [phase, setPhase] = React.useState<Phase>(
    alreadyDone ? "done" : initialStatus === "in_progress" || initialStatus === "late" ? "checkedin" : "idle",
  );
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = React.useState<number | null>(null);
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selfie, setSelfie] = React.useState<File | null>(null);
  const selfieUrl = React.useMemo(() => (selfie ? URL.createObjectURL(selfie) : null), [selfie]);

  const hasHome = homeLat != null && homeLng != null;
  const inRange = distance != null && distance <= radiusM;

  // Flush any queued offline events on mount and whenever the device reconnects.
  React.useEffect(() => {
    const run = () => {
      flushCheckins()
        .then((r) => r.synced > 0 && router.refresh())
        .catch(() => {});
    };
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [router]);

  function isLateNow(): boolean {
    if (!scheduledStartISO) return false;
    const start = new Date(scheduledStartISO).getTime();
    if (Number.isNaN(start)) return false;
    return Date.now() > start + lateThresholdMin * 60_000;
  }
  function isEarlyNow(): boolean {
    if (!scheduledEndISO) return false;
    const end = new Date(scheduledEndISO).getTime();
    if (Number.isNaN(end)) return false;
    return Date.now() < end - earlyThresholdMin * 60_000;
  }

  async function locate() {
    setPhase("locating");
    setError(null);
    try {
      const fix = await getCurrentFix();
      setCoords({ lat: fix.lat, lng: fix.lng });
      setAccuracy(fix.accuracy);
      if (hasHome) {
        setDistance(haversineMeters({ lat: fix.lat, lng: fix.lng }, { lat: homeLat!, lng: homeLng! }));
      }
      setPhase("located");
    } catch (e) {
      setError(e instanceof Error ? e.message : "เข้าถึงตำแหน่งไม่ได้");
      setPhase("located");
    }
  }

  async function confirmCheckIn() {
    if (hasHome && !inRange) return setError("อยู่นอกระยะที่กำหนด — เข้าใกล้บ้านผู้รับบริการก่อน");
    if (selfieEnforced && !selfie) return setError("กรุณาถ่ายเซลฟี่ก่อนเช็คอิน");
    setBusy(true);
    setError(null);
    setInfo(null);
    const eventId = crypto.randomUUID();
    const lat = coords?.lat ?? homeLat ?? 0;
    const lng = coords?.lng ?? homeLng ?? 0;
    const common = { sessionId, lat, lng, distanceM: distance, within: hasHome ? inRange : false, isLate: isLateNow() };

    if (!navigator.onLine) {
      await enqueueCheckEvent({ clientUuid: eventId, sessionId, kind: "check_in", capturedAt: new Date().toISOString(), lat, lng, distanceMeters: distance ?? undefined, withinRadius: hasHome ? inRange : false, isLate: isLateNow(), selfieBlob: selfie ?? undefined });
      setBusy(false);
      setInfo("บันทึกออฟไลน์ไว้แล้ว จะซิงค์อัตโนมัติเมื่อกลับมาออนไลน์");
      setPhase("checkedin");
      return;
    }
    try {
      let selfiePath: string | null = null;
      if (selfie) {
        const fd = new FormData();
        fd.append("file", selfie);
        fd.append("sessionId", sessionId);
        const up = await uploadCheckinSelfie(fd);
        if (up.error) { setBusy(false); return setError(up.error); }
        selfiePath = up.path ?? null;
      }
      const res = await recordCheckEvent({ ...common, kind: "check_in", selfieUrl: selfiePath, eventId });
      setBusy(false);
      if (res.error) return setError(res.error);
      setPhase("checkedin");
      router.refresh();
    } catch {
      // Network dropped mid-request — queue it.
      await enqueueCheckEvent({ clientUuid: eventId, sessionId, kind: "check_in", capturedAt: new Date().toISOString(), lat, lng, distanceMeters: distance ?? undefined, withinRadius: hasHome ? inRange : false, isLate: isLateNow(), selfieBlob: selfie ?? undefined });
      setBusy(false);
      setInfo("เครือข่ายขัดข้อง — บันทึกออฟไลน์ไว้แล้ว จะซิงค์อัตโนมัติ");
      setPhase("checkedin");
    }
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const eventId = crypto.randomUUID();
    const lat = coords?.lat ?? homeLat ?? 0;
    const lng = coords?.lng ?? homeLng ?? 0;

    if (!navigator.onLine) {
      await enqueueCheckEvent({ clientUuid: eventId, sessionId, kind: "check_out", capturedAt: new Date().toISOString(), lat, lng, distanceMeters: distance ?? undefined, withinRadius: hasHome ? inRange : false, isEarly: isEarlyNow() });
      setBusy(false);
      setInfo("บันทึกเช็คเอาท์ออฟไลน์แล้ว — โปรดทำรายงาน Follow up เมื่อกลับมาออนไลน์");
      return;
    }
    try {
      const res = await recordCheckEvent({ sessionId, kind: "check_out", lat, lng, distanceM: distance, within: hasHome ? inRange : false, isEarly: isEarlyNow(), eventId });
      setBusy(false);
      if (res.error) return setError(res.error);
      setSheetOpen(true);
    } catch {
      await enqueueCheckEvent({ clientUuid: eventId, sessionId, kind: "check_out", capturedAt: new Date().toISOString(), lat, lng, distanceMeters: distance ?? undefined, withinRadius: hasHome ? inRange : false, isEarly: isEarlyNow() });
      setBusy(false);
      setInfo("เครือข่ายขัดข้อง — บันทึกเช็คเอาท์ออฟไลน์แล้ว");
    }
  }

  const distanceText =
    distance == null ? "—" : distance < 1000 ? `${Math.round(distance)} ม.` : `${(distance / 1000).toFixed(2)} กม.`;

  return (
    <div className="space-y-3">
      {phase === "idle" && (
        <Button size="lg" className="w-full" onClick={locate}>
          <MapPin className="h-5 w-5" /> เช็คอินเข้างาน
        </Button>
      )}

      {phase === "locating" && (
        <Button size="lg" className="w-full" disabled>
          <Loader2 className="h-5 w-5 animate-spin" /> กำลังหาตำแหน่ง…
        </Button>
      )}

      {phase === "located" && (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">ระยะถึงบ้านผู้รับบริการ</span>
            <Badge tone={inRange ? "completed" : "late"}>
              {hasHome ? (inRange ? `อยู่ในระยะ · ${distanceText}` : `นอกระยะ · ${distanceText}`) : "ไม่มีพิกัดบ้าน"}
            </Badge>
          </div>
          {accuracy != null && !error && (
            <p className="text-2xs text-faint">ความแม่นยำ GPS ±{Math.round(accuracy)} ม.</p>
          )}
          {hasHome && !inRange && (
            <p className="text-xs text-[var(--status-late-fg)]">
              ต้องอยู่ในรัศมี {radiusM >= 1000 ? `${radiusM / 1000} กม.` : `${radiusM} ม.`} จึงจะเช็คอินได้
            </p>
          )}

          {selfieEnforced && (
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-3 text-sm">
              {selfieUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selfieUrl} alt="selfie" className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-md bg-surface-tint text-primary">
                  <Camera className="h-5 w-5" />
                </span>
              )}
              <span className="text-ink">{selfie ? "ถ่ายใหม่" : "ถ่ายเซลฟี่ยืนยันตัวตน"}</span>
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="sr-only"
                onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          {error && <p className="text-xs text-[var(--danger-fg)]">{error}</p>}
          <Button
            size="lg"
            className="w-full"
            onClick={confirmCheckIn}
            disabled={busy || (hasHome && !inRange) || (selfieEnforced && !selfie)}
          >
            {busy ? "กำลังบันทึก…" : "ยืนยันเช็คอิน"}
          </Button>
        </div>
      )}

      {phase === "checkedin" && (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--status-completed-fg)]">
            <CheckCircle2 className="h-5 w-5" /> เช็คอินแล้ว
          </p>
          <p className="text-xs text-muted">เมื่อฝึกเสร็จ กด “เช็คเอาท์” เพื่อบันทึก Follow up (รายวัน)</p>
          {info && <p className="flex items-center gap-1 text-xs text-muted"><WifiOff className="h-3.5 w-3.5" /> {info}</p>}
          {error && <p className="text-xs text-[var(--danger-fg)]">{error}</p>}
          <Button size="lg" variant="secondary" className="w-full" onClick={checkout} disabled={busy}>
            <LogOut className="h-5 w-5" /> {busy ? "กำลังบันทึก…" : "เช็คเอาท์"}
          </Button>
        </div>
      )}

      {phase === "done" && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-[var(--status-completed-bg)] p-4 text-[var(--status-completed-fg)]">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">จบเคส</span>
        </div>
      )}

      {info && phase !== "checkedin" && <p className="text-xs text-muted">{info}</p>}

      <DailyReportSheet
        open={sheetOpen}
        sessionId={sessionId}
        patientName={patientName}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          setPhase("done");
          router.refresh();
        }}
      />
    </div>
  );
}
