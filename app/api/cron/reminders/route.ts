import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { bangkokToday } from "@/lib/data/queries";
import { formatThaiTime } from "@/lib/date/buddhist";

// web-push needs the Node runtime; reminders depend on live data.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Add `n` days to a YYYY-MM-DD string (UTC-safe date arithmetic). */
function addDays(ymd: string, n: number): string {
  const dt = new Date(`${ymd}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

type RelativeLink = { relative_id: string; access_token: string; expires_at: string | null };

/**
 * Daily reminders for relatives who opted into Web Push:
 *   • a session 1 day out (lead days from settings.reminder_lead_days)
 *   • a course with exactly 1 session left ("ก่อนจบคอร์ส")
 * Idempotent via notifications.dedupe_key so re-runs never double-send.
 * Scheduled by Vercel Cron (see vercel.json); protected by CRON_SECRET.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const portalUrl = (token: string) => (appUrl ? `${appUrl}/r/${token}` : `/r/${token}`);

  // Lead days for the "1 day before" reminder.
  const { data: setRow } = await admin.from("settings").select("reminder_lead_days").eq("id", 1).maybeSingle();
  const leadDays = Number((setRow as { reminder_lead_days: number } | null)?.reminder_lead_days ?? 1);
  const targetDate = addDays(bangkokToday(), leadDays);

  // Active relatives links by patient (skip revoked/expired).
  const nowMs = Date.now();
  async function relativesFor(patientIds: string[]): Promise<Map<string, RelativeLink[]>> {
    const map = new Map<string, RelativeLink[]>();
    if (patientIds.length === 0) return map;
    const { data } = await admin
      .from("relative_access")
      .select("patient_id, relative_id, access_token, expires_at, revoked")
      .in("patient_id", patientIds)
      .eq("revoked", false);
    for (const r of (data ?? []) as (RelativeLink & { patient_id: string; revoked: boolean })[]) {
      if (r.expires_at && new Date(r.expires_at).getTime() <= nowMs) continue;
      const list = map.get(r.patient_id) ?? [];
      list.push({ relative_id: r.relative_id, access_token: r.access_token, expires_at: r.expires_at });
      map.set(r.patient_id, list);
    }
    return map;
  }

  let sessionReminders = 0;
  let courseReminders = 0;

  // ── 1) Sessions one lead window out ─────────────────────────────────────
  const { data: sData } = await admin
    .from("schedule_sessions")
    .select("id, patient_id, scheduled_start, patients(full_name)")
    .eq("scheduled_date", targetDate)
    .eq("status", "scheduled");
  const sessions = (sData ?? []) as unknown as {
    id: string; patient_id: string; scheduled_start: string;
    patients: { full_name: string | null } | null;
  }[];
  const sessionRelMap = await relativesFor([...new Set(sessions.map((s) => s.patient_id))]);
  for (const s of sessions) {
    const rels = sessionRelMap.get(s.patient_id) ?? [];
    const name = s.patients?.full_name ?? "ผู้รับบริการ";
    for (const r of rels) {
      const res = await createNotification({
        type: "session_reminder_1d",
        audience: "relative",
        recipientRelativeId: r.relative_id,
        channel: "push",
        title: "แจ้งเตือนคิวฝึก",
        body: `${name} มีคิวฝึกวันที่ ${targetDate} เวลา ${formatThaiTime(s.scheduled_start)}`,
        url: portalUrl(r.access_token),
        dedupeKey: `rem1d:${s.id}:${r.relative_id}`,
      });
      if (res.id || res.pushed) sessionReminders += 1;
    }
  }

  // ── 2) Courses with exactly 1 session left ──────────────────────────────
  const { data: progData } = await admin
    .from("course_progress")
    .select("course_id, remaining_sessions")
    .eq("remaining_sessions", 1);
  const courseIds = (progData ?? []).map((p) => (p as { course_id: string }).course_id);
  if (courseIds.length > 0) {
    const { data: cData } = await admin
      .from("courses")
      .select("id, patient_id, status")
      .in("id", courseIds)
      .eq("status", "on_process");
    const courses = (cData ?? []) as { id: string; patient_id: string }[];
    const courseRelMap = await relativesFor([...new Set(courses.map((c) => c.patient_id))]);
    for (const c of courses) {
      for (const r of courseRelMap.get(c.patient_id) ?? []) {
        const res = await createNotification({
          type: "course_ending",
          audience: "relative",
          recipientRelativeId: r.relative_id,
          channel: "push",
          title: "ใกล้จบคอร์ส",
          body: "เหลือการฝึกอีก 1 ครั้งจะครบคอร์ส — ติดต่อคลินิกเพื่อต่อคอร์สหากต้องการ",
          url: portalUrl(r.access_token),
          dedupeKey: `ending:${c.id}:${r.relative_id}`,
        });
        if (res.id || res.pushed) courseReminders += 1;
      }
    }
  }

  return Response.json({ ok: true, targetDate, sessionReminders, courseReminders });
}
