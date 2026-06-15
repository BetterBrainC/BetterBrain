import { NotificationList } from "@/components/shell/notification-list";
import { getNotifications } from "@/lib/data/queries";

export default async function EmployeeNotificationsPage() {
  const items = await getNotifications();
  return (
    <div className="space-y-5 px-[var(--gutter-page)] pt-6">
      <h1 className="font-display text-2xl font-bold text-navy">การแจ้งเตือน</h1>
      <NotificationList items={items} />
    </div>
  );
}
