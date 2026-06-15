"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { ThaiDateInput } from "@/components/ui/thai-date-input";

/** Date-range attendance CSV export (links to the /staff/export/attendance route). */
export function ExportRange() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const href = `/staff/export/attendance?${params.toString()}`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
      <span className="text-sm font-medium text-muted">Export การเข้างาน:</span>
      <ThaiDateInput value={from} onChange={setFrom} className="h-9 text-sm" placeholder="จากวันที่" />
      <ThaiDateInput value={to} onChange={setTo} className="h-9 text-sm" placeholder="ถึงวันที่" />
      <a
        href={href}
        className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border px-3 text-sm font-medium text-ink hover:bg-surface-tint"
      >
        <Download className="h-4 w-4" /> ดาวน์โหลด CSV
      </a>
    </div>
  );
}
