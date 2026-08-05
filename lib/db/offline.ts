import Dexie, { type Table } from "dexie";

/**
 * Offline queue for the employee PWA. Check-ins/check-outs and report drafts
 * are written here first (device clock + GPS captured locally), then flushed to
 * Supabase by the sync layer on reconnect. `clientUuid` is the server PK too,
 * so re-sends are idempotent (INSERT ... ON CONFLICT DO NOTHING).
 * Client-only: instantiate lazily via getOfflineDb() to avoid SSR access.
 */
export interface QueuedCheckin {
  clientUuid: string;
  kind: "check_in" | "check_out";
  sessionId: string;
  capturedAt: string; // ISO; device clock = authoritative event time
  lat: number;
  lng: number;
  accuracy?: number | undefined;
  distanceMeters?: number | undefined;
  withinRadius?: boolean | undefined;
  isLate?: boolean | undefined;
  isEarly?: boolean | undefined;
  selfieBlob?: Blob | undefined; // captured offline; uploaded on flush
  derivedStatus?: string | undefined;
  syncState: "pending" | "syncing" | "synced" | "conflict" | "failed";
  attempts: number;
  lastError?: string | undefined;
}

export interface QueuedReport {
  clientUuid: string;
  reportType: string;
  patientId?: string | undefined;
  sessionId?: string | undefined;
  checkInUuid?: string | undefined;
  /** Draft this filing supersedes, so the flush retires it too. */
  draftId?: string | undefined;
  payload: unknown;
  syncState: "pending" | "syncing" | "synced" | "conflict" | "failed";
  attempts: number;
  lastError?: string | undefined;
}

class TpmOfflineDb extends Dexie {
  checkins!: Table<QueuedCheckin, string>;
  reports!: Table<QueuedReport, string>;

  constructor() {
    super("tpm-offline");
    this.version(1).stores({
      checkins: "clientUuid, syncState, sessionId",
      reports: "clientUuid, syncState, patientId",
    });
  }
}

let _db: TpmOfflineDb | null = null;

/** Lazily construct the IndexedDB handle (browser only). */
export function getOfflineDb(): TpmOfflineDb {
  if (typeof window === "undefined") {
    throw new Error("getOfflineDb() is browser-only.");
  }
  if (!_db) _db = new TpmOfflineDb();
  return _db;
}
