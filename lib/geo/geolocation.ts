/** Browser geolocation helpers with Thai, user-actionable error messages. */

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

/** Map a GeolocationPositionError to a Thai message the field user can act on. */
export function geolocationErrorTh(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — เปิดสิทธิ์ตำแหน่งในเบราว์เซอร์แล้วลองใหม่";
    case err.POSITION_UNAVAILABLE:
      return "ระบุตำแหน่งไม่ได้ — ตรวจสอบ GPS/สัญญาณแล้วลองใหม่";
    case err.TIMEOUT:
      return "หาตำแหน่งนานเกินไป — ลองใหม่อีกครั้ง";
    default:
      return "เข้าถึงตำแหน่งไม่ได้ — ลองใหม่อีกครั้ง";
  }
}

/** Promise wrapper around getCurrentPosition. Rejects with a Thai Error message. */
export function getCurrentFix(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 10_000 },
): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("อุปกรณ์นี้ไม่รองรับ GPS"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(geolocationErrorTh(err))),
      options,
    );
  });
}
