import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getReportDetail, getSettings } from "@/lib/data/queries";
import { formatThaiDate } from "@/lib/date/buddhist";
import { PrintToolbar } from "@/components/staff/print-toolbar";

export const metadata = { title: "รายงานประจำวัน (PDF)" };

/** Dotted fill-in line, printed value sitting on top (mirrors the paper form). */
function DotLine({ value = "" }: { value?: string }) {
  return (
    <div className="min-h-6 whitespace-pre-wrap break-words border-b border-dotted border-black leading-6">
      {value}
    </div>
  );
}

function VitalLine({ bp, hr, rr, spo2 }: { bp: string; hr: string; rr: string; spo2: string }) {
  return (
    <p>
      <span className="font-bold">BP :</span> {bp || "……………"} mmHg,{" "}
      <span className="font-bold">HR :</span> {hr || "……………"} bpm,{" "}
      <span className="font-bold">RR :</span> {rr || "……………"} times/min,{" "}
      <span className="font-bold">SpO2 :</span> {spo2 || "………"} %
    </p>
  );
}

/**
 * Letterhead print view of a รายงานประจำวัน (Follow up) — layout mirrors the
 * clinic's paper form (client PDF, 2026-07): header + วัน-เดือน-ปี/ชื่อ-สกุล,
 * Subjective and Objective (vitals ก่อน), Problem list, Plan of treatment
 * (Treatment + vitals หลัง, Post Rx), Goal, then the signature block. The
 * browser's print dialog saves it as PDF. Non-followup types get a plain
 * printable field table.
 */
export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const [r, settings] = await Promise.all([getReportDetail(id), getSettings()]);
  if (!r) notFound();

  const v = (k: string) => String(r.payload[k] ?? "").trim();
  const box = "border border-black";

  return (
    <div className="min-h-dvh bg-white text-[13px] leading-relaxed text-black [color-scheme:light]">
      <PrintToolbar />
      <div className="mx-auto max-w-[210mm] px-6 pb-10 print:px-0 print:pb-0">
        {/* Letterhead */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
          <div>
            <p className="font-bold">BetterBrain ฝึกกลืน ฝึกพูด ฟื้นฟูโรคหลอดเลือดสมอง บริการที่บ้าน</p>
            <p>
              <span className="text-[#1857BE]">www.bbc-rehab.com</span>
              <span className="ml-4">เบอร์โทรศัพท์ 082-5453944</span>
            </p>
          </div>
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="โลโก้" className="h-16 w-auto object-contain" />
          ) : null}
        </header>

        <h1 className="py-3 text-center text-base font-bold">รายงานประจำวัน</h1>

        {r.reportType === "followup" ? (
          <>
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
                        <span className="font-bold">Mobility :</span> ☐ Walk&ensp;☐ Wheel chair&ensp;☐ Walker/Stretcher/Cane
                      </p>
                      <p className="w-40 px-2 py-1.5 font-bold">☐ Fall Risk</p>
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

            <div className="ml-auto mt-6 w-72 space-y-4">
              <p>ลงชื่อ<span className="inline-block w-52 border-b border-dotted border-black text-center">{v("ot_name") || r.authorName}</span></p>
              <p>ตำแหน่ง<span className="inline-block w-48 border-b border-dotted border-black" /></p>
              <p>ใบอนุญาตเลขที่<span className="inline-block w-40 border-b border-dotted border-black" /></p>
            </div>
          </>
        ) : (
          // Other report types: plain printable field table (no letterhead form yet).
          <table className={`w-full border-collapse ${box}`}>
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
        )}
      </div>
    </div>
  );
}
