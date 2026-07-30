import { ApprovalsClient } from "@/components/staff/approvals-client";
import { getCorrections } from "@/lib/data/queries";
import { requireStaff } from "@/lib/auth";

export default async function ApprovalsPage() {
  const [u, items] = await Promise.all([requireStaff(), getCorrections()]);
  const role = u.profile?.role;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">การอนุมัติ</h1>
      </header>

      <ApprovalsClient
        items={items}
        canApprove={role === "director"}
        canApply={role === "admin" || role === "director"}
      />
    </div>
  );
}
