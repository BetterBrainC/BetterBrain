"use client";

import * as React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatThaiDateTime } from "@/lib/date/buddhist";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import type { NotificationItem } from "@/components/shell/notification-list";

/** Notification bell + popover. Optimistically clears unread on click / "อ่านทั้งหมด". */
export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = React.useState(false);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [, start] = React.useTransition();

  // Server state is the source of truth after revalidate — drop optimistic ids.
  React.useEffect(() => {
    setReadIds(new Set());
  }, [items]);

  const isRead = React.useCallback(
    (n: NotificationItem) => Boolean(n.read_at) || readIds.has(n.id),
    [readIds],
  );
  const unread = items.filter((n) => !isRead(n)).length;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function readOne(n: NotificationItem) {
    if (isRead(n)) return;
    setReadIds((s) => new Set(s).add(n.id));
    start(() => {
      void markNotificationRead(n.id);
    });
  }

  function readAll() {
    if (unread === 0) return;
    setReadIds(new Set(items.map((n) => n.id)));
    start(() => {
      void markAllNotificationsRead();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`การแจ้งเตือน${unread ? ` (${unread} ใหม่)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-md text-muted hover:bg-surface-tint"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-2xs font-bold text-[var(--text-on-accent)]">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-overlay" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-modal mt-2 w-80 overflow-hidden rounded-lg border border-border bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-navy">การแจ้งเตือน</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={readAll}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> อ่านทั้งหมด
                </button>
              )}
            </div>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {items.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted">ยังไม่มีการแจ้งเตือน</li>
              )}
              {items.map((n) => {
                const read = isRead(n);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => readOne(n)}
                      className={
                        "flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left " +
                        (read ? "" : "bg-surface-tint")
                      }
                    >
                      <span className="flex w-full items-start justify-between gap-2">
                        <span className="text-sm font-medium text-ink">{n.title}</span>
                        {!read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      </span>
                      {n.body && <span className="text-xs text-muted">{n.body}</span>}
                      <span className="text-2xs text-faint">{formatThaiDateTime(n.created_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
