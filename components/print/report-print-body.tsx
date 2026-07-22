import { formatThaiDate } from "@/lib/date/buddhist";
import {
  SummaryPrint,
  AssessmentPrint,
} from "@/components/print/report-print-templates";
import {
  SwallowingAssessmentPrint,
  HandAssessmentPrint,
} from "@/components/print/assessment-print-templates";
import { FollowupPrint } from "@/components/print/followup-print-template";
import type { ReportDetail } from "@/lib/data/queries";

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
 * The per-type letterhead form body — shared between the print/PDF route and
 * the staff "ดูรายงาน" page so the on-screen view matches the export file
 * (client 22 ก.ค. 2569: โชว์ข้อมูลแบบเดียวกับไฟล์ export).
 */
export function ReportPrintBody({ r }: { r: ReportDetail }) {
  return r.reportType === "followup" ? <FollowupPrint r={r} />
    : r.reportType === "summary" ? <SummaryPrint r={r} />
    : r.reportType === "assessment_report" ? <AssessmentPrint r={r} />
    : r.reportType === "assessment_swallow" ? <SwallowingAssessmentPrint r={r} />
    : r.reportType === "assessment_hand" ? <HandAssessmentPrint r={r} />
    : <GenericPrint r={r} />;
}
