/**
 * One-off: back-fill the missing check-out for visits that were closed by saving
 * the daily report without pressing "เช็คเอาท์" (client 5 ส.ค. 2569 — the work-hours
 * column). Those visits can never record an end time through the UI, because
 * completing the case hides the button.
 *
 * The written time is the booked end of the slot; if the therapist checked in
 * after that (a late visit), it is check-in + the slot's length instead, so the
 * pair is never negative. Every inserted row is flagged `corrected = true` — it
 * is an administrative entry, not a GPS capture — and audit-logged.
 *
 *   node scripts/backfill-checkouts.mjs           # dry run, prints the plan
 *   node scripts/backfill-checkouts.mjs --apply   # writes
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SERVED = ["completed", "attended", "late"];
const DEFAULT_SLOT_MS = 60 * 60 * 1000;

const { data: sessions, error: sErr } = await db
  .from("schedule_sessions")
  .select("id, employee_id, status, scheduled_date, scheduled_start, scheduled_end")
  .in("status", SERVED)
  .limit(5000);
if (sErr) throw sErr;

const { data: events, error: cErr } = await db
  .from("check_ins")
  .select("id, session_id, employee_id, kind, client_event_at, lat, lng, distance_m, within_geofence")
  .limit(10000);
if (cErr) throw cErr;

const checkIn = new Map();
const checkedOut = new Set();
for (const e of events) {
  if (e.kind === "check_in") checkIn.set(e.session_id, e);
  else if (e.kind === "check_out") checkedOut.add(e.session_id);
}

const { data: profiles } = await db.from("profiles").select("id, full_name");
const nameOf = new Map(profiles.map((p) => [p.id, p.full_name]));

const plan = [];
for (const s of sessions) {
  if (checkedOut.has(s.id)) continue;
  const ci = checkIn.get(s.id);
  if (!ci) continue; // no check-in either → nothing to pair, leave it alone

  const inMs = new Date(ci.client_event_at).getTime();
  const slotMs =
    s.scheduled_start && s.scheduled_end
      ? new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()
      : DEFAULT_SLOT_MS;
  const endMs = s.scheduled_end ? new Date(s.scheduled_end).getTime() : 0;
  const outMs = endMs > inMs ? endMs : inMs + (slotMs > 0 ? slotMs : DEFAULT_SLOT_MS);

  plan.push({
    session: s,
    checkIn: ci,
    outISO: new Date(outMs).toISOString(),
    basis: endMs > inMs ? "เวลานัดสิ้นสุด" : "เช็คอิน + ความยาวคิว",
  });
}

const th = (iso) =>
  new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));

console.log(`${APPLY ? "APPLY" : "DRY RUN"} — จะเติมเช็คเอาท์ ${plan.length} รายการ\n`);
for (const p of plan) {
  console.log(
    `${p.session.scheduled_date}  ${(nameOf.get(p.session.employee_id) ?? "?").padEnd(24)}` +
      `  in ${th(p.checkIn.client_event_at)}  ->  out ${th(p.outISO)}   (${p.basis})`,
  );
}

if (!APPLY) {
  console.log("\nยังไม่ได้เขียนอะไรลงฐานข้อมูล — ใส่ --apply เพื่อบันทึกจริง");
  process.exit(0);
}

let done = 0;
for (const p of plan) {
  const row = {
    id: randomUUID(),
    session_id: p.session.id,
    employee_id: p.checkIn.employee_id,
    kind: "check_out",
    client_event_at: p.outISO,
    lat: p.checkIn.lat,
    lng: p.checkIn.lng,
    distance_m: p.checkIn.distance_m,
    within_geofence: p.checkIn.within_geofence,
    is_late: false,
    is_early: false,
    corrected: true,
  };
  const { error } = await db.from("check_ins").insert(row);
  if (error) {
    console.error("  ✗", p.session.id, error.message);
    continue;
  }
  await db.from("audit_logs").insert({
    actor_id: null,
    action: "update",
    entity: "check_in",
    entity_id: p.session.id,
    after: { kind: "check_out", client_event_at: p.outISO, corrected: true },
    context: {
      reason: "backfill: เคสปิดโดยบันทึกรายงานประจำวันแทนการเช็คเอาท์ (client 5 ส.ค. 2569)",
      basis: p.basis,
    },
  });
  done += 1;
}
console.log(`\nเติมสำเร็จ ${done}/${plan.length} รายการ`);
