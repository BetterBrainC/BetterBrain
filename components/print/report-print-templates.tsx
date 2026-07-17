import { formatThaiDate } from "@/lib/date/buddhist";
import { DIAGNOSIS_LABEL } from "@/lib/i18n/th";
import type { ReportDetail } from "@/lib/data/queries";

/**
 * Letterhead print templates — layouts mirror the clinic's paper forms
 * (client PDFs, 2026-07): รายงานประจำวัน · รายงานความก้าวหน้ารายเดือน ·
 * รายงานประเมินแรกรับทางกิจกรรมบำบัด. Values the app captures are filled in;
 * everything else prints as blank dotted lines / unchecked boxes exactly like
 * the paper sheet. Server components; saved to PDF via the browser print dialog.
 */

const box = "border border-black";

/**
 * Letterhead masthead. The logo is the clinic's full horizontal lockup (head +
 * BETTER BRAIN / SWALLOW REHAB), fixed to the brand asset rather than read from
 * Settings — client 10/7/2569: "Logo ให้ใช้แบบที่ส่งให้". The Settings logo stays
 * the compact square mark used by the sidebar and employee nav, which would be
 * unreadable here. A second brand (Synnis) would swap this via brand config.
 */
export function Letterhead() {
  return (
    <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
      <div>
        <p className="font-bold">BetterBrain ฝึกกลืน ฝึกพูด ฟื้นฟูโรคหลอดเลือดสมอง บริการที่บ้าน</p>
        <p>
          <span className="text-[#1857BE]">www.bbc-rehab.com</span>
          <span className="ml-4">เบอร์โทรศัพท์ 082-5453944</span>
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/betterbrain-logo-print.png"
        alt="BetterBrain Swallow Rehab"
        width={519}
        height={400}
        className="h-16 w-auto object-contain"
      />
    </header>
  );
}

export function DotLine({ value = "" }: { value?: string }) {
  return (
    <div className="min-h-6 whitespace-pre-wrap break-words border-b border-dotted border-black leading-6">
      {value}
    </div>
  );
}

export function VitalLine({ bp, hr, rr, spo2 }: { bp: string; hr: string; rr: string; spo2: string }) {
  return (
    <p>
      <span className="font-bold">BP :</span> {bp || "……………"} mmHg,{" "}
      <span className="font-bold">HR :</span> {hr || "……………"} bpm,{" "}
      <span className="font-bold">RR :</span> {rr || "……………"} times/min,{" "}
      <span className="font-bold">SpO2 :</span> {spo2 || "………"} %
    </p>
  );
}

export function SignatureBlock({ name }: { name?: string }) {
  return (
    <div className="ml-auto mt-6 w-72 space-y-4 break-inside-avoid">
      <p>ลงชื่อ<span className="inline-block w-52 border-b border-dotted border-black text-center">{name ?? ""}</span></p>
      <p>ตำแหน่ง<span className="inline-block w-48 border-b border-dotted border-black" /></p>
      <p>ใบอนุญาตเลขที่<span className="inline-block w-40 border-b border-dotted border-black" /></p>
    </div>
  );
}

function Check({ on = false, label }: { on?: boolean; label: string }) {
  return (
    <span className="mr-4 inline-block whitespace-nowrap">
      {on ? "☑" : "☐"} {label}
    </span>
  );
}

const pv = (r: ReportDetail, k: string) => String(r.payload[k] ?? "").trim();

/**
 * Print an ISO date (what ThaiDateInput saves) as a Thai พ.ศ. date; anything else
 * — e.g. the legacy free-text `period` "มิ.ย. 2569" — prints as typed.
 */
function thaiOrRaw(v: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatThaiDate(v, { month: "long" }) : v;
}

/** payload value that may be a checkbox array. */
function pvList(r: ReportDetail, k: string): string[] {
  const v = r.payload[k];
  if (Array.isArray(v)) return v.map((x) => String(x));
  return v ? [String(v)] : [];
}

function patientHeaderRows(r: ReportDetail) {
  return (
    <>
      <tr>
        <td colSpan={2} className={`${box} px-2 py-1.5`}>
          <span className="font-bold">วันที่ประเมินแรกรับ :</span>{" "}
          {r.firstAssessmentDate ? formatThaiDate(r.firstAssessmentDate, { month: "long" }) : "…………………………………"}
        </td>
      </tr>
      <tr>
        <td colSpan={2} className={`${box} px-2 py-1.5`}>
          <span className="font-bold">ชื่อ-สกุล (ผู้รับบริการ) :</span> {r.patientName}
          <span className="ml-6">อายุ {r.patientAge ?? "…………"} ปี</span>
        </td>
      </tr>
      <tr>
        <td className={`${box} w-56 px-2 py-1.5 font-bold`}>การวินิจฉัยโรค</td>
        <td className={`${box} px-2 py-1.5`}>
          {r.patientDiagnosis ? DIAGNOSIS_LABEL[r.patientDiagnosis] : pv(r, "diagnosis")}
        </td>
      </tr>
      <tr>
        <td className={`${box} px-2 py-1.5 font-bold`}>การวินิจฉัยทางกิจกรรมบำบัด</td>
        <td className={`${box} px-2 py-1.5`}>{pv(r, "ot_diagnosis") || pv(r, "diagnosis")}</td>
      </tr>
    </>
  );
}

// ── รายงานความก้าวหน้ารายเดือน (Summary) ────────────────────────────────────
// Row `key`s match the Summary form's radio names — the print ticks what was picked.
const ADL_ROWS = [
  { key: "adl_bed_mobility", label: "การเคลื่อนย้ายตัวบนเตียง" },
  { key: "adl_transfer", label: "ลุกนั่งจากที่นอน/เตียงไปยังเก้าอี้" },
  { key: "adl_dressing", label: "การสวมใส่เสื้อผ้า" },
  { key: "adl_eating", label: "การรับประทานอาหาร" },
  { key: "adl_locomotion", label: "การเคลื่อนที่ภายในห้อง/บ้าน" },
  { key: "adl_toileting", label: "การใช้ห้องน้ำ" },
  { key: "adl_bathing", label: "การอาบน้ำ" },
  { key: "adl_grooming", label: "ล้างหน้า/หวีผม/แปรงฟัน" },
];
const STRENGTH_ROWS = [
  { key: "strength_lips", label: "กล้ามเนื้อปาก" },
  { key: "strength_tongue", label: "การขยับลิ้น" },
  { key: "strength_jaw", label: "การควบคุมขากรรไกร" },
];
const ADL_LEVELS = ["น้อย", "ปานกลาง", "ดี", "ปกติ"];
const STRENGTH_LEVELS = ["แรงน้อย", "แรงปานกลาง", "แรงดี", "แรงปกติ"];

export function SummaryPrint({ r }: { r: ReportDetail }) {
  /** One rating row: label + the levels, ticking the saved one. */
  const ratingRow = (row: { key: string; label: string }, levels: string[], firstCol: string) => (
    <tr key={row.key}>
      <td className={`${firstCol} border-b border-r border-black px-2 py-1`}>{row.label}</td>
      <td className="border-b border-black px-2 py-1">
        {levels.map((o) => <Check key={o} on={pv(r, row.key) === o} label={o} />)}
      </td>
    </tr>
  );
  return (
    <>
      <h1 className="py-3 text-center text-base font-bold">รายงานความก้าวหน้ารายเดือน</h1>
      <table className={`w-full border-collapse ${box}`}>
        <tbody>
          {patientHeaderRows(r)}
          <tr>
            <td className={`${box} px-2 py-1.5 font-bold`}>ช่วงเวลาการฟื้นฟู</td>
            <td className={`${box} p-0`}>
              <div className="flex">
                <p className="flex-1 border-r border-black px-2 py-1.5">
                  <span className="font-bold">From :</span> {thaiOrRaw(pv(r, "period_from") || pv(r, "period"))}
                </p>
                <p className="flex-1 px-2 py-1.5">
                  <span className="font-bold">To :</span> {thaiOrRaw(pv(r, "period_to"))}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>ความก้าวหน้าปัจจุบัน</td>
            <td className={`${box} px-2 py-2 align-top`}>
              <div className="space-y-2">
                <DotLine value={pv(r, "progress")} />
                <DotLine />
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>
              ความสามารถด้าน<br />การทำกิจวัตรประจำวัน
            </td>
            <td className={`${box} p-0 align-top`}>
              <table className="w-full border-collapse">
                <tbody>
                  {ADL_ROWS.map((row) => ratingRow(row, ADL_LEVELS, "w-64"))}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>
              ความสามารถด้าน<br />การกลืน
            </td>
            <td className={`${box} p-0 align-top`}>
              <table className="w-full border-collapse">
                <tbody>
                  {ratingRow({ key: "feeding_by", label: "รับอาหารโดย" }, ["NG", "PEG", "IV", "Oral"], "w-64")}
                  {STRENGTH_ROWS.map((row) => ratingRow(row, STRENGTH_LEVELS, ""))}
                  <tr>
                    <td className="border-r border-black px-2 py-1">น้ำลายไหล</td>
                    <td className={`${box} px-2 py-1`}>
                      {["ไม่มี", "มี"].map((o) => <Check key={o} on={pv(r, "drooling") === o} label={o} />)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>เป้าหมายปัจจุบัน</td>
            <td className={`${box} px-2 py-2 align-top`}>
              <div className="space-y-2">
                <DotLine value={pv(r, "current_goal")} />
                <DotLine />
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 font-bold`}>บรรลุเป้าหมาย</td>
            <td className={`${box} px-2 py-1.5`}>
              <Check on={pv(r, "goal_achieved") === "ผ่าน"} label="ผ่าน" />
              <Check on={pv(r, "goal_achieved") === "ไม่ผ่าน"} label="ไม่ผ่าน" />
              ; <span className="inline-block min-w-72 border-b border-dotted border-black">{pv(r, "goal_achieved_note")}</span>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>โปรแกรมการฟื้นฟู/รักษา</td>
            <td className={`${box} px-2 py-2 align-top`}>
              <div className="space-y-2">
                <DotLine value={pv(r, "rehab_program")} />
                <DotLine />
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className={`${box} px-2 py-1.5`}>
              <span className="font-bold">เป้าหมายเดือน (เลือกใส่เดือนได้) :</span> {pv(r, "next_goal")}
            </td>
          </tr>
        </tbody>
      </table>
      <SignatureBlock name={r.authorName} />
    </>
  );
}

// ── รายงานประเมินแรกรับทางกิจกรรมบำบัด (Assessment) ─────────────────────────
const UNDERLYING_OPTS = [
  "DM", "Hypertension", "Heart disease (on pacemaker)", "Dyslipidemia", "Obesity",
  "Rheumatoid", "Gout", "CKD",
];

/**
 * ระดับความสามารถปัจจุบัน — `key` (and each sub's key) matches the field names in
 * the Swallowing assessment form, so what the OT typed prints in its box.
 */
const ABILITY_SECTIONS: { no: number; title: string; key?: string; subs?: { label: string; key: string }[] }[] = [
  { no: 1, title: "การรับรู้และการตื่นตัว", key: "ability_awareness" },
  { no: 2, title: "การควบคุมนั่งและการควบคุมศีรษะ", key: "ability_sitting" },
  {
    no: 3,
    title: "โครงสร้างปาก",
    subs: [
      { label: "กล้ามเนื้อใบหน้าและริมฝีปาก", key: "ability_oral_face" },
      { label: "กล้ามเนื้อลิ้น", key: "ability_oral_tongue" },
      { label: "ขากรรไกร", key: "ability_oral_jaw" },
    ],
  },
  { no: 4, title: "ปฏิกิริยาอัตโนมัติเกี่ยวข้องกับการกลืน", key: "ability_reflex" },
  {
    no: 5,
    title: "ความสามารถด้านการกลืน",
    subs: [
      { label: "ระยะช่องปาก (Oral Phase)", key: "ability_swallow_oral" },
      { label: "ระยะคอหอย (Pharyngeal phase)", key: "ability_swallow_pharyngeal" },
      { label: "ระยะหลอดอาหาร (Esophageal phase)", key: "ability_swallow_esophageal" },
    ],
  },
];

// "พิมพ์ข้อมูลตามนี้ได้เลย" — static program / advice / notes text from the paper form.
const SWALLOW_PROGRAM: { title: string; lines: string[] }[] = [
  {
    title: "ให้ความรู้ สอนการนวดและออกกำลังกล้ามเนื้อปาก ลิ้น ขากรรไกร , กล้ามเนื้อการกลืนแก่ผู้ดูแล (Family and caregivers education)",
    lines: [
      "1.1 ให้ความรู้ความเข้าใจเกี่ยวกับโรคและพยาธิสภาพที่เกิดขึ้นที่ส่งผลต่อการกลืนลำบาก",
      "1.2 แนะนำการจัดท่าทางเพื่อป้องกันการสำลัก",
      "1.3 สอนการนวดกระตุ้นและออกกำลังกล้ามเนื้อปาก ลิ้น ขากรรไกร , กล้ามเนื้อการกลืนเบื้องต้นแก่ผู้ดูแล",
    ],
  },
  {
    title: "ออกกำลังกล้ามเนื้อปาก ลิ้น ยืดขากรรไกรและกล้ามเนื้อการกลืน (Oral motor stimulation and exercise)",
    lines: [
      "2.1 นวดและยืดกล้ามเนื้อบริเวณคอ เพื่อลดการตึงตัวและเพิ่มความยืดหยุ่นของกล้ามเนื้อ",
      "2.2 นวดกระตุ้นกล้ามเนื้อช่องปาก ลิ้น ยืดขากรรไกร เพื่อเพิ่มความแข็งแรงและความยืดหยุ่นของกล้ามเนื้อ",
      "2.3 ออกกำลังกล้ามเนื้อช่องปาก เพื่อเพิ่มความแข็งแรงของกล้ามเนื้อบริเวณริมฝีปาก ลิ้น ขากรรไกร และแก้ม ซึ่งมีความสำคัญต่อการพูด การกลืน และการเคี้ยวอาหาร",
      "2.4 ออกกำลังกล้ามเนื้อบริเวณคอหอยและเล่นเสียงด้วยเทคนิคการฝึกทางกิจกรรมบำบัด",
    ],
  },
  {
    title: "กระตุ้นระบบความรู้สึกและปฏิกิริยาอัตโนมัติในช่องปาก (Oral reflex stimulation)",
    lines: ["นวดกระตุ้นภายในช่องปากเพื่อเพิ่มการรับรู้สัมผัสปาก-ลิ้นและการรับรู้ข้อต่อขากรรไกร"],
  },
  {
    title: "ฝึกพูด (Pre Speech exercise)",
    lines: ["ฝึกการเคลื่อนไหวปาก-ลิ้นให้เกิดการเรียนรู้จดจำ และฝึกให้นำการเคลื่อนไหวนั้นมาประสมเป็นคำพูดและเป็นประโยค"],
  },
  {
    title: "ฝึกการหายใจ (Breathing exercise)",
    lines: ["เพิ่มความแข็งแรงของเพดานอ่อนและเพิ่มความสัมพันธ์ของการกลืนกับการหายใจ"],
  },
  {
    title: "กระตุ้นกลืน/ฝึกกลืน (Swallowing training)",
    lines: [
      "กระตุ้นกลืนน้ำลาย ฝึกกลืนอาหาร เพื่อกระตุ้นให้กล้ามเนื้อที่เกี่ยวข้องกับการกลืนได้เกิดการทำงานร่วมกับความตั้งใจกลืน และเพิ่มความแข็งแรงของกล้ามเนื้อให้สามารถทานอาหารได้มากขึ้น โปรแกรมการฝึกจะเริ่มจากความสามารถของแต่ละบุคคลที่ทราบจากการประเมินแรกรับ และพิจารณา condition ทางร่างกายอื่นๆ ร่วมด้วย",
    ],
  },
];

const SWALLOW_ADVICE = [
  "แนะนำนวดกระตุ้นและยืดกล้ามเนื้อปาก-ลิ้น ร่วมกับกระตุ้นกลืนน้ำลาย เพื่อเพิ่มการรับความรู้สึกในช่องปากและกระตุ้น reflex การกลืนอัตโนมัติ อย่างน้อย วันละ 1 รอบ",
  "แนะนำทำความสะอาดช่องปากอย่างสม่ำเสมอ ลดเชื้อโรคที่สะสมในปากส่งผลให้เป็นปอดติดเชื้อได้",
  "ยังไม่แนะนำให้ป้อนอาหารทางปากเอง หรือสามารถทำภายใต้คำแนะนำของนักกิจกรรมบำบัดเท่านั้น",
];

const SWALLOW_NOTES = [
  "ความก้าวหน้าของการฟื้นฟูขึ้นอยู่กับปัจจัยจากความรุนแรงพยาธิสภาพของโรคและภาวะแทรกซ้อนของแต่ละบุคคล",
  "แนะนำให้ปฏิบัติตามคำแนะนำของนักกิจกรรมบำบัดและหมั่นกระตุ้นกล้ามเนื้อในช่องปาก เพื่อเตรียมความพร้อมกล้ามเนื้อและกระตุ้นระบบการกลืนอัตโนมัติอย่างต่อเนื่อง",
  "ประเมินอาการร่วมกับนักกิจกรรมบำบัด ก่อนฝึก ระหว่างฝึก และหลังฝึก ส่งต่อข้อมูลซึ่งกันและกันอย่างต่อเนื่องหรือก่อนเริ่มฝึกทุกครั้ง เพื่อผลลัพธ์ที่ดีขึ้น",
  "การฝึกกลืนเป็นโปรแกรมฝึกต่อเนื่อง จะมีการประเมินกลืนเป็นระยะ หากมีความก้าวหน้าดีขึ้นตามเป้าหมายจะมีการปรับโปรแกรมฝึกตามความสามารถไปอย่างต่อเนื่อง (เช่น ปรับระดับอาหารฝึกกลืน , ระดับการผสม thickener ในน้ำดื่ม , ปริมาณต่อคำ , ปริมาณการทานต่อครั้ง ฯลฯ)",
];

export function AssessmentPrint({ r }: { r: ReportDetail }) {
  const underlying = pvList(r, "underlying");
  const hasUnderlying = (opt: string) =>
    underlying.some((u) => opt.startsWith(u) || u.startsWith(opt.split(" (")[0]!));
  return (
    <>
      <h1 className="py-3 text-center text-base font-bold">รายงานประเมินแรกรับทางกิจกรรมบำบัด</h1>
      <table className={`w-full border-collapse ${box}`}>
        <tbody>
          {patientHeaderRows(r)}
          <tr>
            <td className={`${box} px-2 py-1.5 font-bold`}>โรคประจำตัว</td>
            <td className={`${box} px-2 py-1.5`}>
              {UNDERLYING_OPTS.map((o) => <Check key={o} on={hasUnderlying(o)} label={o} />)}
              <span className="whitespace-nowrap">
                <Check on={!!pv(r, "underlying_other")} label="other ;" />
                <span className="inline-block min-w-40 border-b border-dotted border-black">{pv(r, "underlying_other")}</span>
              </span>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>ระดับความสามารถปัจจุบัน</td>
            <td className={`${box} px-2 py-2 align-top`}>
              <ol className="space-y-3">
                {ABILITY_SECTIONS.map((s) => (
                  <li key={s.no}>
                    <p className="font-bold">{s.no}. {s.title}</p>
                    {s.subs ? (
                      s.subs.map((sub) => (
                        <div key={sub.key} className="ml-6 mt-1 space-y-2">
                          <p className="underline">• {sub.label}</p>
                          <DotLine value={pv(r, sub.key)} />
                          <DotLine />
                        </div>
                      ))
                    ) : (
                      <div className="mt-1 space-y-2">
                        <DotLine value={s.key ? pv(r, s.key) : ""} />
                        <DotLine />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 align-top font-bold`}>
              เป้าหมายของฟื้นฟู<span className="underline">ระยะยาว</span><br />ทางกิจกรรมบำบัด
            </td>
            <td className={`${box} px-2 py-2 align-top`}>
              <div className="space-y-2">
                <DotLine value={pv(r, "long_term_goal")} />
                <DotLine />
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${box} px-2 py-1.5 font-bold`}>ระยะเวลาในการฟื้นฟูสูงสุด:</td>
            <td className={`${box} px-2 py-1.5`}><DotLine value={pv(r, "max_rehab_duration")} /></td>
          </tr>
        </tbody>
      </table>

      <p className="my-3 bg-[#7EC4E8] py-4 text-center text-base font-bold print:bg-[#7EC4E8]">
        จำนวนครั้งที่แนะนำในการฟื้นฟูการกลืน {pv(r, "sessions_per_week") || "………"} ครั้ง/สัปดาห์
      </p>

      <table className={`w-full border-collapse ${box}`}>
        <tbody>
          <tr>
            <td className={`${box} w-56 px-2 py-1.5 align-top font-bold`}>
              เป้าหมายของฟื้นฟู<span className="underline">ระยะสั้น</span><br />ทางกิจกรรมบำบัด
            </td>
            <td className={`${box} px-2 py-2 align-top`}>
              <div className="space-y-2">
                <DotLine value={pv(r, "short_term_goal")} />
                <DotLine />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <section className="mt-6 break-before-page space-y-4">
        <h2 className="font-bold">โปรแกรมฟื้นฟูการกลืน :</h2>
        <ol className="ml-5 list-decimal space-y-3">
          {SWALLOW_PROGRAM.map((p) => (
            <li key={p.title}>
              <p className="font-bold">{p.title}</p>
              {p.lines.map((l) => <p key={l} className="mt-1">{l}</p>)}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 space-y-2 break-inside-avoid">
        <h2 className="font-bold">คำแนะนำ :</h2>
        <ol className="ml-5 list-decimal space-y-1">
          {SWALLOW_ADVICE.map((l) => <li key={l}>{l}</li>)}
        </ol>
      </section>

      <section className="mt-4 space-y-2 break-inside-avoid">
        <h2 className="font-bold">หมายเหตุ :</h2>
        <ol className="ml-5 list-decimal space-y-1">
          {SWALLOW_NOTES.map((l) => <li key={l}>{l}</li>)}
        </ol>
      </section>

      <SignatureBlock name={r.authorName} />
    </>
  );
}
