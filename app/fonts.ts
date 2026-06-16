import { Prompt } from "next/font/google";

/**
 * App typeface = Google Prompt (matches the original build) — a Thai-aware
 * geometric sans covering Thai + Latin. next/font self-hosts the woff2 at build
 * time (no runtime Google request); exposed as the `--font-prompt` CSS variable,
 * consumed by --font-sans / --font-display in app/globals.css.
 */
export const appFont = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});
