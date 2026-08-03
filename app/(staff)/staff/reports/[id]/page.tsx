import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { ThaiDate } from "@/components/ui/thai-date";
import { ReportPrintBody } from "@/components/print/report-print-body";
import { ReportEditor } from "@/components/staff/report-editor";
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
          {/* Every report type exports as the clinic's letterhead PDF (print view). */}
          <Link href={`/print/report/${r.id}`} target="_blank">
            <Button size="sm" variant="secondary">
              <FileDown className="h-4 w-4" /> Export
            </Button>
          </Link>
        </div>
      </header>

      {/* On-screen view = the same letterhead layout as the export file
          (client 22 ก.ค. 2569: โชว์ข้อมูลแบบเดียวกับไฟล์ export). */}
      <Card className="space-y-3">
        <CardTitle className="text-base">ข้อมูลแบบประเมิน</CardTitle>
        {r.fields.length === 0 ? (
          <p className="text-sm text-muted">ไม่มีข้อมูลที่บันทึกไว้</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md bg-white p-4 text-[13px] leading-relaxed text-black [color-scheme:light]">
              <ReportPrintBody r={r} />
            </div>
            {/* Admin/Director may correct a filed report (client 3 ส.ค. 2569). */}
            <ReportEditor reportId={r.id} payload={r.payload} />
          </>
        )}
      </Card>
    </div>
  );
}
