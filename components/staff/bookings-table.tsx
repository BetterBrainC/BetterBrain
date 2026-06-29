"use client";

import * as React from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConvertBookingSheet } from "@/components/staff/convert-booking-sheet";
import { cancelBooking } from "@/actions/bookings";
import { BOOKING_STATUS_LABEL } from "@/lib/i18n/th";
import { ThaiDateTime } from "@/components/ui/thai-date";
import type { BookingLite } from "@/lib/data/queries";

type EmpOpt = { id: string; name: string; code: string | null };

const TONE: Record<BookingLite["status"], "info" | "late" | "nocheckin"> = {
  booked: "info",
  awaiting_payment: "late",
  cancelled: "nocheckin",
};
const FILTERS: { key: BookingLite["status"] | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "booked", label: "ทำนัดแล้ว" },
  { key: "awaiting_payment", label: "รอชำระเงิน" },
  { key: "cancelled", label: "ยกเลิก" },
];

export function BookingsTable({
  bookings,
  employees,
}: {
  bookings: BookingLite[];
  employees: EmpOpt[];
}) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<BookingLite["status"] | "all">("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [sheetBookingId, setSheetBookingId] = React.useState<string | null>(null);
  const [, start] = React.useTransition();

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

  const activeBooking = bookings.find((b) => b.id === sheetBookingId) ?? null;

  function cancel(id: string) {
    if (!window.confirm("ยกเลิกการจองนี้?")) return;
    setBusyId(id);
    start(async () => {
      await cancelBooking({ id });
      setBusyId(null);
    });
  }

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
          <EmptyState icon={Inbox} title="ไม่พบการจอง" description="ลองปรับคำค้นหาหรือตัวกรอง" />
        ) : (
          <DataTable headers={["ชื่อ-สกุล", "โทรศัพท์", "พื้นที่", "เมื่อ", "สถานะ", ""]}>
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-surface-tint">
                <Td className="font-medium text-navy">{b.full_name}</Td>
                <Td className="tabular-nums text-muted">{b.phone}</Td>
                <Td>{b.area ?? "—"}</Td>
                <Td className="text-muted"><ThaiDateTime value={b.created_at} /></Td>
                <Td><Badge tone={TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge></Td>
                <Td>
                  {b.status !== "cancelled" && (
                    <div className="flex justify-end gap-2">
                      {b.patient_id ? (
                        <Link
                          href={`/staff/patients/${b.patient_id}`}
                          className="inline-flex h-8 items-center rounded-md bg-surface-tint px-3 text-xs font-medium text-primary hover:bg-primary/10"
                        >
                          ดูผู้รับบริการ
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="tonal"
                          onClick={() => setSheetBookingId(b.id)}
                        >
                          แปลงเป็นผู้รับบริการ
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === b.id}
                        onClick={() => cancel(b.id)}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>

      {activeBooking && (
        <ConvertBookingSheet
          bookingId={activeBooking.id}
          fullName={activeBooking.full_name}
          phone={activeBooking.phone}
          area={activeBooking.area}
          employees={employees}
          open={sheetBookingId === activeBooking.id}
          onOpenChange={(open) => { if (!open) setSheetBookingId(null); }}
        />
      )}
    </>
  );
}
