import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { ExportButton } from "@/components/staff/export-button";
import { ThaiDate } from "@/components/ui/thai-date";
import { requireStaff } from "@/lib/auth";
import { getReportDetail } from "@/lib/data/queries";

const STATUS: Record<string, { label: string; tone: "completed" | "info" | "nocheckin" | "late" }> = {
  completed: { label: "จบเคส", tone: "completed" },
  draft: { label: "ร่าง", tone: "late" },
  corrected: { label: "แก้ไขแล้ว", tone: "info" },
  discarded: { label: "ยกเลิก", tone: "nocheckin" },
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const r = await getReportDetail(id);
  if (!r) notFound();
  const st = STATUS[r.status] ?? { label: r.status, tone: "info" as const };

  // Per-person export: metadata header rows + every captured field.
  const exportRows: [string, string][] = [
    ["ผู้รับบริการ", r.patientName],
    ["ประเภท", r.typeLabel],
    ["ผู้บันทึก", r.authorName],
    ["วันที่", r.date],
    ["สถานะ", st.label],
    ...r.fields.map((f) => [f.key, f.value] as [string, string]),
  ];

  return (
    <div className="space-y-5">
      <BackButton fallbackHref="/staff/reports" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{r.patientName}</h1>
          <p className="text-sm text-muted">
            {r.typeLabel} · <ThaiDate value={r.date} /> · {r.authorName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={st.tone}>{st.label}</Badge>
          <ExportButton
            filename={`report-${r.patientName}-${r.date}`}
            headers={["หัวข้อ", "ข้อมูล"]}
            rows={exportRows}
            label="Export รายคน"
          />
        </div>
      </header>

      <Card>
        <CardTitle className="mb-3 text-base">ข้อมูลแบบประเมิน</CardTitle>
        {r.fields.length === 0 ? (
          <p className="text-sm text-muted">ไม่มีข้อมูลที่บันทึกไว้</p>
        ) : (
          <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
            {r.fields.map((f) => (
              <div key={f.key} className="flex flex-col">
                <dt className="text-xs text-muted">{f.key}</dt>
                <dd className="whitespace-pre-wrap break-words text-ink">{f.value || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}
