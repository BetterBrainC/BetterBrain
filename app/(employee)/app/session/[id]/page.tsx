import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckInPanel } from "@/components/checkin/check-in-panel";
import { PatientKpiForm } from "@/components/employee/patient-kpi-form";
import { DailyReportCard } from "@/components/reports/daily-report-card";
import { getSessionDetail, getCheckinSettings, getMyName } from "@/lib/data/queries";
import { getSessionDraftTypes } from "@/actions/report-drafts";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, checkinCfg, myName, draftTypes] = await Promise.all([
    getSessionDetail(id),
    getCheckinSettings(),
    getMyName(),
    getSessionDraftTypes(id),
  ]);
  if (!session) notFound();
  const drafts = new Set(draftTypes);

  const remaining = Math.max(session.courseTotal - session.courseUsed, 0);
  const coursePct = session.courseTotal
    ? Math.min(100, Math.round((session.courseUsed / session.courseTotal) * 100))
    : 0;

  // Navigation to the patient's home — prefer exact coords, else the address.
  const dest =
    session.homeLat != null && session.homeLng != null
      ? `${session.homeLat},${session.homeLng}`
      : session.address
        ? encodeURIComponent(session.address)
        : null;
  const mapsHref = dest ? `https://www.google.com/maps/dir/?api=1&destination=${dest}` : null;

  return (
    <div className="space-y-5 px-[var(--gutter-page)] pt-4">
      <Link href="/app/schedule" className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> ปฏิทินนัดหมาย
      </Link>

      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-navy">{session.patientName}</h1>
        {/* Client 22 ก.ค. 2569: the assessment-type badge was hardcoded to
            "Hand Function" (wrong for Swallowing cases) — removed, not shown. */}
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted">{session.program}</p>
          {session.kind !== "assessment" && (
            <span className="rounded-pill bg-surface-tint px-2 py-0.5 text-2xs font-semibold text-primary-700">โปรแกรม</span>
          )}
        </div>
      </header>

      <Card className="space-y-2">
        <p className="flex items-center gap-2 text-sm text-ink">
          <Clock className="h-4 w-4 text-muted" /> {session.timeLabel}
        </p>
        {session.address && (
          <p className="flex items-start gap-2 text-sm text-ink">
            <MapPin className="h-4 w-4 shrink-0 text-muted" /> {session.address}
          </p>
        )}
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-semibold text-[var(--text-on-fill)] hover:bg-primary-600"
          >
            <Navigation className="h-4 w-4" /> เปิดแผนที่ · นำทางไปบ้านผู้รับบริการ
          </a>
        )}
        <div className="mt-1 space-y-1 rounded-md bg-surface-tint px-3 py-2">
          <span className="text-xs text-muted">ความคืบหน้าคอร์ส</span>
          <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" aria-label="ความคืบหน้าคอร์ส">
            <div className="h-full rounded-full bg-primary" style={{ width: `${coursePct}%` }} />
          </div>
          {remaining === 1 && (
            <p className="text-xs font-medium text-[var(--status-late-fg)]">เหลือ 1 ครั้งจบคอร์ส</p>
          )}
        </div>
      </Card>

      <CheckInPanel
        sessionId={session.id}
        patientName={session.patientName}
        homeLat={session.homeLat}
        homeLng={session.homeLng}
        radiusM={checkinCfg.radiusM}
        initialStatus={session.status}
        scheduledStartISO={session.scheduledStartISO}
        scheduledEndISO={session.scheduledEndISO}
        lateThresholdMin={checkinCfg.lateThresholdMin}
        earlyThresholdMin={checkinCfg.earlyThresholdMin}
        selfieEnforced={checkinCfg.selfieEnforced}
        kind={session.kind}
        otName={myName}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">บันทึกรายงาน</h2>
        <div className="grid grid-cols-2 gap-2">
          {(session.kind === "assessment"
            ? [
                { href: `/app/session/${session.id}/report/hand`, label: "ประเมินแรกรับ · Hand Function", type: "assessment_hand" },
                { href: `/app/session/${session.id}/report/swallowing`, label: "ประเมินแรกรับ · Swallowing", type: "assessment_swallow" },
                { href: `/app/session/${session.id}/report/assessment-report`, label: "รายงานประเมินแรกรับ", type: "assessment_report" },
              ]
            : [
                { href: `/app/session/${session.id}/report/swallowing`, label: "ประเมินแรกรับ · Swallowing", type: "assessment_swallow" },
                { href: `/app/session/${session.id}/report/hand`, label: "ประเมินแรกรับ · Hand Function", type: "assessment_hand" },
                { href: `/app/session/${session.id}/report/assessment-report`, label: "รายงานประเมินแรกรับ", type: "assessment_report" },
                { href: `/app/session/${session.id}/report/summary`, label: "รายงานความก้าวหน้ารายเดือน", type: "summary" },
              ]
          ).map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="rounded-md border border-border bg-surface px-3 py-3 text-sm font-medium text-navy hover:bg-surface-tint"
            >
              {r.label}
              {/* An unfiled draft is otherwise invisible — flag where work is waiting. */}
              {drafts.has(r.type) && <Badge tone="late" className="ml-2 align-middle">ร่าง</Badge>}
            </Link>
          ))}
          {session.kind !== "assessment" && (
            <DailyReportCard
              sessionId={session.id}
              patientName={session.patientName}
              otName={myName}
              hasDraft={drafts.has("followup")}
            />
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">วัดผลผู้รับบริการ</h2>
        <PatientKpiForm patientId={session.patientId} />
      </section>
    </div>
  );
}
