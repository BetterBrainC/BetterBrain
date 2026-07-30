"use server";

/**
 * Resolve a shortened Google Maps link to coordinates.
 *
 * Copying a place from the Google Maps app gives a short link
 * (https://maps.app.goo.gl/…) that carries no coordinates, so the intake form
 * could not pin the home from a pasted link at all (client 30 ก.ค. 2569).
 * Following the redirect server-side yields the long /maps/place/… URL, which
 * does.
 *
 * This is an outbound fetch driven by user input, so it is locked to Google map
 * hosts over https and every redirect hop is re-checked — it can never be
 * pointed at an internal address.
 */

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.google.co.th",
  "www.google.co.th",
  "google.co.th",
]);

const MAX_HOPS = 5;

function isAllowed(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  return ALLOWED_HOSTS.has(u.hostname.toLowerCase()) ? u : null;
}

/** Pull lat/lng out of a long Google Maps URL or any text containing one. */
function coordsFrom(text: string): { lat: number; lng: number } | null {
  const pair = "(-?\\d{1,3}\\.\\d+)[,\\s]+(-?\\d{1,3}\\.\\d+)";
  const patterns = [
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/, // exact place pin
    new RegExp(`[?&](?:q|query|ll|destination|center)=${pair}`),
    new RegExp(`@${pair}`),
    new RegExp(`/@${pair}`),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

/**
 * Pull the place/address text out of a /maps/place/<TEXT>/… URL. Google shares
 * places by ID and renders the pin client-side, so a share link often carries
 * the address but no coordinates — that text is the only lead we get.
 */
function placeTextFrom(url: string): string | null {
  const seg = url.match(/\/maps\/place\/([^/@?]+)/)?.[1];
  if (!seg) return null;
  try {
    const text = decodeURIComponent(seg.replace(/\+/g, " ")).trim();
    return text && !/^data=/.test(text) ? text : null;
  } catch {
    return null;
  }
}

export interface ResolveMapResult {
  lat?: number;
  lng?: number;
  /** The expanded long URL, when we managed to follow the short link. */
  resolvedUrl?: string;
  /** Address found in the link when it carried no coordinates. */
  addressText?: string;
  /** true → the caller must ask before geocoding (the address is personal data). */
  needsGeocode?: boolean;
  error?: string;
}

export async function resolveMapLink(input: string): Promise<ResolveMapResult> {
  const start = isAllowed(String(input ?? "").trim());
  if (!start) return { error: "รองรับเฉพาะลิงก์ Google Maps เท่านั้น" };

  let current = start;
  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const res = await fetch(current.toString(), {
        redirect: "manual",
        headers: {
          // Google serves the coordinate-bearing page only to a real browser UA.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          "Accept-Language": "th,en;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });

      const location = res.headers.get("location");
      if (location) {
        const next = isAllowed(new URL(location, current).toString());
        if (!next) return { error: "ลิงก์นี้พาออกนอก Google Maps" };
        const hit = coordsFrom(next.toString());
        if (hit) return { ...hit, resolvedUrl: next.toString() };
        current = next;
        continue;
      }

      // Final hop: try the URL itself, then the canonical link, then the body.
      const finalUrl = res.url || current.toString();
      const fromUrl = coordsFrom(finalUrl);
      if (fromUrl) return { ...fromUrl, resolvedUrl: finalUrl };

      const body = (await res.text()).slice(0, 400_000);
      const canonical =
        body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
        body.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1];
      if (canonical) {
        const hit = coordsFrom(canonical.replace(/&amp;/g, "&"));
        if (hit) return { ...hit, resolvedUrl: canonical };
      }
      const fromBody = coordsFrom(body);
      if (fromBody) return { ...fromBody, resolvedUrl: finalUrl };

      const address = placeTextFrom(finalUrl) ?? placeTextFrom(current.toString());
      if (address) return { addressText: address, resolvedUrl: finalUrl, needsGeocode: true };
      break;
    }
  } catch {
    return { error: "เปิดลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  return { error: "ลิงก์นี้ไม่มีพิกัด — เปิดใน Google Maps แล้วคัดลอกพิกัดมาวาง" };
}

/**
 * Look up coordinates for an address via OpenStreetMap/Nominatim.
 *
 * Deliberately a separate, explicitly-invoked step: a recipient's home address
 * is personal data under PDPA, so it only leaves the system when staff tap the
 * button — never automatically while someone types.
 *
 * Accuracy is street level, which is well inside the 1 km check-in geofence,
 * but the caller must present the result as ประมาณ and let staff confirm.
 */
export async function geocodeAddress(query: string): Promise<{
  lat?: number;
  lng?: number;
  displayName?: string;
  error?: string;
}> {
  const raw = String(query ?? "").trim();
  if (raw.length < 6) return { error: "ที่อยู่สั้นเกินไป" };

  // Google encodes the address with '+' between every token, so decoding splits
  // Thai compounds that are normally written closed up ("ถนน มหิดล"). Rejoin them
  // or Nominatim only ever matches down to the subdistrict, which can sit a
  // couple of km off the real house.
  const normalize = (s: string) =>
    s.replace(/(ถนน|ซอย|ตำบล|แขวง|อำเภอ|เขต|จังหวัด|หมู่บ้าน)\s+/g, "$1").replace(/\s{2,}/g, " ").trim();

  // Business names rarely exist in OSM — retry from the house number, then from
  // the road/subdistrict, so a "ชื่อร้าน 255 ถนน…" string still resolves.
  const base = normalize(raw);
  const candidates: string[] = [];
  const push = (s: string) => {
    const v = s.trim();
    if (v.length >= 6 && !candidates.includes(v)) candidates.push(v);
  };
  push(base);
  for (const marker of [/\d/, /ถนน|ซอย/, /ตำบล|แขวง/, /อำเภอ|เขต/]) {
    const idx = base.search(marker);
    if (idx > 0) push(base.slice(idx));
  }

  try {
    for (const q of candidates.slice(0, 5)) {
      const url =
        "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=th&q=" +
        encodeURIComponent(q);
      const res = await fetch(url, {
        headers: {
          // Nominatim requires an identifying UA; anonymous calls get blocked.
          "User-Agent": "TPM-BetterBrain/1.0 (clinic home-visit scheduling)",
          "Accept-Language": "th",
        },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const hits = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
      const hit = Array.isArray(hits) ? hits[0] : null;
      const lat = Number(hit?.lat);
      const lng = Number(hit?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng, displayName: hit?.display_name };
      }
      // Nominatim asks for ≤1 request/second.
      await new Promise((r) => setTimeout(r, 1100));
    }
  } catch {
    return { error: "ค้นหาพิกัดไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  return { error: "ไม่พบพิกัดของที่อยู่นี้ — กรอกพิกัดเองหรือกด “ดึงตำแหน่งปัจจุบัน”" };
}
