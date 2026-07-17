import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getReportDetail } from "@/lib/data/queries";
import { formatThaiDate } from "@/lib/date/buddhist";
import { PrintToolbar } from "@/components/staff/print-toolbar";
import {
  Letterhead,
  DotLine,
  VitalLine,
  SignatureBlock,
  SummaryPrint,
  AssessmentPrint,
} from "@/components/print/report-print-templates";
import {
  SwallowingAssessmentPrint,
  HandAssessmentPrint,
} from "@/components/print/assessment-print-templates";
import type { ReportDetail } from "@/lib/data/queries";

export const metadata = { title: "พิมพ์รายงาน (PDF)" };

const box = "border border-black";
const pv = (r: ReportDetail, k: string) => String(r.payload[k] ?? "").trim();

/** payload value that may be a checkbox array (e.g. mobility). */
function pvList(r: ReportDetail, k: string): string[] {
  const val = r.payload[k];
  if (Array.isArray(val)) return val.map((x) => String(x));
  return val ? [String(val)] : [];
}

/** รายงานประจำวัน — the daily follow-up letterhead form. */
function FollowupPrint({ r }: { r: ReportDetail }) {
  const v = (k: string) => pv(r, k);
  const mobility = pvList(r, "mobility");
  const tick = (o: string) => (mobility.includes(o) ? "☑" : "☐");
  return (
    <>
      <h1 className="py-3 text-center text-base font-bold">รายงานประจำวัน</h1>
      <table className={`w-full border-collapse ${box}`}>
        <tbody>
          <tr>
            <td colSpan={3} className={`${box} px-2 py-1.5`}>
              <span className="font-bold">วัน-เดือน-ปี :</span>{" "}
              {formatThaiDate(v("date") || r.date, { month: "long" })}
              {v("time") ? ` เวลา ${v("time").slice(0, 5).replace(":", ".")} น.` : ""}
            </td>
          </tr>
          <tr>
            <td colSpan={3} className={`${box} px-2 py-1.5`}>
              <span className="font-bold">ชื่อ-สกุล (ผู้รับบริการ) :</span> {v("patient_name") || r.patientName}
              <span className="ml-6">อายุ {r.patientAge ?? "…………"} ปี</span>
            </td>
          </tr>
          <tr>
            <td className={`${box} w-44 px-2 py-1.5 align-top font-bold`}>Subjective and Objective :</td>
            <td colSpan={2} className={`${box} p-0 align-top`}>
              <div className="border-b border-black px-2 py-1.5">
                <p className="font-bold">Vital signs</p>
                <VitalLine bp={v("bp_before")} hr={v("hr_before")} rr={v("rr_before")} spo2={v("spo2_before")} />
              </div>
              <div className="flex border-b border-black">
                <p className="flex-1 border-r border-black px-2 py-1.5">
                  <span className="font-bold">Mobility :</span> {tick("Walk")} Walk&ensp;
                  {tick("Wheel chair")} Wheel chair&ensp;
                  {tick("Walker/Stretcher/Cane")} Walker/Stretcher/Cane
                </p>
                <p className="w-40 px-2 py-1.5 font-bold">{tick("Fall Risk")} Fall Risk</p>
              </div>
              <div className="space-y-2 px-2 py-2">
                <DotLine value={[v("subject"), v("diagnosis") && `Diagnosis : ${v("diagnosis")}`].filter(Boolean).join("\n")} />
                <DotLine />
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>Problem list :</td>
            <td colSpan={2} className={`${box} px-2 py-1.5 align-top whitespace-pre-wrap break-words`}>
              {v("problem_list")}
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>Plan of treatment :</td>
            <td className={`${box} w-32 px-2 py-1.5 align-top font-bold`}>Treatment :</td>
            <td className={`${box} p-0 align-top`}>
              <div className="border-b border-black px-2 py-1.5">
                <p className="font-bold">Vital signs</p>
                <VitalLine bp={v("bp_after")} hr={v("hr_after")} rr={v("rr_after")} spo2={v("spo2_after")} />
              </div>
              <div className="space-y-2 px-2 py-2">
                <DotLine value={v("treatment")} />
                <DotLine />
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5`} />
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>Post Rx :</td>
            <td className={`${box} p-0 align-top`}>
              <div className="space-y-2 px-2 py-2">
                <DotLine value={v("post_treatment")} />
                <DotLine />
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>Goal :</td>
            <td colSpan={2} className={`${box} px-2 py-1.5 align-top whitespace-pre-wrap break-words`}>
              {v("goal")}
            </td>
          </tr>
        </tbody>
      </table>
      <SignatureBlock name={pv(r, "ot_name") || r.authorName} />
    </>
  );
}

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
