"use client";

import * as React from "react";
import { MapPin, LocateFixed } from "lucide-react";
import { Field, TextInput } from "@/components/ui/field";

/**
 * Extract lat/lng from a pasted Google Maps link (or a raw "lat,lng" string).
 * Handles @lat,lng, ?q=/query=/ll=/destination=lat,lng, and !3dLAT!4dLNG place
 * URLs. Short links (goo.gl / maps.app.goo.gl) hide coordinates behind a
 * redirect and can't be parsed here — use "ดึงตำแหน่งปัจจุบัน" instead.
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

  function onLinkChange(v: string) {
    setMapUrl(v);
    const coords = extractLatLng(v);
    if (coords) {
      setLat(coords.lat);
      setLng(coords.lng);
      setNote(null);
    } else if (v.trim()) {
      setNote("ดึงพิกัดจากลิงก์ไม่ได้ — วางลิงก์ที่มีพิกัด หรือกด “ดึงตำแหน่งปัจจุบัน”");
    } else {
      setNote(null);
    }
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
          placeholder="วางลิงก์ Google Maps หรือพิกัด เช่น 13.7563,100.5018"
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
            <MapPin className="h-4 w-4 text-teal" /> {lat!.toFixed(5)}, {lng!.toFixed(5)}
          </a>
        )}
      </div>
      {note && <p className="text-xs text-[var(--warning-fg)]">{note}</p>}
    </div>
  );
}
