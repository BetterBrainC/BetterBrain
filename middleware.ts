import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets, the service worker, the manifest,
     * and image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
