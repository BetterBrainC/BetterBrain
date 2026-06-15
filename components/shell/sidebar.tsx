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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP } from "@/lib/i18n/th";
import { signOut } from "@/actions/auth";
import type { Role } from "@/lib/auth";

const ITEMS = [
  { href: "/staff", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/staff/bookings", label: "การจอง", icon: Inbox },
  { href: "/staff/assign", label: "มอบหมายงาน", icon: CalendarRange },
  { href: "/staff/approvals", label: "อนุมัติ", icon: CheckCircle2 },
  { href: "/staff/patients", label: "ผู้รับบริการ", icon: Users },
  { href: "/staff/employees", label: "รายชื่อพนักงาน", icon: UserCog },
  { href: "/staff/reports", label: "รายงาน", icon: FileText },
  // การวัดผล/KPI = Director-only (client v3); hidden from Admin in nav + page-guarded.
  { href: "/staff/measurement", label: "การวัดผล", icon: Activity, directorOnly: true },
  // Audit log = Director-only (append-only read), page-guarded by requireDirector.
  { href: "/staff/audit", label: "บันทึกการใช้งาน", icon: ScrollText, directorOnly: true },
  { href: "/staff/settings", label: "ตั้งค่า", icon: Settings },
];

/** Admin + Director desktop sidebar (shared shell). */
export function Sidebar({ role }: { role: Role | null | undefined }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.directorOnly || role === "director");
  return (
    <aside
      className="hidden shrink-0 border-r border-border bg-surface md:flex md:flex-col"
      style={{ width: "var(--sidebar-w)" }}
    >
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-navy font-display text-sm font-bold text-white">
          T
        </span>
        <div className="leading-tight">
          <p className="font-display text-base font-bold text-navy">{APP.name}</p>
          <p className="text-2xs text-muted">{APP.org}</p>
        </div>
      </div>
      <nav aria-label="เมนูจัดการ" className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/staff" && pathname.startsWith(`${href}/`));
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
