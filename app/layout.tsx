import type { Metadata, Viewport } from "next";
import { appFont } from "./fonts";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "@/components/shell/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TPM · Better Brain Swallow Rehab",
    template: "%s · TPM",
  },
  description:
    "ระบบหลังบ้านจัดการพนักงานและคอร์สกายภาพบำบัด — Better Brain · Swallow Rehab",
  applicationName: "TPM",
  manifest: "/manifest.webmanifest",
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
