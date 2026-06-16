import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;
/** Configure VAPID once from env. Returns false (and skips) if not configured. */
function configureVapid(): boolean {
  if (configured) return true;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send `payload` to a set of subscriptions; self-heal dead endpoints. */
async function deliver(subs: SubRow[], payload: PushPayload): Promise<number> {
  if (subs.length === 0) return 0;
  const admin = createAdminClient();
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        await admin
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", s.id);
      } catch (err) {
        const e = err as { statusCode?: number; body?: string };
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          // Subscription is gone — deactivate it so the table self-heals.
          await admin
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", s.id);
        } else {
          console.error("[push] send failed", e?.statusCode, e?.body ?? err);
        }
      }
    }),
  );
  return subs.length;
}

/**
 * Send a Web Push to every ACTIVE subscription of a staff/employee profile
 * (server-only; service-role client). Returns the number attempted.
 */
export async function sendPushToProfile(
  profileId: string,
  payload: PushPayload,
): Promise<number> {
  if (!configureVapid()) {
    console.warn("[push] VAPID env not configured — skipping push send");
    return 0;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId)
    .eq("is_active", true);
  return deliver((data ?? []) as SubRow[], payload);
}

/**
 * Send a Web Push to a relative's devices. Relatives are NOT auth users — their
 * subscriptions are keyed by `relative_id` and written via the service-role
 * client from the portal (see actions/portal.ts).
 */
export async function sendPushToRelative(
  relativeId: string,
  payload: PushPayload,
): Promise<number> {
  if (!configureVapid()) {
    console.warn("[push] VAPID env not configured — skipping push send");
    return 0;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("relative_id", relativeId)
    .eq("is_active", true);
  return deliver((data ?? []) as SubRow[], payload);
}
