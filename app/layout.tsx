import type { Metadata, Viewport } from "next";
import { appFont } from "./fonts";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "@/components/shell/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TPM · Better Brain Rehab at Home",
    template: "%s · TPM",
  },
  description:
    "ระบบหลังบ้านจัดการพนักงานและคอร์สกายภาพบำบัด — Better Brain Rehab at Home",
  applicationName: "TPM",
  manifest: "/manifest.webmanifest",
  // iOS ignores the manifest icons — it reads apple-touch-icon for the home screen.
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TPM" },
};

export const viewport: Viewport = {
  themeColor: "#2F7FF6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // keep the PWA chrome stable for check-in flows
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={appFont.variable}>
      <body className="min-h-dvh bg-bg font-sans text-ink antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
