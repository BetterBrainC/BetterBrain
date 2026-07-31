"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AssignModal } from "@/components/staff/assign-modal";
import { SubstituteModal } from "@/components/staff/substitute-modal";
import { SchedulingCalendar } from "@/components/staff/scheduling-calendar";
import type { CalendarSession } from "@/lib/data/queries";

type Opt = { id: string; name: string };
type EmpOpt = { id: string; name: string; code: string | null };
type SessionOpt = { id: string; label: string };

/**
 * Client shell for the มอบหมายงาน page: owns the assign-sheet state so the
 * header button AND clicking an empty calendar day both open the same
 * AssignModal (the day click prefills that date).
 */
export function AssignBoard({
  sessions,
  patients,
  employees,
  upcoming,
}: {
  sessions: CalendarSession[];
  patients: Opt[];
  employees: EmpOpt[];
  upcoming: SessionOpt[];
}) {
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignDate, setAssignDate] = React.useState<string | undefined>(undefined);

  function openCreate(iso?: string) {
    setAssignDate(iso);
    setAssignOpen(true);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">มอบหมายงาน</h1>
          <p className="text-sm text-muted">
          </p>
        </div>
        <div className="flex gap-2">
          <SubstituteModal employees={employees} sessions={upcoming} />
          <Button onClick={() => openCreate()}>+ มอบหมายงาน</Button>
        </div>
      </header>

      <SchedulingCalendar sessions={sessions} employees={employees} onCreateForDate={openCreate} />

      <AssignModal
        patients={patients}
        employees={employees}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        initialDate={assignDate}
      />
    </div>
  );
}
