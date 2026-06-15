import { IBM_Plex_Sans_Thai, IBM_Plex_Sans_Thai_Looped } from "next/font/google";

/**
 * Thai-first pairing (docs/DESIGN-SYSTEM.md §2):
 *   body/UI  → IBM Plex Sans Thai
 *   display  → IBM Plex Sans Thai Looped (friendly headings / empty states)
 * next/font self-hosts the woff2 at build time (no runtime Google request) and
 * exposes each as a CSS variable consumed by --font-sans / --font-display.
 */
export const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
});

export const plexThaiLooped = IBM_Plex_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-plex-thai-looped",
  display: "swap",
});
