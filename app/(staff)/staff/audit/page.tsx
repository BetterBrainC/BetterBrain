import { ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireDirector } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data/queries";
import { AUDIT_ACTION_LABEL, ROLE_LABEL } from "@/lib/i18n/th";
import { ThaiDateTime } from "@/components/ui/thai-date";

export const metadata = { title: "บันทึกการใช้งาน" };

const ACTION_TONE: Record<string, "completed" | "late" | "nocheckin" | "info" | "neutral"> = {
  login: "neutral", logout: "neutral", create: "completed", update: "info",
  delete: "nocheckin", check_in: "completed", check_out: "info", approve: "completed",
  reject: "nocheckin", apply_correction: "info", password_change: "late", export: "info",
};

/** Director-only append-only audit trail (who / what / when + changed columns). */
export default async function AuditPage() {
  await requireDirector();
  const logs = await getAuditLogs();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-navy">บันทึกการใช้งาน (Audit log)</h1>
        <p className="text-sm text-muted">บันทึกแบบเพิ่มอย่างเดียว · เห็นเฉพาะ Director · 100 รายการล่าสุด</p>
      </header>

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="ยังไม่มีบันทึก" description="กิจกรรมในระบบจะถูกบันทึกที่นี่" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">วันที่/เวลา</th>
                <th className="px-4 py-2.5 font-medium">ผู้ใช้งาน</th>
                <th className="px-4 py-2.5 font-medium">บทบาท</th>
                <th className="px-4 py-2.5 font-medium">การดำเนินการ</th>
                <th className="px-4 py-2.5 font-medium">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
                    <ThaiDateTime value={l.occurredAt} />
                  </td>
                  <td className="px-4 py-2.5 text-ink">{l.actorName}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {l.actorRole ? (ROLE_LABEL[l.actorRole as keyof typeof ROLE_LABEL] ?? l.actorRole) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={ACTION_TONE[l.action] ?? "neutral"}>
                      {AUDIT_ACTION_LABEL[l.action] ?? l.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {l.entity ?? "—"}
                    {l.entityId && <span className="ml-1 text-faint">#{l.entityId.slice(0, 8)}</span>}
                    {l.changedCols && l.changedCols.length > 0 && (
                      <span className="ml-1 text-faint">· {l.changedCols.join(", ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
