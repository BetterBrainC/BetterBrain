"use client";

import * as React from "react";
import { MapPin, LocateFixed } from "lucide-react";
import { Field, TextInput } from "@/components/ui/field";
import { resolveMapLink, geocodeAddress } from "@/actions/geo";

/** Short Google links carry no coordinates — the server has to expand them. */
function isShortMapLink(s: string): boolean {
  return /^https:\/\/(maps\.app\.goo\.gl|goo\.gl|g\.co)\//i.test(s.trim());
}

/**
 * Extract lat/lng from a pasted Google Maps link (or a raw "lat,lng" string).
 * Handles @lat,lng, ?q=/query=/ll=/destination=lat,lng, and !3dLAT!4dLNG place
 * URLs. Short links (goo.gl / maps.app.goo.gl) are expanded server-side by
 * resolveMapLink().
 */
export function extractLatLng(input: string): { lat: number; lng: number } | null {
  const s = input.trim();
  if (!s) return null;
  const pair = "(-?\\d{1,3}\\.\\d+)[,\\s]+(-?\\d{1,3}\\.\\d+)";
  const patterns = [
    // Place pin (!3dLAT!4dLNG) is more precise than the @ viewport center.
    new RegExp(`!3d(-?\\d{1,3}\\.\\d+)!4d(-?\\d{1,3}\\.\\d+)`),
    new RegExp(`[?&](?:q|query|ll|destination|center)=${pair}`),
    new RegExp(`@${pair}`),
    new RegExp(`^${pair}$`),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

/**
 * Home-location picker for the intake form. Persists home_lat/home_lng (used for
 * the check-in geofence + navigation) plus the original map_url. Two ways to
 * fill it: paste a Google Maps link (coordinates auto-extracted), or tap
 * "ดึงตำแหน่งปัจจุบัน" to use the device's current position.
 */
export function LocationPicker({
  initialLat,
  initialLng,
  initialMapUrl,
}: {
  initialLat?: number | null;
  initialLng?: number | null;
  initialMapUrl?: string | null;
}) {
  const [mapUrl, setMapUrl] = React.useState(initialMapUrl ?? "");
  const [lat, setLat] = React.useState<number | null>(initialLat ?? null);
  const [lng, setLng] = React.useState<number | null>(initialLng ?? null);
  const [note, setNote] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  // Address recovered from a share link that carried no coordinates. Held here
  // (not geocoded straight away) so the address only leaves the system on a tap.
  const [pendingAddress, setPendingAddress] = React.useState<string | null>(null);
  const [approx, setApprox] = React.useState(false);

  // Guards against a stale in-flight resolve overwriting a newer paste.
  const resolveSeq = React.useRef(0);

  async function resolveShortLink(v: string) {
    const seq = ++resolveSeq.current;
    setBusy(true);
    setPendingAddress(null);
    setNote("กำลังเปิดลิงก์เพื่อดึงพิกัด…");
    const res = await resolveMapLink(v);
    if (seq !== resolveSeq.current) return; // superseded
    setBusy(false);
    if (res.lat != null && res.lng != null) {
      setLat(res.lat);
      setLng(res.lng);
      setApprox(false);
      setNote(null);
      return;
    }
    if (res.needsGeocode && res.addressText) {
      setPendingAddress(res.addressText);
      setNote(null);
      return;
    }
    setNote(res.error ?? "ดึงพิกัดจากลิงก์ไม่ได้ — กด “ดึงตำแหน่งปัจจุบัน” แทน");
  }

  async function geocodePending() {
    if (!pendingAddress) return;
    setBusy(true);
    setNote("กำลังค้นหาพิกัดจากที่อยู่…");
    const res = await geocodeAddress(pendingAddress);
    setBusy(false);
    if (res.lat != null && res.lng != null) {
      setLat(res.lat);
      setLng(res.lng);
      setApprox(true);
      setPendingAddress(null);
      setNote("พิกัดโดยประมาณจากที่อยู่ — ตรวจสอบบนแผนที่ก่อนบันทึก");
    } else {
      setNote(res.error ?? "ค้นหาพิกัดไม่สำเร็จ");
    }
  }

  function onLinkChange(v: string) {
    setMapUrl(v);
    const coords = extractLatLng(v);
    if (coords) {
      resolveSeq.current++; // cancel any pending resolve
      setLat(coords.lat);
      setLng(coords.lng);
      setApprox(false);
      setPendingAddress(null);
      setNote(null);
      return;
    }
    if (!v.trim()) {
      resolveSeq.current++;
      setPendingAddress(null);
      setNote(null);
      return;
    }
    if (isShortMapLink(v)) {
      void resolveShortLink(v);
      return;
    }
    setNote("ดึงพิกัดจากลิงก์ไม่ได้ — วางลิงก์ที่มีพิกัด หรือกด “ดึงตำแหน่งปัจจุบัน”");
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNote("อุปกรณ์นี้ไม่รองรับการดึงตำแหน่ง");
      return;
    }
    setBusy(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        setLat(la);
        setLng(ln);
        setMapUrl(`https://www.google.com/maps/search/?api=1&query=${la},${ln}`);
        setBusy(false);
      },
      (err) => {
        setNote(err.code === err.PERMISSION_DENIED ? "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง" : "ดึงตำแหน่งไม่สำเร็จ");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const hasCoords = lat != null && lng != null;

  return (
    <div className="space-y-2">
      <Field label="ลิงก์ Google Maps บ้านผู้รับบริการ">
        <TextInput
          name="map_url"
          value={mapUrl}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="วางลิงก์ Google Maps (รวมลิงก์ย่อ maps.app.goo.gl) หรือพิกัด เช่น 13.7563,100.5018"
          inputMode="url"
        />
      </Field>
      <input type="hidden" name="home_lat" value={hasCoords ? String(lat) : ""} />
      <input type="hidden" name="home_lng" value={hasCoords ? String(lng) : ""} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-surface-tint px-3 text-sm font-medium text-primary-700 hover:bg-surface-sunken disabled:opacity-60"
        >
          <LocateFixed className="h-4 w-4" /> {busy ? "กำลังดึงตำแหน่ง…" : "ดึงตำแหน่งปัจจุบัน"}
        </button>
        {hasCoords && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border px-3 text-sm font-medium text-ink hover:bg-surface-tint"
          >
            <MapPin className={`h-4 w-4 ${approx ? "text-[var(--accent)]" : "text-teal"}`} />{" "}
            {lat!.toFixed(5)}, {lng!.toFixed(5)}
            {approx && <span className="text-xs text-muted">(ประมาณ)</span>}
          </a>
        )}
      </div>

      {pendingAddress && (
        <div className="space-y-2 rounded-md bg-surface-tint p-3">
          <p className="text-xs text-muted">ลิงก์นี้ไม่มีพิกัด แต่พบที่อยู่:</p>
          <p className="text-sm text-ink">{pendingAddress}</p>
          <button
            type="button"
            onClick={geocodePending}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-primary px-3 text-sm font-semibold text-primary-fg disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" /> ค้นหาพิกัดจากที่อยู่นี้
          </button>
          <p className="text-2xs text-faint">ที่อยู่จะถูกส่งไปค้นหาที่ OpenStreetMap เพื่อหาพิกัดโดยประมาณ</p>
        </div>
      )}

      {note && <p className="text-xs text-[var(--warning-fg)]">{note}</p>}
    </div>
  );
}
