import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

/**
 * SERVER-ONLY admin client (service-role key, bypasses RLS).
 * Use ONLY where RLS cannot express the rule: the relatives portal (token →
 * patient), the audit-writing definer paths, and Edge/cron senders.
 * NEVER import this into a client component.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser.");
  }
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
