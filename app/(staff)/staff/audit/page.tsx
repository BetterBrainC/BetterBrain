import { ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireDirector } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data/queries";
import { AUDIT_ACTION_LABEL, ROLE_LABEL } from "@/lib/i18n/th";
import { formatThaiDate, formatThaiTime } from "@/lib/date/buddhist";

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
                <th className="px-4 py-2.5 font-medium">เวลา</th>
                <th className="px-4 py-2.5 font-medium">ผู้ทำรายการ</th>
                <th className="px-4 py-2.5 font-medium">การกระทำ</th>
                <th className="px-4 py-2.5 font-medium">รายการ</th>
                <th className="px-4 py-2.5 font-medium">ฟิลด์ที่เปลี่ยน</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
                    {formatThaiDate(l.occurredAt)} · {formatThaiTime(l.occurredAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-ink">{l.actorName}</span>
                    {l.actorRole && (
                      <span className="ml-1 text-2xs text-faint">({ROLE_LABEL[l.actorRole as keyof typeof ROLE_LABEL] ?? l.actorRole})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={ACTION_TONE[l.action] ?? "neutral"}>
                      {AUDIT_ACTION_LABEL[l.action] ?? l.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {l.entity ?? "—"}
                    {l.entityId && <span className="ml-1 text-faint">#{l.entityId.slice(0, 8)}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {l.changedCols && l.changedCols.length ? l.changedCols.join(", ") : "—"}
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
