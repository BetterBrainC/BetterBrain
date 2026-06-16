"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Share2, Copy, Check } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { setPatientStatus, setCourseStatus } from "@/actions/patients";
import { createRelativeShareLink } from "@/actions/portal";
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
  const [shareLink, setShareLink] = React.useState<string | null>(null);
  const [shareBusy, setShareBusy] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);
  const [shareErr, setShareErr] = React.useState<string | null>(null);

  async function genShareLink() {
    setShareBusy(true);
    setShareErr(null);
    setShareCopied(false);
    const res = await createRelativeShareLink(patientId);
    setShareBusy(false);
    if (res.error || !res.token) return setShareErr(res.error ?? "สร้างลิงก์ไม่สำเร็จ");
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setShareLink(`${base}/r/${res.token}`);
  }

  async function copyShareLink() {
    if (!shareLink || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
    } catch {
      setShareCopied(false);
    }
  }

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">จัดการสถานะ</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={genShareLink} disabled={shareBusy}>
            <Share2 className="h-4 w-4" /> {shareBusy ? "กำลังสร้าง…" : "แชร์ลิงก์ญาติ"}
          </Button>
          <Link href={`/staff/patients/${patientId}/edit`}>
            <Button size="sm" variant="secondary">
              <Pencil className="h-4 w-4" /> แก้ไขข้อมูล
            </Button>
          </Link>
        </div>
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

      {shareErr && <p className="text-sm text-[var(--danger-fg)]">{shareErr}</p>}
      {shareLink && (
        <div className="space-y-2 rounded-md bg-surface-tint p-3">
          <p className="text-xs text-muted">ลิงก์พอร์ทัลญาติ · เปิดดูได้โดยยืนยันเบอร์ 4 ตัวท้ายของผู้รับบริการ:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-surface px-2 py-1 text-xs text-primary-700">{shareLink}</code>
            <Button size="icon" variant="secondary" onClick={copyShareLink} aria-label="คัดลอกลิงก์">
              {shareCopied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <span role="status" aria-live="polite" className="block text-2xs text-teal">
            {shareCopied ? "คัดลอกลิงก์แล้ว" : ""}
          </span>
        </div>
      )}
    </Card>
  );
}
