"use client";

import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

/**
 * Browser Supabase client (anon key + RLS). Created per call; cheap and
 * stateless. Never use the service-role key here.
 *
 * NOTE: read keys from `clientEnv` (statically-accessed `process.env.NEXT_PUBLIC_*`)
 * — Next.js only inlines public env vars accessed by a literal property name, so a
 * dynamic `process.env[name]` (requireEnv) returns undefined in the browser.
 * (Generated types live in lib/supabase/types.ts; the generic is omitted to avoid
 * TS deep-instantiation `never` against the large schema.)
 */
export function createClient() {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createBrowserClient(url, key);
}
