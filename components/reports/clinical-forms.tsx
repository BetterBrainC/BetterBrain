"use client";

import { Fragment } from "react";
import { ReportFormShell, ReportSection, CheckRow } from "@/components/reports/report-shell";
import { ReportPhotoUpload } from "@/components/reports/report-photo-upload";
import { Field, TextInput, Textarea, Select } from "@/components/ui/field";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { FOIS_LABEL } from "@/lib/i18n/th";

type FormProps = { patientName: string; backHref: string; sessionId: string };

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
function FillInList({ prefix, items }: { prefix: string; items: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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

function Vitals({ withTemp = false, withSpO2 = true }: { withTemp?: boolean; withSpO2?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="BP (mmHg)"><TextInput name="bp" /></Field>
      <Field label="HR (bpm)"><TextInput name="hr" /></Field>
      <Field label="RR (/min)"><TextInput name="rr" /></Field>
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
// Swallowing Evaluation — order + wording follow the paper sample. FOIS (a defined
// scale) is rendered as its own select between the two halves.
const SWALLOW_EVAL_A = ["Tracheostomy", "Lips control", "Cough reflex", "Feeding by", "Bite reflex", "Tongue movement", "Gag reflex"];
const SWALLOW_EVAL_B = ["Jaw control", "Drooling", "Swallow reflex"];

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
        <span className="text-sm font-medium text-ink">Underlying</span>
        <CheckRow name="underlying" options={["DM", "Hypertension", "Heart disease", "Dyslipidemia", "CKD", "Rheumatoid", "Gout", "No"]} />
        <span className="text-sm font-medium text-ink">Mobility</span>
        <CheckRow name="mobility" options={["Walk", "Wheel chair", "Walker/Stretcher/Cane"]} />
        <span className="text-sm font-medium text-ink">Fall risk</span>
        <CheckRow name="fall_risk" options={["Yes", "No"]} />
        <span className="text-sm font-medium text-ink">Fracture risk</span>
        <CheckRow name="fracture_risk" options={["Yes", "No"]} />
      </ReportSection>

      <ReportSection title="Subjective & Objective">
        <span className="text-sm font-medium text-ink">Vital signs</span>
        <Vitals />
        <Field label="Subjective & Objective"><Textarea name="subjective_objective" /></Field>
      </ReportSection>

      <ReportSection title="Physical examination">
        <Field label="Physical examination"><Textarea name="physical_exam" /></Field>
      </ReportSection>

      <ReportSection title="Swallowing Evaluation">
        <FillInList prefix="swallow_eval" items={SWALLOW_EVAL_A} />
        <FoisSelect />
        <FillInList prefix="swallow_eval" items={SWALLOW_EVAL_B} />
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
        <Field label="Recommendations">
          <Textarea name="recommendations" placeholder="Soft diet to regular diet, Regular liquids (First time under supervision of the OT)" />
        </Field>
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
        <span className="text-sm font-medium text-ink">Precaution</span>
        <CheckRow name="precaution" options={["DM", "Hypertension", "Heart disease", "N/A", "Others"]} />
        <span className="text-sm font-medium text-ink">Mobility</span>
        <CheckRow name="mobility" options={["Walk", "Wheel chair", "Walker/Stretcher/Cane"]} />
        <span className="text-sm font-medium text-ink">Fall risk</span>
        <CheckRow name="fall_risk" options={["Yes", "No"]} />
        <span className="text-sm font-medium text-ink">Fracture risk</span>
        <CheckRow name="fracture_risk" options={["Yes", "No"]} />
        <Field label="Operation / Lab / X-ray result"><Textarea name="operation_result" /></Field>
        <Field label="Subjective"><Textarea name="subjective" /></Field>
      </ReportSection>

      <ReportSection title="Objective · Vital signs">
        <Vitals withTemp withSpO2={false} />
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
      </ReportSection>

      <ReportSection title="Sensory & Cognitive">
        <Field label="Sensory (Stereognosis / Proprioception / Light touch / Temperature)"><Textarea name="sensory" /></Field>
        <span className="text-sm font-medium text-ink">Orientation</span>
        <CheckRow name="orientation" options={["Person", "Place", "Time"]} />
        <span className="text-sm font-medium text-ink">Follows commands</span>
        <CheckRow name="follows_commands" options={["One-Step", "Multi-Step", "Unable"]} />
      </ReportSection>

      <ReportSection title="Swallowing Evaluation">
        <FillInList prefix="swallow_eval" items={SWALLOW_EVAL_A} />
        <FoisSelect />
        <FillInList prefix="swallow_eval" items={SWALLOW_EVAL_B} />
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

// ── ความก้าวหน้ารายเดือน = "Summary report" (client 3.pdf p.7) ─────────────
export function SummaryReportForm({ patientName, backHref, sessionId }: FormProps) {
  return (
    <ReportFormShell
      title="ความก้าวหน้ารายเดือน"
      patientName={patientName}
      backHref={backHref}
      sessionId={sessionId}
      reportType="summary"
      submitLabel="บันทึก"
    >
      <ReportSection title="รายละเอียด">
        <Field label="ช่วงเวลาการฟื้นฟู"><TextInput name="period" placeholder="เช่น มิ.ย. 2569" /></Field>
        <Field label="การวินิจฉัยโรค"><TextInput name="diagnosis" /></Field>
        <Field label="การวินิจฉัยทางกิจกรรมบำบัด"><TextInput name="ot_diagnosis" /></Field>
        <FoisSelect label="FOIS (รายเดือน)" />
      </ReportSection>
      <ReportSection title="ความก้าวหน้า">
        <Field label="เป้าหมายการฟื้นฟูปัจจุบัน"><Textarea name="current_goal" /></Field>
        <Field label="ความก้าวหน้าการฟื้นฟู"><Textarea name="progress" /></Field>
        <Field label="เป้าหมายการฟื้นฟูต่อไป"><Textarea name="next_goal" /></Field>
      </ReportSection>
      <ReportSection title="รูปภาพ">
        <ReportPhotoUpload sessionId={sessionId} />
      </ReportSection>
    </ReportFormShell>
  );
}
