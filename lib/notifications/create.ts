import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToProfile, sendPushToRelative } from "@/lib/push/send";

type NotificationType =
  | "session_reminder_1d" | "course_ending" | "session_alert_9"
  | "course_remaining_0" | "correction_decision" | "substitute_needed"
  | "substitute_assigned" | "generic";
type NotificationAudience = "employee" | "admin" | "director" | "relative";
type NotificationChannel = "in_app" | "push" | "email" | "line";

/**
 * Create one notification row (service-role) and fan out a Web Push to the
 * recipient's active devices. Central helper for crons / server actions so the
 * in-app center and Web Push stay in sync. Works for staff/employee (by
 * profile) AND relatives (by relative_id, opt-in via the portal). Pass a
 * `dedupeKey` so crons that re-run never double-send (unique in the DB).
 */
export async function createNotification(input: {
  type: NotificationType;
  audience: NotificationAudience;
  recipientProfileId?: string | null;
  recipientRelativeId?: string | null;
  channel?: NotificationChannel;
  title: string;
  body: string;
  url?: string;
  dedupeKey?: string;
  data?: Record<string, unknown>;
}): Promise<{ id?: string; pushed?: number; deduped?: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("notifications")
    .insert({
      type: input.type,
      audience: input.audience,
      recipient_profile_id: input.recipientProfileId ?? null,
      recipient_relative_id: input.recipientRelativeId ?? null,
      channel: input.channel ?? "in_app",
      title: input.title,
      body: input.body,
      dedupe_key: input.dedupeKey ?? null,
      data: (input.data ?? {}) as never,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    // Unique violation on dedupe_key → already sent; treat as a no-op success.
    if (error.code === "23505") return { deduped: true };
    return { error: error.message };
  }

  const payload = {
    title: input.title,
    body: input.body,
    url: input.url ?? "/app",
    tag: input.type,
  };
  let pushed = 0;
  if (input.recipientProfileId) pushed += await sendPushToProfile(input.recipientProfileId, payload);
  if (input.recipientRelativeId) pushed += await sendPushToRelative(input.recipientRelativeId, payload);
  return { id: (row as { id: string } | null)?.id, pushed };
}
