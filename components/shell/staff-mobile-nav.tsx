"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, LogOut } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP } from "@/lib/i18n/th";
import { signOut } from "@/actions/auth";
import { STAFF_NAV, NavCountBadge, type NavCounts } from "@/components/shell/sidebar";
import type { Role } from "@/lib/auth";

// The few items that get a dedicated bottom-bar slot; the rest live under "เมนู".
const PRIMARY = ["/staff", "/staff/assign", "/staff/patients", "/staff/approvals"];

/**
 * Staff bottom nav for small screens (the desktop sidebar is hidden < md).
 * Shows the primary items + a "เมนู" button that opens the full role-filtered list.
 * Role-aware: director-only items appear only for directors.
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
  const primary = PRIMARY.map((h) => items.find((i) => i.href === h)).filter(Boolean) as typeof items;
  const moreItems = items.filter((i) => !PRIMARY.includes(i.href));
  const moreBadge = moreItems.reduce((n, i) => n + (i.badge && counts ? counts[i.badge] : 0), 0);

  const badgeOf = (badge?: "approvals" | "bookings") => (badge && counts ? counts[badge] : 0);

  return (
    <>
      <nav
        aria-label="เมนูจัดการ"
        className="fixed inset-x-0 bottom-0 z-bottomnav border-t border-border bg-surface/95 backdrop-blur md:hidden"
        style={{ height: "var(--bottomnav-h)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex h-[var(--bottomnav-h)] items-stretch justify-around">
          {primary.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== "/staff" && pathname.startsWith(`${href}/`));
            const count = badgeOf(badge);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative flex h-full flex-col items-center justify-center gap-1 text-2xs font-medium", active ? "text-teal" : "text-faint")}
                >
                  {active && <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-full bg-teal" />}
                  <span className="relative">
                    <Icon className="h-5 w-5" aria-hidden />
                    {count > 0 && (
                      <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger-fg)] px-1 text-[10px] font-bold text-white">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative flex h-full w-full flex-col items-center justify-center gap-1 text-2xs font-medium text-faint"
            >
              <span className="relative">
                <MoreHorizontal className="h-5 w-5" aria-hidden />
                {moreBadge > 0 && <span className="absolute -right-2 -top-1.5 h-2 w-2 rounded-full bg-[var(--danger-fg)]" />}
              </span>
              เมนู
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onClose={() => setOpen(false)} title={companyName || APP.name}>
        <nav aria-label="เมนูทั้งหมด" className="space-y-1">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== "/staff" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-surface-tint text-primary-700" : "text-ink hover:bg-surface-tint")}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {label}
                <NavCountBadge count={badgeOf(badge)} />
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
    </>
  );
}
