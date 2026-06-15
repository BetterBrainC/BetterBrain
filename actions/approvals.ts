"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** Director approves a check-in correction. */
export async function approveCorrection(id: string): Promise<void> {
  const { supabase, userId } = await uid();
  await supabase
    .from("correction_requests")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/staff/approvals");
}

export async function rejectCorrection(id: string): Promise<void> {
  const { supabase } = await uid();
  await supabase.from("correction_requests").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/staff/approvals");
}

/** Admin applies an approved correction (stamps applied; flags the check-in as corrected). */
export async function applyCorrection(id: string): Promise<void> {
  const { supabase, userId } = await uid();
  const { data: cr } = await supabase
    .from("correction_requests")
    .select("check_in_id, status")
    .eq("id", id)
    .maybeSingle();
  if (cr?.status !== "approved") return;
  await supabase
    .from("correction_requests")
    .update({ status: "applied", applied_by: userId, applied_at: new Date().toISOString() })
    .eq("id", id);
  if (cr.check_in_id) {
    await supabase.from("check_ins").update({ corrected: true }).eq("id", cr.check_in_id);
  }
  revalidatePath("/staff/approvals");
}
