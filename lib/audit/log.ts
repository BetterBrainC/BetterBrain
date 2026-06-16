import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import type { Database } from "@/lib/supabase/types";

type AuditAction = Database["public"]["Enums"]["audit_action"];
type UserRole = Database["public"]["Enums"]["user_role"];

/**
 * Append one row to the append-only audit_logs (CLAUDE.md §7 "Audit EVERYTHING").
 * Uses the service-role client because audit_logs has no INSERT policy (writes
 * only via SECURITY DEFINER / service-role; reads are Director-only). Auditing
 * must NEVER break the audited action, so all errors are swallowed + logged.
 * Actor defaults to the current user; pass actorId/actorRole to skip the lookup.
 */
export async function writeAudit(input: {
  action: AuditAction;
  entity?: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  context?: Record<string, unknown>;
  actorId?: string | null;
  actorRole?: UserRole | null;
}): Promise<void> {
  try {
    let actorId = input.actorId ?? null;
    let actorRole = input.actorRole ?? null;
    if (input.actorId === undefined && input.actorRole === undefined) {
      const u = await getCurrentUser();
      actorId = u?.id ?? null;
      actorRole = (u?.profile?.role ?? null) as UserRole | null;
    }
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: actorId,
      actor_role: actorRole,
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      before: (input.before ?? null) as never,
      after: (input.after ?? null) as never,
      context: (input.context ?? null) as never,
    });
  } catch (e) {
    console.error("[audit] write failed", e);
  }
}
