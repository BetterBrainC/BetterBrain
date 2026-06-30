"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  CheckCircle2,
  Users,
  UserCog,
  FileText,
  Settings,
  Inbox,
  Activity,
  ScrollText,
  BarChart3,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP } from "@/lib/i18n/th";
import { signOut } from "@/actions/auth";
import type { Role } from "@/lib/auth";

/** Shared staff nav items (sidebar on desktop, drawer on mobile). directorOnly
 *  items are hidden from Admin in the nav AND page-guarded server-side. */
export type NavBadge = "approvals" | "bookings";
export interface NavCounts {
  approvals: number;
  bookings: number;
}

export const STAFF_NAV: { href: string; label: string; icon: typeof LayoutDashboard; directorOnly?: boolean; badge?: NavBadge }[] = [
  { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/bookings", label: "การทำนัด", icon: Inbox, badge: "bookings" },
  { href: "/staff/assign", label: "มอบหมายงาน", icon: CalendarRange },
  { href: "/staff/approvals", label: "การอนุมัติ", icon: CheckCircle2, badge: "approvals" },
  { href: "/staff/patients", label: "ผู้รับบริการ", icon: Users },
  { href: "/staff/employees", label: "รายชื่อพนักงาน", icon: UserCog },
  { href: "/staff/reports", label: "บันทึกรายงาน", icon: FileText },
  { href: "/staff/work-summary", label: "สรุปการทำงาน", icon: BarChart3 },
  { href: "/staff/measurement", label: "ตัวชี้วัด", icon: Activity, directorOnly: true },
  { href: "/staff/audit", label: "บันทึกการใช้งาน", icon: ScrollText, directorOnly: true },
  { href: "/staff/settings", label: "ตั้งค่า", icon: Settings, directorOnly: true },
];

const ITEMS = STAFF_NAV;

/** Small count pill shown on nav items with pending work. */
export function NavCountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--danger-fg)] px-1.5 text-2xs font-bold text-white tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Admin + Director desktop sidebar (shared shell). */
export function Sidebar({
  role,
  logoUrl,
  companyName,
  counts,
}: {
  role: Role | null | undefined;
  logoUrl?: string | null;
  companyName?: string | null;
  counts?: NavCounts;
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.directorOnly || role === "director");
  return (
    <aside
      className="hidden shrink-0 border-r border-border bg-surface md:flex md:flex-col"
      style={{ width: "var(--sidebar-w)" }}
    >
      <div className="flex items-center gap-2 px-5 py-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName || APP.name} width={36} height={36} className="h-9 w-9 rounded-md object-contain" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-md bg-navy font-display text-sm font-bold text-white">
            T
          </span>
        )}
        <div className="leading-tight">
          <p className="font-display text-base font-bold text-navy">{companyName || APP.name}</p>
          <p className="text-2xs text-muted">{APP.org}</p>
        </div>
      </div>
      <nav aria-label="เมนูจัดการ" className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active =
            pathname === href ||
            (href !== "/staff" && pathname.startsWith(`${href}/`));
          const count = badge && counts ? counts[badge] : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-surface-tint text-primary-700"
                  : "text-ink hover:bg-surface-tint",
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {label}
              <NavCountBadge count={count} />
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="border-t border-border p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-tint"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden />
          ออกจากระบบ
        </button>
      </form>
    </aside>
  );
}
