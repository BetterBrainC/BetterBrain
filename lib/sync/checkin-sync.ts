import { getOfflineDb, type QueuedCheckin } from "@/lib/db/offline";
import { recordCheckEvent, uploadCheckinSelfie } from "@/actions/checkin";

/**
 * Offline check-in sync. Check-in/out events are queued in IndexedDB (device
 * clock + GPS captured locally) and flushed to Supabase on reconnect. The queue
 * key `clientUuid` is sent as the server event-id so re-sends are idempotent
 * (record_check_event de-dupes on unique(session_id, kind)).
 */

export type QueueInput = Omit<QueuedCheckin, "syncState" | "attempts">;

/** Add a check event to the offline queue (pending). */
export async function enqueueCheckEvent(item: QueueInput): Promise<void> {
  const db = getOfflineDb();
  await db.checkins.put({ ...item, syncState: "pending", attempts: 0 });
}

/** How many events are still waiting to sync. */
export async function pendingCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  try {
    const db = getOfflineDb();
    return await db.checkins.where("syncState").anyOf("pending", "failed", "syncing").count();
  } catch {
    return 0;
  }
}

/** Flush the queue to the server. Safe to call repeatedly / concurrently-ish. */
export async function flushCheckins(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) return { synced: 0, failed: 0 };
  const db = getOfflineDb();
  const pending = await db.checkins.where("syncState").anyOf("pending", "failed").toArray();
  let synced = 0;
  let failed = 0;
  for (const q of pending) {
    try {
      await db.checkins.update(q.clientUuid, { syncState: "syncing" });
      let selfieUrl: string | null = null;
      if (q.selfieBlob) {
        const fd = new FormData();
        fd.append("file", new File([q.selfieBlob], "selfie.jpg", { type: q.selfieBlob.type || "image/jpeg" }));
        fd.append("sessionId", q.sessionId);
        const up = await uploadCheckinSelfie(fd);
        if (up.path) selfieUrl = up.path;
      }
      const res = await recordCheckEvent({
        sessionId: q.sessionId,
        kind: q.kind,
        lat: q.lat,
        lng: q.lng,
        distanceM: q.distanceMeters ?? null,
        within: q.withinRadius ?? false,
        isLate: q.isLate,
        isEarly: q.isEarly,
        selfieUrl,
        eventId: q.clientUuid,
      });
      if (res.error) {
        await db.checkins.update(q.clientUuid, { syncState: "failed", attempts: q.attempts + 1, lastError: res.error });
        failed += 1;
      } else {
        await db.checkins.delete(q.clientUuid);
        synced += 1;
      }
    } catch (e) {
      await db.checkins.update(q.clientUuid, { syncState: "failed", attempts: q.attempts + 1, lastError: String(e) });
      failed += 1;
    }
  }
  return { synced, failed };
}
