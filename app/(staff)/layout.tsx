import { Sidebar } from "@/components/shell/sidebar";
import { NotificationBell } from "@/components/shell/notification-bell";
import { requireStaff } from "@/lib/auth";
import { getNotifications, getSettings } from "@/lib/data/queries";

/** Admin + Director shared shell: desktop sidebar + content area. */
export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();
  const [notes, settings] = await Promise.all([getNotifications(), getSettings()]);
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar role={user.profile?.role} logoUrl={settings.logoUrl} companyName={settings.companyName} />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header
          className="sticky top-0 z-sticky flex items-center justify-end gap-2 border-b border-border bg-surface/95 px-[var(--gutter-page)] backdrop-blur"
          style={{ height: "var(--header-h)" }}
        >
          <NotificationBell items={notes} />
        </header>
        <main className="mx-auto w-full max-w-content px-[var(--gutter-page)] py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
