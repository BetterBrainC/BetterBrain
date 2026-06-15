"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, MapPin, Activity, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/app", label: "หน้าหลัก", icon: Home },
  { href: "/app/schedule", label: "นัดหมาย", icon: CalendarDays },
  { href: "/app/check-in", label: "เช็คอิน", icon: MapPin },
  { href: "/app/measurement", label: "การวัดผล", icon: Activity },
  { href: "/app/account", label: "บัญชี", icon: User },
];

/** Employee PWA bottom nav — active item gets the teal accent (OOCA behavior). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-bottomnav border-t border-border bg-surface/95 backdrop-blur"
      style={{ height: "var(--bottomnav-h)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-[var(--bottomnav-h)] max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-2xs font-medium",
                  active ? "text-teal" : "text-faint",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 top-0 h-[3px] rounded-full bg-teal"
                  />
                )}
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
