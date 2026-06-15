"use client";

import * as React from "react";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { approveCorrection, rejectCorrection, applyCorrection } from "@/actions/approvals";
import type { CorrectionItem } from "@/lib/data/queries";

export function ApprovalsClient({
  items,
  canApprove,
  canApply,
}: {
  items: CorrectionItem[];
  canApprove: boolean; // director
  canApply: boolean; // admin
}) {
  // Track the row currently submitting so only its button spins.
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [, start] = React.useTransition();

  function run(id: string, fn: (id: string) => Promise<void>) {
    setBusyId(id);
    start(async () => {
      await fn(id);
      setBusyId(null);
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted">คำขอแก้ไขเช็คอิน</h2>
      {items.length === 0 && (
        <EmptyState icon={CheckCircle2} title="ไม่มีคำขอแก้ไข" description="คำขอแก้ไขเช็คอินจากพนักงานจะปรากฏที่นี่" />
      )}
      {items.map((c) => {
        const busy = busyId === c.id;
        return (
          <Card key={c.id} className="space-y-3">
            <div>
              <p className="font-semibold text-navy">{c.employeeName}</p>
              <p className="text-sm text-muted">{c.patientName} · {c.dateLabel}</p>
              <p className="text-xs text-faint">{c.reason}</p>
            </div>

            {c.changes.length > 0 && (
              <dl className="space-y-1 rounded-md bg-surface-tint p-3 text-xs">
                {c.changes.map((ch, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <dt className="w-28 shrink-0 text-muted">{ch.label}</dt>
                    <dd className="flex flex-1 items-center gap-1.5 text-ink">
                      <span className="text-faint line-through">{ch.before ?? "—"}</span>
                      <ArrowRight className="h-3 w-3 text-muted" />
                      <span className="font-medium">{ch.after ?? "—"}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {c.status === "pending" ? (
              <div className="flex gap-2">
                {canApprove ? (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => run(c.id, approveCorrection)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} อนุมัติ (Director)
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(c.id, rejectCorrection)}>
                      ไม่อนุมัติ
                    </Button>
                  </>
                ) : (
                  <Badge tone="info">รอ Director อนุมัติ</Badge>
                )}
              </div>
            ) : c.status === "rejected" ? (
              <Badge tone="nocheckin">ไม่อนุมัติ</Badge>
            ) : c.status === "approved" ? (
              <div className="flex items-center gap-2">
                <Badge tone="info">อนุมัติแล้ว · รอ Admin</Badge>
                {canApply && (
                  <Button size="sm" variant="tonal" disabled={busy} onClick={() => run(c.id, applyCorrection)}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Admin ดำเนินการแก้ไข
                  </Button>
                )}
              </div>
            ) : c.status === "cancelled" ? (
              <Badge tone="neutral">ยกเลิกแล้ว</Badge>
            ) : (
              <Badge tone="completed">ดำเนินการแล้ว</Badge>
            )}
          </Card>
        );
      })}
    </section>
  );
}
