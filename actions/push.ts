"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications/create";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

/** Store/refresh the caller's Web Push subscription (RLS: own rows only). */
export async function subscribePush(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };
  if (!input.endpoint || !input.p256dh || !input.auth)
    return { error: "ข้อมูล subscription ไม่ครบ" };

  // endpoint is UNIQUE → upsert keeps re-subscribe on the same device idempotent.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
      is_active: true,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: error.message };
  return { ok: true };
}

/** Deactivate the caller's subscription for a given endpoint. */
export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Send a test notification (in-app row + Web Push) to the caller's devices. */
export async function sendTestPush(): Promise<ActionResult> {
  const u = await getCurrentUser();
  if (!u) return { error: "ไม่ได้เข้าสู่ระบบ" };
  const role = u.profile?.role;
  const audience = role === "admin" ? "admin" : role === "director" ? "director" : "employee";
  const res = await createNotification({
    type: "generic",
    audience,
    recipientProfileId: u.id,
    channel: "push",
    title: "ทดสอบการแจ้งเตือน",
    body: "ถ้าเห็นข้อความนี้แสดงว่า Web Push ทำงานแล้ว ✅",
    url: role === "employee" ? "/app/notifications" : "/staff/notifications",
  });
  if (res.error) return { error: res.error };
  return { ok: true };
}
