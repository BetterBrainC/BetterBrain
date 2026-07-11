"use client";

import * as React from "react";
import { CheckCircle2, Loader2, ArrowRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { approveCorrection, rejectCorrection, applyCorrection } from "@/actions/approvals";
import { formatThaiDateTime } from "@/lib/date/buddhist";
import type { CorrectionItem } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

type Status = CorrectionItem["status"];

// Chip order doubles as the actionable-first sort priority.
const STATUS_META: { key: Status; label: string }[] = [
  { key: "pending", label: "รอ Director" },
  { key: "approved", label: "รอ Admin" },
  { key: "applied", label: "ดำเนินการแล้ว" },
  { key: "rejected", label: "ไม่อนุมัติ" },
  { key: "cancelled", label: "ยกเลิก" },
];
const PRIORITY = Object.fromEntries(STATUS_META.map((s, i) => [s.key, i])) as Record<Status, number>;

const PAGE_SIZE = 10;

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
  const [err, setErr] = React.useState<string | null>(null);
  const [, start] = React.useTransition();

  const [status, setStatus] = React.useState<Status | "all">("all");
  const [employee, setEmployee] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [limit, setLimit] = React.useState(PAGE_SIZE);

  function run(id: string, fn: (id: string) => Promise<{ error?: string } | void>) {
    setBusyId(id);
    setErr(null);
    start(async () => {
      const res = await fn(id);
      if (res && "error" in res && res.error) setErr(res.error);
      setBusyId(null);
    });
  }

  const employees = React.useMemo(
    () => Array.from(new Set(items.map((c) => c.employeeName))).sort((a, b) => a.localeCompare(b, "th")),
    [items],
  );

  // Search + employee narrow the base set; status chips count within it.
  const needle = q.trim().toLowerCase();
  const base = items.filter((c) => {
    if (employee !== "all" && c.employeeName !== employee) return false;
    if (!needle) return true;
    return [c.employeeName, c.patientName, c.reason, c.dateLabel].some((s) => s.toLowerCase().includes(needle));
  });
  const countOf = (s: Status) => base.filter((c) => c.status === s).length;

  const filtered = base
    .filter((c) => status === "all" || c.status === status)
    // งานที่ต้องทำ (รอ Director → รอ Admin) ขึ้นก่อน แล้วค่อยใหม่→เก่า
    .sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || b.createdAt.localeCompare(a.createdAt));
  const visible = filtered.slice(0, limit);

  const pick = (fn: () => void) => {
    fn();
    setLimit(PAGE_SIZE);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted">คำขอแก้ไขเช็คอิน</h2>

      {/* Filters: status chips (with live counts) + employee + free search. */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="กรองตามสถานะ">
          <button
            type="button"
            role="tab"
            aria-selected={status === "all"}
            onClick={() => pick(() => setStatus("all"))}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              status === "all" ? "bg-primary text-white" : "bg-surface-tint text-ink hover:bg-surface-sunken",
            )}
          >
            ทั้งหมด ({base.length})
          </button>
          {STATUS_META.map((s) => {
            const n = countOf(s.key);
            if (n === 0 && status !== s.key) return null;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={status === s.key}
                onClick={() => pick(() => setStatus(s.key))}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  status === s.key ? "bg-primary text-white" : "bg-surface-tint text-ink hover:bg-surface-sunken",
                )}
              >
                {s.label} ({n})
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={employee}
            onChange={(e) => pick(() => setEmployee(e.target.value))}
            aria-label="กรองตามพนักงาน"
            className="h-9 max-w-56 rounded-md border border-border bg-surface px-2 text-sm text-ink focus:border-primary"
          >
            <option value="all">พนักงานทุกคน</option>
            {employees.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <label className="relative min-w-0 flex-1 sm:max-w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => pick(() => setQ(e.target.value))}
              placeholder="ค้นหา พนักงาน / ผู้รับบริการ / เหตุผล"
              aria-label="ค้นหาคำขอแก้ไข"
              className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      </div>

      {err && <p className="text-sm text-[var(--danger-fg)]">{err}</p>}

      {items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="ไม่มีคำขอแก้ไข" description="คำขอแก้ไขเช็คอินจากพนักงานจะปรากฏที่นี่" />
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">ไม่พบคำขอที่ตรงกับตัวกรอง</p>
      ) : (
        <>
          <p className="text-xs text-faint">แสดง {visible.length} จาก {filtered.length} รายการ</p>
          {visible.map((c) => {
            const busy = busyId === c.id;
            return (
              <Card key={c.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{c.employeeName}</p>
                    <p className="text-sm text-muted">{c.patientName} · {c.dateLabel}</p>
                    <p className="text-xs text-faint">{c.reason}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {c.status === "pending" && <Badge tone="hold">รอ Director</Badge>}
                    {c.status === "approved" && <Badge tone="info">รอ Admin</Badge>}
                    {c.status === "applied" && <Badge tone="completed">ดำเนินการแล้ว</Badge>}
                    {c.status === "rejected" && <Badge tone="nocheckin">ไม่อนุมัติ</Badge>}
                    {c.status === "cancelled" && <Badge tone="neutral">ยกเลิกแล้ว</Badge>}
                    <p className="mt-1 text-2xs text-faint">ยื่นเมื่อ {formatThaiDateTime(c.createdAt)}</p>
                  </div>
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
                  canApprove ? (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => run(c.id, approveCorrection)}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} อนุมัติ (Director)
                      </Button>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(c.id, rejectCorrection)}>
                        ไม่อนุมัติ
                      </Button>
                    </div>
                  ) : null
                ) : c.status === "approved" && canApply ? (
                  <Button size="sm" variant="tonal" disabled={busy} onClick={() => run(c.id, applyCorrection)}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Admin ดำเนินการแก้ไข
                  </Button>
                ) : null}
              </Card>
            );
          })}
          {filtered.length > limit && (
            <Button variant="secondary" className="w-full" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
              แสดงเพิ่มอีก (เหลือ {filtered.length - limit} รายการ)
            </Button>
          )}
        </>
      )}
    </section>
  );
}
