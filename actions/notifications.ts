"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Mark one notification read (RLS restricts to the caller's own rows). */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  revalidatePath("/app");
  revalidatePath("/staff");
}

/** Mark all of the caller's unread notifications read. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_profile_id", user.id)
    .is("read_at", null);
  revalidatePath("/app");
  revalidatePath("/staff");
}
