import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Service worker source + output. The employee PWA registers this SW.
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable SW in dev to avoid stale-cache pain during local development.
  disable: process.env.NODE_ENV === "development",
  // Reload the page when the SW takes control so users get the latest shell.
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions are used pervasively (auth + Zod + authorize + audit).
    serverActions: {
      bodySizeLimit: "5mb", // report images / selfies via Storage, but allow modest payloads
    },
  },
  images: {
    // Supabase Storage signed URLs render via next/image where useful.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default withSerwist(nextConfig);
