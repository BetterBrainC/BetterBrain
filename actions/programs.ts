"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export interface ProgramEdit {
  /** Name the row had when the page loaded; null = newly added row. */
  original: string | null;
  name: string;
}

/**
 * Staff: save the master list of โปรแกรมฝึก (คอร์สการฟื้นฟู) with real
 * edit/delete semantics (client bug: edits used to silently resurrect because
 * the page unions in-use programs back in):
 *  - RENAME propagates to patients.training_program, the exercise-guide key,
 *    and per-recipient portal pins — so the new name sticks everywhere.
 *  - DELETE removes the program + its guide; blocked with a clear message if
 *    any recipient still uses it (otherwise the union view revives it).
 * Stored in settings.extra (training_programs / exercise_guides /
 * portal_home_programs). No migration (reuses the settings jsonb).
 */
export async function applyTrainingPrograms(input: {
  items: ProgramEdit[];
  removed: string[];
}): Promise<{ ok?: boolean; error?: string }> {
  const u = await getCurrentUser();
  const role = u?.profile?.role;
  if (role !== "admin" && role !== "director") return { error: "ไม่มีสิทธิ์" };
  if (u?.profile?.is_enabled === false) return { error: "บัญชีถูกปิดการใช้งาน" };

  // Final list (trimmed, deduped, in submitted order).
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const row of input.items ?? []) {
    const s = String(row?.name ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    cleaned.push(s);
  }

  // Renames: original -> new name (both non-empty, actually different).
  const renames = new Map<string, string>();
  for (const row of input.items ?? []) {
    const from = String(row?.original ?? "").trim();
    const to = String(row?.name ?? "").trim();
    if (from && to && from !== to) renames.set(from, to);
  }

  // Deletions = rows removed in the UI whose name didn't survive elsewhere.
  const removed = [...new Set((input.removed ?? []).map((s) => String(s ?? "").trim()))]
    .filter((s) => s && !seen.has(s) && !renames.has(s));

  const admin = createAdminClient();

  // A program still in use cannot be deleted — it would silently reappear.
  for (const name of removed) {
    const { count } = await admin
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("training_program", name);
    if ((count ?? 0) > 0) {
      return {
        error: `ลบ “${name}” ไม่ได้ — มีผู้รับบริการใช้อยู่ ${count} ราย ให้เปลี่ยนโปรแกรมของผู้รับบริการก่อน`,
      };
    }
  }

  // Propagate renames to recipients so the new name sticks everywhere.
  for (const [from, to] of renames) {
    const { error } = await admin
      .from("patients")
      .update({ training_program: to })
      .eq("training_program", from);
    if (error) return { error: error.message };
  }

  const { data } = await admin.from("settings").select("extra").eq("id", 1).maybeSingle();
  const extra = ((data as { extra?: Record<string, unknown> } | null)?.extra ?? {}) as Record<string, unknown>;

  // Move guide items to renamed keys; drop guides of deleted programs.
  const guides = extra.exercise_guides && typeof extra.exercise_guides === "object"
    ? { ...(extra.exercise_guides as Record<string, unknown>) }
    : {};
  for (const [from, to] of renames) {
    if (from in guides) {
      if (!(to in guides)) guides[to] = guides[from];
      delete guides[from];
    }
  }
  for (const name of removed) delete guides[name];

  // Re-point per-recipient portal pins at renamed programs; clear deleted ones.
  const pinned = extra.portal_home_programs && typeof extra.portal_home_programs === "object"
    ? { ...(extra.portal_home_programs as Record<string, unknown>) }
    : {};
  for (const [pid, prog] of Object.entries(pinned)) {
    const p = typeof prog === "string" ? prog.trim() : "";
    if (!p) continue;
    if (renames.has(p)) pinned[pid] = renames.get(p);
    else if (removed.includes(p)) delete pinned[pid];
  }

  const { error } = await admin.from("settings").upsert(
    {
      id: 1,
      extra: {
        ...extra,
        training_programs: cleaned,
        exercise_guides: guides,
        portal_home_programs: pinned,
      },
    },
    { onConflict: "id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/staff/programs");
  revalidatePath("/staff/patients/new");
  revalidatePath("/staff/relatives");
  return { ok: true };
}
