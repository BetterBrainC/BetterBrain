import Link from "next/link";
import { PencilLine, ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountProfile } from "@/components/employee/account-profile";
import { InstallAppCard } from "@/components/shell/install-app-card";
import { signOut } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/data/queries";

// Leave system removed per client (3.pdf p.7); handled later in a unified HR module.
// "ขอแก้ไขเช็คอิน" is gated by a Director switch — staff only see it while it is
// switched on (client 30 ก.ค. 2569).
const CORRECTION_LINK = { href: "/app/corrections", label: "ขอแก้ไขเช็คอิน", icon: PencilLine };

export default async function AccountPage() {
  const [u, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const p = u?.profile;
  const links = settings.correctionsEnabled ? [CORRECTION_LINK] : [];

  return (
    <div className="space-y-5 px-[var(--gutter-page)] pt-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">บัญชี</h1>
      </header>

      <AccountProfile
        profile={{
          fullName: p?.full_name ?? "",
          phone: p?.phone ?? "",
          positionTitle: p?.position_title ?? "",
          licenseNo: p?.license_no ?? "",
          employeeCode: p?.employee_code ?? "",
          email: u?.email ?? "",
          photoUrl: p?.photo_url ?? null,
        }}
      />

      {/* Install first, notifications after — see InstallAppCard. */}
      <InstallAppCard />

      <div className="space-y-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 hover:bg-surface-tint"
          >
            <span className="flex items-center gap-3 text-sm font-medium text-ink">
              <Icon className="h-5 w-5 text-muted" /> {label}
            </span>
            <ChevronRight className="h-4 w-4 text-faint" />
          </Link>
        ))}
      </div>

      <form action={signOut}>
        <Button type="submit" variant="secondary" className="w-full">
          <LogOut className="h-4 w-4" /> ออกจากระบบ
        </Button>
      </form>
    </div>
  );
}
