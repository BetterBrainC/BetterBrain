import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getReportDetail } from "@/lib/data/queries";
import { formatThaiDate } from "@/lib/date/buddhist";
import { PrintToolbar } from "@/components/staff/print-toolbar";
import {
  Letterhead,
  SummaryPrint,
  AssessmentPrint,
} from "@/components/print/report-print-templates";
import {
  SwallowingAssessmentPrint,
  HandAssessmentPrint,
} from "@/components/print/assessment-print-templates";
import { FollowupPrint } from "@/components/print/followup-print-template";
import type { ReportDetail } from "@/lib/data/queries";

export const metadata = { title: "พิมพ์รายงาน (PDF)" };

const box = "border border-black";

/** Fallback for report types without a letterhead form: plain field table. */
function GenericPrint({ r }: { r: ReportDetail }) {
  return (
    <table className={`mt-3 w-full border-collapse ${box}`}>
      <tbody>
        <tr>
          <td className={`${box} w-44 px-2 py-1.5 font-bold`}>ผู้รับบริการ</td>
          <td className={`${box} px-2 py-1.5`}>{r.patientName}</td>
        </tr>
        <tr>
          <td className={`${box} px-2 py-1.5 font-bold`}>ประเภท / วันที่</td>
          <td className={`${box} px-2 py-1.5`}>{r.typeLabel} · {formatThaiDate(r.date, { month: "long" })} · {r.authorName}</td>
        </tr>
        {r.fields.map((f) => (
          <tr key={f.key}>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>{f.key}</td>
            <td className={`${box} px-2 py-1.5 whitespace-pre-wrap break-words`}>{f.value || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Letterhead print view — one route for every report type, layouts mirroring
 * the clinic's paper forms (client PDFs, 2026-07). The browser's print dialog
 * (auto-opened) saves it as PDF.
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

  // Each report type prints as its own paper form (client 2026-07-17): the two
  // assessments as the English clinical sheets, assessment_report as the Thai
  // letterhead handed to the family.
  const body =
    r.reportType === "followup" ? <FollowupPrint r={r} />
    : r.reportType === "summary" ? <SummaryPrint r={r} />
    : r.reportType === "assessment_report" ? <AssessmentPrint r={r} />
    : r.reportType === "assessment_swallow" ? <SwallowingAssessmentPrint r={r} />
    : r.reportType === "assessment_hand" ? <HandAssessmentPrint r={r} />
    : <GenericPrint r={r} />;

  return (
    <div className="min-h-dvh bg-white text-[13px] leading-relaxed text-black [color-scheme:light]">
      <PrintToolbar />
      <div className="mx-auto max-w-[210mm] px-6 pb-10 print:px-0 print:pb-0">
        <Letterhead />
        {body}
      </div>
    </div>
  );
}
