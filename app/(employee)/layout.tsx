import Link from "next/link";
import { BottomNav } from "@/components/shell/bottom-nav";
import { NotificationBell } from "@/components/shell/notification-bell";
import { OnlineBadge } from "@/components/offline/online-badge";
import { APP } from "@/lib/i18n/th";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data/queries";

/** Employee PWA shell: slim header, mobile-first body, bottom nav. */
export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const notes = await getNotifications();
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom))]">
      <header
        className="sticky top-0 z-sticky flex items-center justify-between border-b border-border bg-surface/95 px-[var(--gutter-page)] backdrop-blur"
        style={{ height: "var(--header-h)" }}
      >
        <Link href="/app" className="font-display text-base font-bold text-navy">
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
