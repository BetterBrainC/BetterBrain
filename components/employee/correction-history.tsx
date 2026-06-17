import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ThaiDate } from "@/components/ui/thai-date";
import type { MyCorrection } from "@/lib/data/queries";

const STATUS: Record<string, { label: string; tone: "info" | "completed" | "nocheckin" | "late" }> = {
  pending: { label: "รออนุมัติ", tone: "late" },
  approved: { label: "อนุมัติแล้ว · รอ Admin", tone: "info" },
  applied: { label: "ดำเนินการแล้ว", tone: "completed" },
  rejected: { label: "ไม่อนุมัติ", tone: "nocheckin" },
  cancelled: { label: "ยกเลิก", tone: "nocheckin" },
};

/** Read-only history of the employee's own correction requests. */
export function CorrectionHistory({ items }: { items: MyCorrection[] }) {
  return (
    <section className="space-y-2 px-[var(--gutter-page)] pb-8">
      <h2 className="text-sm font-semibold text-muted">คำขอของฉัน</h2>
      {items.length === 0 ? (
        <EmptyState icon={History} title="ยังไม่มีคำขอแก้ไข" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {items.map((c) => {
            const st = STATUS[c.status] ?? { label: c.status, tone: "info" as const };
            return (
              <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{c.patientName}</p>
                  <p className="truncate text-xs text-muted">{c.reason}</p>
                  <p className="mt-0.5 text-2xs text-faint"><ThaiDate value={c.createdAt} /></p>
                </div>
                <Badge tone={st.tone}>{st.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
