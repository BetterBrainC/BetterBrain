import { createAdminClient } from "@/lib/supabase/admin";
import { bangkokToday } from "@/lib/data/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily attendance sweep: any session whose day has passed but was never checked
 * into stays 'scheduled'/'rescheduled' → mark it 'no_checkin' ("ไม่ได้เช็คอิน")
 * so it is excluded from work hours and never consumes a course session.
 * Scheduled by Vercel Cron (vercel.json); protected by CRON_SECRET.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const today = bangkokToday();
  const { data, error } = await admin
    .from("schedule_sessions")
    .update({ status: "no_checkin" })
    .lt("scheduled_date", today)
    .in("status", ["scheduled", "rescheduled"])
    .select("id");
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, marked: (data ?? []).length });
}
