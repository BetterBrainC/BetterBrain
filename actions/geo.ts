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

export interface ResolveMapResult {
  lat?: number;
  lng?: number;
  /** The expanded long URL, when we managed to follow the short link. */
  resolvedUrl?: string;
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
      break;
    }
  } catch {
    return { error: "เปิดลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  return { error: "ลิงก์นี้ไม่มีพิกัด — เปิดใน Google Maps แล้วคัดลอกพิกัดมาวาง" };
}
