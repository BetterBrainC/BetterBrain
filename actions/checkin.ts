"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

/**
 * Block writes from deactivated accounts via a LIVE is_enabled check. The JWT
 * can lag a deactivation by up to ~1h, and the SECURITY DEFINER RPCs only check
 * session ownership — so enforce it at the action layer (CLAUDE.md §9/§10).
 */
async function requireEnabledUser(): Promise<ActionResult> {
  const u = await getCurrentUser();
  if (!u) return { error: "ไม่ได้เข้าสู่ระบบ" };
  if (u.profile?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };
  return { ok: true };
}

/** Record a check-in or check-out (via SECURITY DEFINER RPC that also flips session status). */
export async function recordCheckEvent(input: {
  sessionId: string;
  kind: "check_in" | "check_out";
  lat: number;
  lng: number;
  distanceM: number | null;
  within: boolean;
  isLate?: boolean;
  isEarly?: boolean;
}): Promise<ActionResult> {
  const guard = await requireEnabledUser();
  if (!guard.ok) return guard;
  const supabase = await createClient();
  // Enforce ordering: a check-out requires an existing check-in for this session.
  if (input.kind === "check_out") {
    const { data: ci } = await supabase
      .from("check_ins")
      .select("id")
      .eq("session_id", input.sessionId)
      .eq("kind", "check_in")
      .maybeSingle();
    if (!ci) return { error: "ต้องเช็คอินก่อนจึงจะเช็คเอาท์ได้" };
  }
  const { error } = await supabase.rpc("record_check_event", {
    p_session_id: input.sessionId,
    p_kind: input.kind,
    p_lat: input.lat,
    p_lng: input.lng,
    p_distance_m: input.distanceM,
    p_within: input.within,
    p_is_late: input.isLate ?? false,
    p_is_early: input.isEarly ?? false,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/session/${input.sessionId}`);
  revalidatePath("/app");
  return { ok: true };
}

/** Save the Follow-up (daily) report → marks session completed ("จบเคส"). */
export async function saveFollowup(
  sessionId: string,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  const guard = await requireEnabledUser();
  if (!guard.ok) return guard;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_followup", {
    p_session_id: sessionId,
    p_payload: payload as never,
    p_fois: null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/session/${sessionId}`);
  revalidatePath("/app");
  return { ok: true };
}
