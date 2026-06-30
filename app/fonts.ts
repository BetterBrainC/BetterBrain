import { Sarabun } from "next/font/google";

/**
 * App typeface = Google Sarabun — a looped ("มีหัว"), Thai-first humanist sans
 * covering Thai + Latin, requested by the client for readability (replaces the
 * earlier loopless Prompt). next/font self-hosts the woff2 at build time (no
 * runtime Google request); exposed as the `--font-sarabun` CSS variable,
 * consumed by --font-sans / --font-display in app/globals.css.
 */
export const appFont = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});
