"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP } from "@/lib/i18n/th";
import { signOut } from "@/actions/auth";
import { STAFF_NAV, NavCountBadge, type NavCounts } from "@/components/shell/sidebar";
import type { Role } from "@/lib/auth";

/**
 * Mobile nav for the staff shell (Admin/Director). The desktop sidebar is
 * `hidden md:flex`, so on small screens this hamburger → drawer is the only nav.
 * Role-aware: director-only items are filtered exactly like the sidebar.
 */
export function StaffMobileNav({
  role,
  companyName,
  counts,
}: {
  role: Role | null | undefined;
  companyName?: string | null;
  counts?: NavCounts;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const items = STAFF_NAV.filter((i) => !i.directorOnly || role === "director");
  const totalBadge = (counts?.approvals ?? 0) + (counts?.bookings ?? 0);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="เมนู"
        onClick={() => setOpen(true)}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-border text-ink hover:bg-surface-tint"
      >
        <Menu className="h-5 w-5" />
        {totalBadge > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger-fg)] px-1 text-[10px] font-bold text-white">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={companyName || APP.name}>
        <nav aria-label="เมนูจัดการ" className="space-y-1">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== "/staff" && pathname.startsWith(`${href}/`));
            const count = badge && counts ? counts[badge] : 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-surface-tint text-primary-700" : "text-ink hover:bg-surface-tint",
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {label}
                <NavCountBadge count={count} />
              </Link>
            );
          })}
        </nav>
        <form action={signOut} className="mt-3 border-t border-border pt-3">
          <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-tint">
            <LogOut className="h-[18px] w-[18px]" aria-hidden /> ออกจากระบบ
          </button>
        </form>
      </Sheet>
    </div>
  );
}
