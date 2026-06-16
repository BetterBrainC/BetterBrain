import { z } from "zod";

/**
 * Public (client-safe) environment. Parsed at import with safe defaults so the
 * build does not fail before Supabase is wired (we deliberately deferred the
 * live project). Runtime Supabase clients still assert their own required keys.
 */
// NOTE: business config (geofence radius, late/early thresholds, selfie-required)
// is NOT env — it lives in the `settings` table (Director-editable at
// /staff/settings) and is read at runtime via getSettings()/getCheckinSettings().
// The operating timezone (Asia/Bangkok) is a fixed constant in lib/date/buddhist.ts.
const ClientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

export const clientEnv = ClientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

/** Assert a required env var at runtime (server-only secrets, etc.). */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}
