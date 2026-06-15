"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { setPatientStatus, setCourseStatus } from "@/actions/patients";
import { PATIENT_STATUS_LABEL, COURSE_STATUS_LABEL } from "@/lib/i18n/th";

type PatientStatus = keyof typeof PATIENT_STATUS_LABEL;
type CourseStatus = keyof typeof COURSE_STATUS_LABEL;

/** Director/Admin controls on the patient detail page: status transitions + edit. */
export function PatientAdminControls({
  patientId,
  patientStatus,
  course,
}: {
  patientId: string;
  patientStatus: PatientStatus;
  course: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const [pStatus, setPStatus] = React.useState<PatientStatus>(patientStatus);
  const [cStatus, setCStatus] = React.useState<string>(course?.status ?? "");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  async function changePatient(next: PatientStatus) {
    setPStatus(next);
    setBusy(true);
    setMsg(null);
    const res = await setPatientStatus({ id: patientId, status: next });
    setBusy(false);
    setMsg(res);
    if (res.ok) router.refresh();
    else setPStatus(patientStatus);
  }

  async function changeCourse(next: CourseStatus) {
    if (!course) return;
    setCStatus(next);
    setBusy(true);
    setMsg(null);
    const res = await setCourseStatus({ courseId: course.id, patientId, status: next });
    setBusy(false);
    setMsg(res);
    if (res.ok) router.refresh();
    else setCStatus(course.status);
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">จัดการสถานะ</CardTitle>
        <Link href={`/staff/patients/${patientId}/edit`}>
          <Button size="sm" variant="secondary">
            <Pencil className="h-4 w-4" /> แก้ไขข้อมูล
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="สถานะผู้รับบริการ">
          <Select
            value={pStatus}
            disabled={busy}
            onChange={(e) => changePatient(e.target.value as PatientStatus)}
          >
            {(Object.keys(PATIENT_STATUS_LABEL) as PatientStatus[]).map((s) => (
              <option key={s} value={s}>{PATIENT_STATUS_LABEL[s]}</option>
            ))}
          </Select>
        </Field>
        <Field label="สถานะคอร์ส">
          <Select
            value={cStatus}
            disabled={busy || !course}
            onChange={(e) => changeCourse(e.target.value as CourseStatus)}
          >
            {!course && <option value="">— ไม่มีคอร์ส —</option>}
            {(Object.keys(COURSE_STATUS_LABEL) as CourseStatus[]).map((s) => (
              <option key={s} value={s}>{COURSE_STATUS_LABEL[s]}</option>
            ))}
          </Select>
        </Field>
      </div>
      {msg?.error && <p className="text-sm text-[var(--danger-fg)]">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-teal">บันทึกสถานะแล้ว</p>}
    </Card>
  );
}
