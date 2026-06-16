import Link from "next/link";
import { BottomNav } from "@/components/shell/bottom-nav";
import { NotificationBell } from "@/components/shell/notification-bell";
import { OnlineBadge } from "@/components/offline/online-badge";
import { APP } from "@/lib/i18n/th";
import { requireUser } from "@/lib/auth";
import { getNotifications, getSettings } from "@/lib/data/queries";

/** Employee PWA shell: slim header, mobile-first body, bottom nav. */
export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const [notes, settings] = await Promise.all([getNotifications(), getSettings()]);
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom))]">
      <header
        className="sticky top-0 z-sticky flex items-center justify-between border-b border-border bg-surface/95 px-[var(--gutter-page)] backdrop-blur"
        style={{ height: "var(--header-h)" }}
      >
        <Link href="/app" className="flex items-center gap-2 font-display text-base font-bold text-navy">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.companyName || APP.name} className="h-7 w-7 rounded object-contain" />
          ) : null}
          {APP.name}
        </Link>
        <NotificationBell items={notes} />
      </header>
      <OnlineBadge />
      {children}
      <BottomNav />
    </div>
  );
}
