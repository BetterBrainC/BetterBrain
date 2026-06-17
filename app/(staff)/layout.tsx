import Link from "next/link";
import { Sidebar } from "@/components/shell/sidebar";
import { StaffMobileNav } from "@/components/shell/staff-mobile-nav";
import { NotificationBell } from "@/components/shell/notification-bell";
import { APP } from "@/lib/i18n/th";
import { requireStaff } from "@/lib/auth";
import { getNotifications, getSettings, getNavCounts } from "@/lib/data/queries";

/** Admin + Director shared shell: desktop sidebar + content area. */
export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();
  const [notes, settings, counts] = await Promise.all([getNotifications(), getSettings(), getNavCounts()]);
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar role={user.profile?.role} logoUrl={settings.logoUrl} companyName={settings.companyName} counts={counts} />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header
          className="sticky top-0 z-sticky flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-[var(--gutter-page)] backdrop-blur"
          style={{ height: "var(--header-h)" }}
        >
          {/* Brand on mobile (sidebar provides it on desktop). */}
          <Link href="/staff" className="flex items-center gap-2 font-display text-base font-bold text-navy md:hidden">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.companyName || APP.name} className="h-7 w-7 rounded object-contain" />
            ) : null}
            {settings.companyName || APP.name}
          </Link>
          <div className="ml-auto">
            <NotificationBell items={notes} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-content px-[var(--gutter-page)] py-6 pb-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom)+1rem)] md:pb-6">
          {children}
        </main>
      </div>
      <StaffMobileNav role={user.profile?.role} companyName={settings.companyName} counts={counts} />
    </div>
  );
}
