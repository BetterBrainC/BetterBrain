import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getReportDetail } from "@/lib/data/queries";
import { PrintToolbar } from "@/components/staff/print-toolbar";
import { Letterhead } from "@/components/print/report-print-templates";
import { ReportPrintBody } from "@/components/print/report-print-body";

export const metadata = { title: "พิมพ์รายงาน (PDF)" };

/**
 * Letterhead print view — one route for every report type, layouts mirroring
 * the clinic's paper forms (client PDFs, 2026-07). The browser's print dialog
 * (auto-opened) saves it as PDF. The per-type form body is shared with the
 * staff "ดูรายงาน" page via ReportPrintBody.
 */
export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const r = await getReportDetail(id);
  if (!r) notFound();

  return (
    <div className="min-h-dvh bg-white text-[13px] leading-relaxed text-black [color-scheme:light]">
      <PrintToolbar />
      <div className="mx-auto max-w-[210mm] px-6 pb-10 print:px-0 print:pb-0">
        <Letterhead />
        <ReportPrintBody r={r} />
      </div>
    </div>
  );
}
