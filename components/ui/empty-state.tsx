import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/** Illustration-led empty state (OOCA rule) — one primitive for all "no data"
 *  surfaces. Swap `icon` per context; pass `action` for a CTA. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <Icon className="mx-auto mb-3 h-7 w-7 text-faint" aria-hidden />
      <p className="text-sm font-semibold text-navy">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
