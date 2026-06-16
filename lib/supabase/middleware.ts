import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paths reachable without authentication. */
const PUBLIC_PREFIXES = [
  "/login",
  "/forgot",
  "/reset",
  "/booking", // public booking form
  "/register/", // public registration link (relative fills intake)
  "/r/", // tokenized relatives portal
  "/api/cron", // cron routes (no Supabase session; self-guarded by CRON_SECRET)
];

/**
 * Refresh the Supabase auth cookie on every request and gate protected routes.
 * If Supabase env is not yet configured (project deferred), we no-op so the UI
 * shell still runs locally.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() (not getSession) revalidates the JWT with the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => path === p || path.startsWith(p),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // TODO(P0+): role-based routing (employee → /(app), admin/director → /(staff))
  // once profiles.role is available; keep auth-only gating for now.
  return response;
}
