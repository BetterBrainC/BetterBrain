import { Bell } from "lucide-react";
import { formatThaiDateTime } from "@/lib/date/buddhist";
import { EmptyState } from "@/components/ui/empty-state";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

/** Full notification list (shared by staff + employee notification pages). */
export function NotificationList({ items }: { items: NotificationItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon={Bell} title="ยังไม่มีการแจ้งเตือน" description="การแจ้งเตือนใหม่จะปรากฏที่นี่" />;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {items.map((n) => (
        <li key={n.id} className={n.read_at ? "px-4 py-3" : "bg-surface-tint px-4 py-3"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">{n.title}</p>
              {n.body && <p className="text-sm text-muted">{n.body}</p>}
            </div>
            {!n.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
          </div>
          <p className="mt-1 text-2xs text-faint">{formatThaiDateTime(n.created_at)}</p>
        </li>
      ))}
    </ul>
  );
}
