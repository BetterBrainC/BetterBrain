"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { EMPLOYEE_NAV } from "@/components/shell/bottom-nav";

/** Desktop horizontal nav for the employee shell (hidden on mobile → bottom bar). */
export function EmployeeTopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 md:flex">
      {EMPLOYEE_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/app" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-surface-tint text-primary-700" : "text-muted hover:bg-surface-tint hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
