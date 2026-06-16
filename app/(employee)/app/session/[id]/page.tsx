import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CheckInPanel } from "@/components/checkin/check-in-panel";
import { getSessionDetail, getCheckinSettings } from "@/lib/data/queries";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, checkinCfg] = await Promise.all([
    getSessionDetail(id),
    getCheckinSettings(),
  ]);
  if (!session) notFound();

  const remaining = Math.max(session.courseTotal - session.courseUsed, 0);
  const coursePct = session.courseTotal
    ? Math.min(100, Math.round((session.courseUsed / session.courseTotal) * 100))
    : 0;

  return (
    <div className="space-y-5 px-[var(--gutter-page)] pt-4">
      <Link href="/app/schedule" className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> ตารางงาน
      </Link>

      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-navy">{session.patientName}</h1>
        <p className="text-sm text-muted">{session.program}</p>
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
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">รายงาน & ประเมิน</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: `/app/session/${session.id}/report/swallowing`, label: "ประเมินแรกรับ · Swallowing" },
            { href: `/app/session/${session.id}/report/hand`, label: "ประเมินแรกรับ · Hand Function" },
            { href: `/app/session/${session.id}/report/summary`, label: "ความก้าวหน้ารายเดือน (Summary)" },
          ].map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="rounded-md border border-border bg-surface px-3 py-3 text-sm font-medium text-navy hover:bg-surface-tint"
            >
              {r.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-faint">
          Assessment + Follow up ต้องเช็คอินก่อน · Follow up เปิดอัตโนมัติเมื่อกดเช็คเอาท์
        </p>
      </section>
    </div>
  );
}
