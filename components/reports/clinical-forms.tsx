"use client";

import { Fragment } from "react";
import { ReportFormShell, ReportSection, CheckRow, RadioRow, SubLabel } from "@/components/reports/report-shell";
import { ReportPhotoUpload } from "@/components/reports/report-photo-upload";
import { Field, TextInput, Textarea, Select } from "@/components/ui/field";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { FOIS_LABEL } from "@/lib/i18n/th";

type FormProps = { patientName: string; backHref: string; sessionId: string };

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function FoisSelect({ label = "Functional Oral Intake Scale (FOIS)", name = "fois" }: { label?: string; name?: string }) {
  return (
    <Field label={label}>
      <Select name={name} defaultValue="">
        <option value="" disabled>เลือกระดับ</option>
        {Object.entries(FOIS_LABEL).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </Select>
    </Field>
  );
}

/**
 * A list of labeled fill-in fields — mirrors the paper assessment where each item
 * (Tracheostomy : ____, Bed mobility : ____) has a blank to write in. Names are
 * slugged from the label so saved payloads stay stable.
 */
function FillInList({ prefix, items, cols = 2 }: { prefix: string; items: string[]; cols?: 2 | 3 }) {
  return (
    <div className={cols === 3 ? "grid gap-3 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-2"}>
      {items.map((it) => {
        const slug = it.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        return (
          <Field key={it} label={it}>
            <TextInput name={`${prefix}_${slug}`} />
          </Field>
        );
      })}
    </div>
  );
}

/** Rows scored ขวา/ซ้าย — the paper sheet's "R | L" table (e.g. Sensation). */
function RtLtGrid({ prefix, rows }: { prefix: string; rows: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted">ประเภท</span><span className="text-muted">R</span><span className="text-muted">L</span>
      {rows.map((row) => {
        const slug = row.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        return (
          <Fragment key={row}>
            <span className="self-center text-ink">{row}</span>
            <TextInput name={`${prefix}_${slug}_r`} />
            <TextInput name={`${prefix}_${slug}_l`} />
          </Fragment>
        );
      })}
    </div>
  );
}

function Vitals({ withTemp = false, withSpO2 = true }: { withTemp?: boolean; withSpO2?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="BP (mmHg)"><TextInput name="bp" /></Field>
      <Field label="HR (bpm)"><TextInput name="hr" /></Field>
      <Field label="RR (times/min)"><TextInput name="rr" /></Field>
      {withSpO2 && <Field label="SpO2 (%)"><TextInput name="spo2" /></Field>}
      {withTemp && <Field label="Temp (°C)"><TextInput name="temp" /></Field>}
    </div>
  );
}

function PlanSection() {
  return (
    <ReportSection title="Plan of Treatment">
      <Field label="Long term goal"><Textarea name="long_term_goal" /></Field>
      <Field label="Short term goal"><Textarea name="short_term_goal" /></Field>
      <Field label="Re-assessment date"><ThaiDateInput name="reassessment_date" /></Field>
      <Field label="Treatment"><Textarea name="treatment" /></Field>
      <Field label="Post treatment"><Textarea name="post_treatment" /></Field>
    </ReportSection>
  );
}

const ADL = ["Bed mobility", "Locomotion", "Eating", "Bathing", "Transfer", "Toileting", "Dressing", "Hygiene/Grooming"];

// Underlying set — matches the Swallowing/Hand Function Assessment source docs.
const UNDERLYING = ["DM", "Hypertension", "Heart disease", "Dyslipidemia", "CKD", "Rheumatoid", "Gout", "No"];
// Swallowing Evaluation — client review 2026-07: FOIS moves to the top, then
// three rows of three (Bite reflex dropped from the client's new layout).
const SWALLOW_EVAL = [
  "Tracheostomy", "Feeding by", "Drooling",
  "Lips control", "Tongue movement", "Jaw control",
  "Cough reflex", "Gag reflex", "Swallow reflex",
];

// ── Swallowing Assessment ─────────────────────────────────────────────────
export function SwallowingForm({ patientName, backHref, sessionId }: FormProps) {
  return (
    <ReportFormShell
      title="Swallowing Assessment"
      patientName={patientName}
      backHref={backHref}
      sessionId={sessionId}
      reportType="assessment_swallow"
      requiresCheckin
    >
      <ReportSection title="ข้อมูลทั่วไป">
        <Field label="Diagnosis"><TextInput name="diagnosis" /></Field>
        <Field label="Chief Complaint"><Textarea name="chief_complaint" /></Field>
        {/* Vital signs sit above Underlying (client review 2026-07). */}
        <SubLabel>Vital signs</SubLabel>
        <Vitals />
        <SubLabel>Underlying</SubLabel>
        <CheckRow name="underlying" options={UNDERLYING} />
        <SubLabel>Mobility</SubLabel>
        <CheckRow name="mobility" options={["Walk", "Wheel chair", "Walker/Stretcher/Cane"]} />
        <SubLabel>Fall risk</SubLabel>
        <CheckRow name="fall_risk" options={["Yes", "No"]} />
        <SubLabel>Fracture risk</SubLabel>
        <CheckRow name="fracture_risk" options={["Yes", "No"]} />
      </ReportSection>

      <ReportSection title="Subjective & Objective">
        <Textarea name="subjective_objective" />
      </ReportSection>

      <ReportSection title="Physical examination">
        <Textarea name="physical_exam" />
      </ReportSection>

      <ReportSection title="Swallowing Evaluation">
        <FoisSelect />
        <FillInList prefix="swallow_eval" items={SWALLOW_EVAL} cols={3} />
      </ReportSection>

      <ReportSection title="Part 1 · Indirect Swallowing Test">
        <CheckRow
          name="indirect_test"
          options={[
            "1.1 Being vigilant at least 10 minutes",
            "1.2 Able to cough (voluntary) or throat clearing",
            "1.3 Able to swallow saliva",
          ]}
        />
        <p className="text-xs text-muted">If Yes to all, continue to part 2</p>
      </ReportSection>

      <ReportSection title="Part 2 · Direct Swallowing Test">
        <span className="text-sm text-ink">2.1 Semi solid trial : Pudding level ½ teaspoon</span>
        <CheckRow name="semisolid" options={["1st", "2nd", "3rd", "4th", "5th"]} />
        <span className="text-sm text-ink">2.2 Liquid trial : Water (ml)</span>
        <CheckRow name="liquid" options={["3 ml", "5 ml", "10 ml", "20 ml", "50 ml"]} />
        <span className="text-sm text-ink">2.3 Solid trial : Cracker</span>
        <CheckRow name="solid" options={["1st", "2nd", "3rd", "4th", "5th"]} />
        <CheckRow name="result" options={["Result : safe to swallow, minimal risk of aspiration"]} />
        <Field label="Remarks"><Textarea name="remarks" /></Field>
      </ReportSection>

      <ReportSection title="Activities Daily Living">
        <FillInList prefix="adl" items={ADL} />
      </ReportSection>

      <ReportSection title="รูปภาพ">
        <ReportPhotoUpload sessionId={sessionId} />
      </ReportSection>

      <PlanSection />
    </ReportFormShell>
  );
}

// ── Hand Function Assessment ──────────────────────────────────────────────
export function HandForm({ patientName, backHref, sessionId }: FormProps) {
  return (
    <ReportFormShell
      title="Hand Function Assessment"
      patientName={patientName}
      backHref={backHref}
      sessionId={sessionId}
      reportType="assessment_hand"
      requiresCheckin
    >
      <ReportSection title="ข้อมูลทั่วไป">
        <Field label="Diagnosis"><TextInput name="diagnosis" /></Field>
        <Field label="Chief Complaint"><Textarea name="chief_complaint" /></Field>
        {/* Client review 2026-07: vitals move above Underlying; Precaution is
            replaced by the same Underlying set as the Swallowing form.
            22 ก.ค. 2569: Temp (°C) replaced by SpO2 (%). */}
        <SubLabel>Vital signs</SubLabel>
        <Vitals />
        <SubLabel>Underlying</SubLabel>
        <CheckRow name="underlying" options={UNDERLYING} />
        <SubLabel>Mobility</SubLabel>
        <CheckRow name="mobility" options={["Walk", "Wheel chair", "Walker/Stretcher/Cane"]} />
        <SubLabel>Fall risk</SubLabel>
        <CheckRow name="fall_risk" options={["Yes", "No"]} />
        <SubLabel>Fracture risk</SubLabel>
        <CheckRow name="fracture_risk" options={["Yes", "No"]} />
        <Field label="Operation / Lab / X-ray result"><Textarea name="operation_result" /></Field>
      </ReportSection>

      <ReportSection title="Subjective & Objective">
        <Textarea name="subjective" />
      </ReportSection>

      <ReportSection title="Physical Examination">
        <span className="text-sm font-medium text-ink">Consciousness</span>
        <CheckRow name="consciousness" options={["Alert", "Stupor", "Delirium", "Semi-coma", "Coma"]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ROM"><TextInput name="rom" /></Field>
          <Field label="Muscle tone"><TextInput name="muscle_tone" /></Field>
          <Field label="Muscle length"><TextInput name="muscle_length" /></Field>
          <Field label="Muscle power"><TextInput name="muscle_power" /></Field>
        </div>
      </ReportSection>

      <ReportSection title="Pinch & Grip Strength (kg)">
        <Field label="Date"><ThaiDateInput name="pinch_test_date" /></Field>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <span className="text-muted">ประเภท</span><span className="text-muted">Rt</span><span className="text-muted">Lt</span>
          {["Grip strength", "Lateral pinch", "3-Point pinch", "Tip pinch"].map((row) => {
            const slug = row.toLowerCase().replace(/[^a-z0-9]+/g, "_");
            return (
              <Fragment key={row}>
                <span className="self-center text-ink">{row}</span>
                <TextInput name={`${slug}_rt`} />
                <TextInput name={`${slug}_lt`} />
              </Fragment>
            );
          })}
        </div>
        {/* Pad to Pad Pinch is scored per finger on the paper form (thumb against
            the 2nd–5th finger, both hands) — not one Rt/Lt pair. */}
        <SubLabel>Pad to Pad Pinch</SubLabel>
        {(["rt", "lt"] as const).map((side) => (
          <div key={side} className="space-y-1">
            <p className="text-sm text-ink">{side === "rt" ? "Rt" : "Lt"} thumb with</p>
            <div className="grid grid-cols-4 gap-2">
              {["2nd", "3rd", "4th", "5th"].map((f) => (
                <Field key={f} label={`${f} finger`}>
                  <TextInput name={`pad_to_pad_${side}_${f}`} />
                </Field>
              ))}
            </div>
          </div>
        ))}
      </ReportSection>

      <ReportSection title="Sensory & Cognitive">
        {/* Mirrors the paper sheet (client review 2026-07): Sensation +
            Perception scored R/L with the I/Imp/A/NT key, then Cognitive Function. */}
        <p className="text-xs text-muted">Key : I=Intact, Imp=Impaired, A=Absent, NT=Not Tested</p>
        <SubLabel>Sensation</SubLabel>
        <RtLtGrid prefix="sensation" rows={["Stereognosis", "Proprioception", "Sharp/Dull", "Light Touch", "Temperature"]} />
        <SubLabel>Perception</SubLabel>
        <RtLtGrid prefix="perception" rows={["Visual Field", "Figure-Ground", "Body Scheme", "R/L Discrimination", "R/L Neglect"]} />
        {/* Client review 10/7/2569: Orientation gets its own line — it used to
            run on inline after the "Cognitive Function" heading. */}
        <SubLabel>Cognitive Function</SubLabel>
        <p className="text-sm text-ink">Orientation</p>
        <CheckRow name="orientation" options={["Person", "Place", "Time"]} />
        <p className="text-sm text-ink">Follows Commands</p>
        <CheckRow name="follows_commands" options={["One-Step", "Multi-Step", "Unable"]} />
        <p className="text-sm text-ink">Communications</p>
        <CheckRow name="communications" options={["Verbal", "Non-verbal", "None"]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Attention Span"><TextInput name="attention_span" /></Field>
          <Field label="Calculation"><TextInput name="calculation" /></Field>
          <Field label="Memory (Short)"><TextInput name="memory_short" /></Field>
          <Field label="Memory (Long)"><TextInput name="memory_long" /></Field>
        </div>
      </ReportSection>

      <ReportSection title="Swallowing Evaluation">
        <FoisSelect />
        <FillInList prefix="swallow_eval" items={SWALLOW_EVAL} cols={3} />
      </ReportSection>

      <ReportSection title="Activities Daily Living">
        <FillInList prefix="adl" items={ADL} />
      </ReportSection>

      <ReportSection title="รูปภาพ">
        <ReportPhotoUpload sessionId={sessionId} />
      </ReportSection>

      <PlanSection />
    </ReportFormShell>
  );
}

// ── รายงานประเมินแรกรับทางกิจกรรมบำบัด ──────────────────────────────────────
// The Thai letterhead report handed to the family, from the client's paper form
// (รายงานประเมินแรกรับ.pdf, 10/7/2569). Separate from the English Swallowing /
// Hand Function assessments the OT keeps for the clinic — client decision
// 2026-07-17. Field names are shared with the print template.

/** โรคประจำตัว on the letterhead — wider than the assessments' Underlying set. */
const UNDERLYING_TH = [
  "DM", "Hypertension", "Heart disease (on pacemaker)", "Dyslipidemia",
  "Obesity", "Rheumatoid", "Gout", "CKD",
];

const ABILITY_FIELDS: { name: string; label: string }[] = [
  { name: "ability_awareness", label: "1. การรับรู้และการตื่นตัว" },
  { name: "ability_sitting", label: "2. การควบคุมนั่งและการควบคุมศีรษะ" },
  { name: "ability_oral_face", label: "3. โครงสร้างปาก · กล้ามเนื้อใบหน้าและริมฝีปาก" },
  { name: "ability_oral_tongue", label: "3.1 โครงสร้างปาก · กล้ามเนื้อลิ้น" },
  { name: "ability_oral_jaw", label: "3.2 โครงสร้างปาก · ขากรรไกร" },
  { name: "ability_reflex", label: "4. ปฏิกิริยาอัตโนมัติเกี่ยวข้องกับการกลืน" },
  { name: "ability_swallow_oral", label: "5. ความสามารถด้านการกลืน · ระยะช่องปาก (Oral Phase)" },
  { name: "ability_swallow_pharyngeal", label: "5.1 ความสามารถด้านการกลืน · ระยะคอหอย (Pharyngeal phase)" },
  { name: "ability_swallow_esophageal", label: "5.2 ความสามารถด้านการกลืน · ระยะหลอดอาหาร (Esophageal phase)" },
];

export function AssessmentReportForm({ patientName, backHref, sessionId }: FormProps) {
  return (
    <ReportFormShell
      title="รายงานประเมินแรกรับ"
      patientName={patientName}
      backHref={backHref}
      sessionId={sessionId}
      reportType="assessment_report"
      submitLabel="บันทึก"
    >
      <ReportSection title="ข้อมูลทั่วไป">
        <Field label="การวินิจฉัยทางกิจกรรมบำบัด"><TextInput name="ot_diagnosis" /></Field>
        <SubLabel>โรคประจำตัว</SubLabel>
        <CheckRow name="underlying" options={UNDERLYING_TH} />
        <Field label="other"><TextInput name="underlying_other" /></Field>
      </ReportSection>

      <ReportSection title="ระดับความสามารถปัจจุบัน">
        {ABILITY_FIELDS.map((f) => (
          <Field key={f.name} label={f.label}><Textarea name={f.name} /></Field>
        ))}
      </ReportSection>

      <ReportSection title="เป้าหมายทางกิจกรรมบำบัด">
        <Field label="เป้าหมายของฟื้นฟูระยะยาว"><Textarea name="long_term_goal" /></Field>
        <Field label="ระยะเวลาในการฟื้นฟูสูงสุด"><TextInput name="max_rehab_duration" /></Field>
        <Field label="จำนวนครั้งที่แนะนำในการฟื้นฟูการกลืน (ครั้ง/สัปดาห์)">
          <TextInput name="sessions_per_week" inputMode="numeric" />
        </Field>
        <Field label="เป้าหมายของฟื้นฟูระยะสั้น"><Textarea name="short_term_goal" /></Field>
      </ReportSection>

      <ReportSection title="รูปภาพ">
        <ReportPhotoUpload sessionId={sessionId} />
      </ReportSection>

    </ReportFormShell>
  );
}

// ── ความก้าวหน้ารายเดือน = "Summary report" (client 3.pdf p.7) ─────────────

/**
 * Rating rows from the paper รายงานความก้าวหน้ารายเดือน — one row per ability,
 * exactly one level ticked. `keyOf` builds the payload name the print template reads.
 */
const ADL_LEVELS = ["น้อย", "ปานกลาง", "ดี", "ปกติ"];
const STRENGTH_LEVELS = ["แรงน้อย", "แรงปานกลาง", "แรงดี", "แรงปกติ"];

const ADL_ROWS = [
  { name: "adl_bed_mobility", label: "การเคลื่อนย้ายตัวบนเตียง" },
  { name: "adl_transfer", label: "ลุกนั่งจากที่นอน/เตียงไปยังเก้าอี้" },
  { name: "adl_dressing", label: "การสวมใส่เสื้อผ้า" },
  { name: "adl_eating", label: "การรับประทานอาหาร" },
  { name: "adl_locomotion", label: "การเคลื่อนที่ภายในห้อง/บ้าน" },
  { name: "adl_toileting", label: "การใช้ห้องน้ำ" },
  { name: "adl_bathing", label: "การอาบน้ำ" },
  { name: "adl_grooming", label: "ล้างหน้า/หวีผม/แปรงฟัน" },
];

const STRENGTH_ROWS = [
  { name: "strength_lips", label: "กล้ามเนื้อปาก" },
  { name: "strength_tongue", label: "การขยับลิ้น" },
  { name: "strength_jaw", label: "การควบคุมขากรรไกร" },
];

function RatingRows({ rows, levels }: { rows: { name: string; label: string }[]; levels: string[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.name} className="space-y-1">
          <p className="text-sm text-ink">{r.label}</p>
          <RadioRow name={r.name} options={levels} />
        </div>
      ))}
    </div>
  );
}

export function SummaryReportForm({ patientName, backHref, sessionId }: FormProps) {
  return (
    <ReportFormShell
      title="รายงานความก้าวหน้ารายเดือน"
      patientName={patientName}
      backHref={backHref}
      sessionId={sessionId}
      reportType="summary"
      submitLabel="บันทึก"
    >
      <ReportSection title="รายละเอียด">
        {/* Paper form: ช่วงเวลาการฟื้นฟู From : ____ To : ____ */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ช่วงเวลาการฟื้นฟู · From"><ThaiDateInput name="period_from" /></Field>
          <Field label="ช่วงเวลาการฟื้นฟู · To"><ThaiDateInput name="period_to" /></Field>
        </div>
        <Field label="การวินิจฉัยโรค"><TextInput name="diagnosis" /></Field>
        <Field label="การวินิจฉัยทางกิจกรรมบำบัด"><TextInput name="ot_diagnosis" /></Field>
        <FoisSelect label="FOIS (รายเดือน)" />
      </ReportSection>

      <ReportSection title="ความก้าวหน้าปัจจุบัน">
        <Textarea name="progress" />
      </ReportSection>

      <ReportSection title="ความสามารถด้านการทำกิจวัตรประจำวัน">
        <RatingRows rows={ADL_ROWS} levels={ADL_LEVELS} />
      </ReportSection>

      <ReportSection title="ความสามารถด้านการกลืน">
        <SubLabel>รับอาหารโดย</SubLabel>
        <RadioRow name="feeding_by" options={["NG", "PEG", "IV", "Oral"]} />
        <RatingRows rows={STRENGTH_ROWS} levels={STRENGTH_LEVELS} />
        <SubLabel>น้ำลายไหล</SubLabel>
        <RadioRow name="drooling" options={["ไม่มี", "มี"]} />
      </ReportSection>

      <ReportSection title="เป้าหมาย">
        <Field label="เป้าหมายปัจจุบัน"><Textarea name="current_goal" /></Field>
        <SubLabel>บรรลุเป้าหมาย</SubLabel>
        <RadioRow name="goal_achieved" options={["ผ่าน", "ไม่ผ่าน"]} />
        <Field label="หมายเหตุ (กรณีไม่ผ่าน)"><TextInput name="goal_achieved_note" /></Field>
        <Field label="โปรแกรมการฟื้นฟู/รักษา"><Textarea name="rehab_program" /></Field>
        {/* Client 22 ก.ค. 2569: the month is actually pickable, not just a label. */}
        <Field label="เป้าหมายเดือน · เลือกเดือน">
          <Select name="next_goal_month" defaultValue="">
            <option value="">เลือกเดือน</option>
            {THAI_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="เป้าหมายเดือน"><Textarea name="next_goal" /></Field>
      </ReportSection>

      <ReportSection title="รูปภาพ">
        <ReportPhotoUpload sessionId={sessionId} />
      </ReportSection>
    </ReportFormShell>
  );
}
