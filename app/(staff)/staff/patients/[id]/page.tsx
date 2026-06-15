import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseCard } from "@/components/course/course-card";
import { PatientAdminControls } from "@/components/staff/patient-admin-controls";
import { getPatientDetail } from "@/lib/data/queries";
import { DIAGNOSIS_LABEL, PATIENT_STATUS_LABEL, SESSION_STATUS_LABEL } from "@/lib/i18n/th";
import { formatThaiDate } from "@/lib/date/buddhist";

const STATUS_TONE = { active: "info", hold: "hold", no_service: "noservice" } as const;
const SESSION_TONE: Record<string, "completed" | "late" | "info" | "neutral" | "nocheckin" | "skipped"> = {
  completed: "completed", attended: "completed", in_progress: "info", late: "late",
  no_checkin: "nocheckin", skipped: "skipped", scheduled: "neutral", rescheduled: "info",
  cancelled: "skipped", corrected: "info",
};
const REPORT_LABEL: Record<string, string> = {
  assessment_swallow: "Assessment · Swallowing",
  assessment_hand: "Assessment · Hand Function",
  followup: "Follow up (รายวัน)",
  summary: "Summary (รายเดือน)",
};

export default async function PatientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPatientDetail(id);
  if (!detail) notFound();
  const { patient: p, course, courseUsed, reports, sessions } = detail;
  const courseTotal = course?.total_sessions ?? 0;
  const remaining = course ? Math.max(courseTotal - courseUsed, 0) : 0;
  const stats: [string, string][] = [
    ["คงเหลือคอร์ส", course ? `${remaining}/${courseTotal}` : "—"],
    ["รายงาน", String(reports.length)],
    ["เคสทั้งหมด", String(sessions.length)],
  ];

  const info: [string, string][] = [
    ["HN", p.hn ?? "—"],
    ["อายุ", p.age_years ? `${p.age_years} ปี` : "—"],
    ["เพศ", p.gender === "male" ? "ชาย" : p.gender === "female" ? "หญิง" : "อื่นๆ"],
    ["โทรศัพท์", p.phone ?? "—"],
    ["ที่อยู่", p.address ?? "—"],
    ["การวินิจฉัย", p.diagnosis_category ? DIAGNOSIS_LABEL[p.diagnosis_category] : "—"],
    ["โปรแกรม", p.training_program ?? "—"],
    ["โรคประจำตัว", p.underlying ?? "—"],
  ];

  return (
    <div className="space-y-5">
      <Link href="/staff/patients" className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> ผู้รับบริการทั้งหมด
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-navy">{p.full_name}</h1>
        <Badge tone={STATUS_TONE[p.status]}>{PATIENT_STATUS_LABEL[p.status]}</Badge>
      </header>

      <PatientAdminControls
        patientId={p.id}
        patientStatus={p.status}
        course={course ? { id: course.id, status: course.status } : null}
      />

      <div className="grid grid-cols-3 gap-3">
        {stats.map(([k, v]) => (
          <Card key={k} className="text-center">
            <p className="font-display text-xl font-bold tabular-nums text-navy">{v}</p>
            <p className="mt-0.5 text-2xs text-muted">{k}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-3 text-base">ข้อมูลผู้รับบริการ</CardTitle>
          <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
            {info.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-4">
          {course && (
            <CourseCard
              used={courseUsed}
              total={course.total_sessions ?? 0}
              bonus={course.bonus_sessions ?? 0}
            />
          )}
          <Card>
            <CardTitle className="mb-2 text-base">รายงาน ({reports.length})</CardTitle>
            <ul className="space-y-1 text-sm">
              {reports.length === 0 && <li className="text-muted">ยังไม่มีรายงาน</li>}
              {reports.map((r) => (
                <li key={r.id} className="flex justify-between border-b border-border py-1.5 last:border-0">
                  <span className="text-ink">{REPORT_LABEL[r.report_type] ?? r.report_type}</span>
                  <span className="text-xs text-muted">
                    {formatThaiDate(r.report_date)} · {r.status === "completed" ? "จบเคส" : "ร่าง"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <CardTitle className="mb-2 text-base">ประวัติคิว ({sessions.length})</CardTitle>
        <ul className="space-y-1 text-sm">
          {sessions.length === 0 && <li className="text-muted">ยังไม่มีคิว</li>}
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
              <span className="text-ink">{formatThaiDate(s.dateISO)} · {s.time}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted">{s.employee}</span>
                <Badge tone={SESSION_TONE[s.status] ?? "neutral"}>{SESSION_STATUS_LABEL[s.status]}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
