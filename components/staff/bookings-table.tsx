"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookingStatusSheet } from "@/components/staff/booking-status-sheet";
import { BOOKING_STATUS_LABEL } from "@/lib/i18n/th";
import { ThaiDateTime } from "@/components/ui/thai-date";
import type { BookingLite } from "@/lib/data/queries";

type EmpOpt = { id: string; name: string; code: string | null };

const TONE: Record<BookingLite["status"], "info" | "late" | "hold" | "nocheckin"> = {
  booked: "info",
  awaiting_payment: "late",
  awaiting_appointment: "hold",
  cancelled: "nocheckin",
};

// ทำนัดแล้ว lives on the ผู้รับบริการ page, so it is not a filter here.
const FILTERS: { key: BookingLite["status"] | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "awaiting_payment", label: "รอชำระเงิน" },
  { key: "awaiting_appointment", label: "รอทำนัด" },
  { key: "cancelled", label: "ยกเลิกนัด" },
];

// Recipients that can still be moved along the pipeline get a เปลี่ยนสถานะ button.
const CHANGEABLE: BookingLite["status"][] = ["awaiting_payment", "awaiting_appointment"];

export function BookingsTable({
  bookings,
  employees,
}: {
  bookings: BookingLite[];
  employees: EmpOpt[];
}) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<BookingLite["status"] | "all">("all");
  const [sheetId, setSheetId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    for (const b of bookings) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [bookings]);

  const term = q.trim().toLowerCase();
  const filtered = bookings.filter(
    (b) =>
      (filter === "all" || b.status === filter) &&
      (!term || b.full_name.toLowerCase().includes(term) || (b.phone ?? "").includes(term)),
  );

  const active = bookings.find((b) => b.id === sheetId) ?? null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา ชื่อ / เบอร์โทร"
            className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors " +
                (filter === f.key ? "bg-primary text-white" : "bg-surface-tint text-muted hover:bg-surface-sunken")
              }
            >
              {f.label} {counts[f.key] ? `(${counts[f.key]})` : ""}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Inbox} title="ไม่พบรายการ" description="ลองปรับคำค้นหาหรือตัวกรอง" />
        ) : (
          <DataTable headers={["ชื่อ-สกุล", "โทรศัพท์", "พื้นที่บริการ", "วันและเวลานัด", "สถานะ", ""]}>
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-surface-tint">
                <Td className="font-medium text-navy">{b.full_name}</Td>
                <Td className="tabular-nums text-muted">{b.phone || "—"}</Td>
                <Td>{b.area ?? "—"}</Td>
                <Td className="text-muted"><ThaiDateTime value={b.created_at} /></Td>
                <Td><Badge tone={TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge></Td>
                <Td>
                  {CHANGEABLE.includes(b.status) && (
                    <div className="flex justify-end">
                      <Button size="sm" variant="tonal" onClick={() => setSheetId(b.id)}>
                        เปลี่ยนสถานะ
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>

      {active && (
        <BookingStatusSheet
          patientId={active.id}
          fullName={active.full_name}
          currentStatus={active.status}
          employees={employees}
          open={sheetId === active.id}
          onOpenChange={(open) => { if (!open) setSheetId(null); }}
        />
      )}
    </>
  );
}
