"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, CheckCircle2, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DailyReportSheet } from "@/components/reports/daily-report-sheet";
import { haversineMeters } from "@/lib/geo/haversine";
import { getCurrentFix } from "@/lib/geo/geolocation";
import { recordCheckEvent } from "@/actions/checkin";

type Phase = "idle" | "locating" | "located" | "checkedin" | "done";

/**
 * Check-in signature component. Real GPS via the browser; distance computed
 * against the patient's home; check-in/out persisted via server action (RPC).
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
  lateThresholdMin,
}: {
  sessionId: string;
  patientName: string;
  homeLat: number | null;
  homeLng: number | null;
  radiusM: number;
  initialStatus: string;
  scheduledStartISO: string | null;
  lateThresholdMin: number;
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
  const [busy, setBusy] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const hasHome = homeLat != null && homeLng != null;
  const inRange = distance != null && distance <= radiusM;

  function isLateNow(): boolean {
    if (!scheduledStartISO) return false;
    const start = new Date(scheduledStartISO).getTime();
    if (Number.isNaN(start)) return false;
    return Date.now() > start + lateThresholdMin * 60_000;
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
    setBusy(true);
    setError(null);
    // Send the employee's ACTUAL position (fall back to home only if GPS failed),
    // with the real haversine distance + geofence verdict computed from it.
    const res = await recordCheckEvent({
      sessionId,
      kind: "check_in",
      lat: coords?.lat ?? homeLat ?? 0,
      lng: coords?.lng ?? homeLng ?? 0,
      distanceM: distance,
      within: hasHome ? inRange : false,
      isLate: isLateNow(),
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    setPhase("checkedin");
    router.refresh();
  }

  async function checkout() {
    setBusy(true);
    const res = await recordCheckEvent({
      sessionId,
      kind: "check_out",
      lat: coords?.lat ?? homeLat ?? 0,
      lng: coords?.lng ?? homeLng ?? 0,
      distanceM: distance,
      within: hasHome ? inRange : false,
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    setSheetOpen(true);
  }

  const distanceText =
    distance == null
      ? "—"
      : distance < 1000
        ? `${Math.round(distance)} ม.`
        : `${(distance / 1000).toFixed(2)} กม.`;

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
          {error && <p className="text-xs text-[var(--danger-fg)]">{error}</p>}
          {hasHome && !inRange && (
            <p className="text-xs text-muted">
              ต้องอยู่ในรัศมี {radiusM >= 1000 ? `${radiusM / 1000} กม.` : `${radiusM} ม.`} ·
              (โหมดสาธิต: ดำเนินการต่อได้)
            </p>
          )}
          <Button size="lg" className="w-full" onClick={confirmCheckIn} disabled={busy}>
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
