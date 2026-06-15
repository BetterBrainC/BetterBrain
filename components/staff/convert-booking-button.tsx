"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { convertBookingToPatient } from "@/actions/bookings";

/** Converts a booking into a patient (two-step confirm), then redirects. */
export function ConvertBookingButton({ bookingId }: { bookingId: string }) {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, start] = React.useTransition();

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => start(() => { void convertBookingToPatient(bookingId); })}
        >
          {pending ? "กำลังแปลง…" : "ยืนยัน"}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
          ยกเลิก
        </Button>
      </span>
    );
  }

  return (
    <Button size="sm" variant="tonal" onClick={() => setConfirming(true)}>
      แปลงเป็นผู้รับบริการ
    </Button>
  );
}
