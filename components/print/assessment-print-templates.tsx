import { formatThaiDate } from "@/lib/date/buddhist";
import { FOIS_LABEL } from "@/lib/i18n/th";
import type { ReportDetail } from "@/lib/data/queries";

/**
 * Print layouts for the two English clinical assessment forms the OT keeps for
 * the clinic — Swallowing Assessment · Hand Function Assessment (client source
 * docs, 2026-07-17). Distinct from the Thai letterhead รายงานประเมินแรกรับ that
 * goes to the family, which lives in report-print-templates.tsx.
 *
 * Client 22 ก.ค. 2569: DOB is pulled from the patient record and no dotted
 * filler rules print on any export — values render as plain text.
 */

const pv = (r: ReportDetail, k: string) => String(r.payload[k] ?? "").trim();

/** payload value that may be a checkbox array. */
function pvList(r: ReportDetail, k: string): string[] {
  const v = r.payload[k];
  if (Array.isArray(v)) return v.map((x) => String(x));
  return v ? [String(v)] : [];
}

/** `Label : value` — plain text, no dotted rule (client 22 ก.ค. 2569). */
function Line({ label, value, width = "flex-1" }: { label: string; value?: string; width?: string }) {
  return (
    <p className="flex items-baseline gap-1">
      <span className="shrink-0 font-bold">{label} :</span>
      <span className={`${width} min-h-5 whitespace-pre-wrap break-words`}>
        {value}
      </span>
    </p>
  );
}

function Boxes({ label, options, on }: { label: string; options: string[]; on: string[] }) {
  return (
    <p>
      <span className="font-bold">{label} :</span>{" "}
      {options.map((o) => (
        <span key={o} className="mr-3 inline-block whitespace-nowrap">
          {on.includes(o) ? "☑" : "☐"} {o}
        </span>
      ))}
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 space-y-1 break-inside-avoid">
      <h2 className="font-bold">{title} :</h2>
      {children}
    </section>
  );
}

function NameHeader({ r }: { r: ReportDetail }) {
  return (
    <div className="space-y-1">
      <p className="flex items-baseline gap-1">
        <span className="shrink-0 font-bold">Name :</span>
        <span className="flex-1">{r.patientName}</span>
        <span className="shrink-0 font-bold">Age :</span>
        <span className="w-16 text-center">{r.patientAge ?? ""}</span>
        <span className="shrink-0 font-bold">DOB :</span>
        {/* วันเดือนปีเกิด from the patient record (client 22 ก.ค. 2569). */}
        <span className="w-32 text-center">{r.patientDob ? formatThaiDate(r.patientDob, { month: "short" }) : ""}</span>
      </p>
      <Line label="Diagnosis" value={pv(r, "diagnosis")} />
      <Line label="Chief Complaint" value={pv(r, "chief_complaint")} />
    </div>
  );
}

function RiskRows({ r }: { r: ReportDetail }) {
  return (
    <>
      <Boxes label="Mobility" options={["Walk", "Wheel chair", "Walker/Stretcher/Cane"]} on={pvList(r, "mobility")} />
      <Boxes label="Fall risk" options={["Yes", "No"]} on={pvList(r, "fall_risk")} />
      <Boxes label="Fracture risk" options={["Yes", "No"]} on={pvList(r, "fracture_risk")} />
    </>
  );
}

// Swallowing Evaluation — the paper sheet's three columns; `key` is the form's
// FillInList slug. Bite reflex has no field (dropped 2026-07) → prints blank.
const SWALLOW_EVAL_ROWS: { label: string; key: string | null }[] = [
  { label: "Tracheostomy", key: "swallow_eval_tracheostomy" },
  { label: "Lips control", key: "swallow_eval_lips_control" },
  { label: "Cough reflex", key: "swallow_eval_cough_reflex" },
  { label: "Feeding by", key: "swallow_eval_feeding_by" },
  { label: "Bite reflex", key: null },
  { label: "Tongue movement", key: "swallow_eval_tongue_movement" },
  { label: "Gag reflex", key: "swallow_eval_gag_reflex" },
  { label: "Jaw control", key: "swallow_eval_jaw_control" },
  { label: "Drooling", key: "swallow_eval_drooling" },
  { label: "Swallow reflex", key: "swallow_eval_swallow_reflex" },
];

const ADL_ROWS: { label: string; key: string }[] = [
  { label: "Bed mobility", key: "adl_bed_mobility" },
  { label: "Locomotion", key: "adl_locomotion" },
  { label: "Eating", key: "adl_eating" },
  { label: "Bathing", key: "adl_bathing" },
  { label: "Transfer", key: "adl_transfer" },
  { label: "Toileting", key: "adl_toileting" },
  { label: "Dressing", key: "adl_dressing" },
  { label: "Hygiene/Grooming", key: "adl_hygiene_grooming" },
];

function SwallowEvalSection({ r }: { r: ReportDetail }) {
  const fois = pv(r, "fois");
  return (
    <Section title="Swallowing Evaluation">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {SWALLOW_EVAL_ROWS.map((row) => (
          <Line key={row.label} label={row.label} value={row.key ? pv(r, row.key) : ""} />
        ))}
      </div>
      <Line
        label="Functional Oral Intake Scale (FOIS)"
        value={fois ? (FOIS_LABEL[fois as keyof typeof FOIS_LABEL] ?? fois) : ""}
      />
    </Section>
  );
}

function AdlSection({ r }: { r: ReportDetail }) {
  return (
    <Section title="Activities Daily Living">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {ADL_ROWS.map((row) => (
          <Line key={row.key} label={row.label} value={pv(r, row.key)} />
        ))}
      </div>
    </Section>
  );
}

function PlanSection({ r }: { r: ReportDetail }) {
  const reassess = pv(r, "reassessment_date");
  return (
    <Section title="Plan of Treatment">
      <Line label="Long term goal" value={pv(r, "long_term_goal")} />
      <Line label="Short term goal" value={pv(r, "short_term_goal")} />
      <Line
        label="Re-assessment date"
        value={/^\d{4}-\d{2}-\d{2}$/.test(reassess) ? formatThaiDate(reassess, { month: "long" }) : reassess}
      />
      <Line label="Treatment" value={pv(r, "treatment")} />
      <Line label="Post treatment" value={pv(r, "post_treatment")} />
    </Section>
  );
}

function TherapistFooter({ r }: { r: ReportDetail }) {
  return (
    <div className="mt-6 space-y-1 break-inside-avoid">
      <Line label="Therapist Name" value={r.authorName} width="w-80" />
      <Line label="Date" value={formatThaiDate(r.date, { month: "long" })} width="w-52" />
    </div>
  );
}

// ── Swallowing Assessment ─────────────────────────────────────────────────
const INDIRECT_TESTS = [
  "1.1 Being vigilant at least 10 minutes",
  "1.2 Able to cough (voluntary) or throat clearing",
  "1.3 Able to swallow saliva",
];

export function SwallowingAssessmentPrint({ r }: { r: ReportDetail }) {
  const indirect = pvList(r, "indirect_test");
  return (
    <>
      <h1 className="py-3 text-center text-base font-bold">Swallowing Assessment</h1>
      <NameHeader r={r} />
      <div className="mt-2 space-y-1">
        <Boxes
          label="Underlying"
          options={["DM", "Hypertension", "Heart disease", "Dyslipidemia", "CKD", "Rheumatoid", "Gout", "No"]}
          on={pvList(r, "underlying")}
        />
        <RiskRows r={r} />
      </div>

      <Section title="Subjective &amp; Objective">
        <p>
          <span className="font-bold">Vital signs</span>{" "}
          <span className="font-bold">BP :</span> {pv(r, "bp") || "-"} mmHg{" "}
          <span className="font-bold">HR :</span> {pv(r, "hr") || "-"} bpm{" "}
          <span className="font-bold">RR :</span> {pv(r, "rr") || "-"} times/min{" "}
          <span className="font-bold">SpO2 :</span> {pv(r, "spo2") || "-"} %
        </p>
        <p className="min-h-5 whitespace-pre-wrap break-words">
          {pv(r, "subjective_objective")}
        </p>
      </Section>

      <Section title="Physical examination">
        <p className="min-h-5 whitespace-pre-wrap break-words">
          {pv(r, "physical_exam")}
        </p>
      </Section>

      <SwallowEvalSection r={r} />

      <Section title="Part 1 Indirect Swallowing Test">
        {INDIRECT_TESTS.map((t) => (
          <p key={t}>{indirect.includes(t) ? "☑" : "☐"} {t}</p>
        ))}
        <p className="italic">If Yes to all, continue to part 2</p>
      </Section>

      <Section title="Part 2 Direct Swallowing Test">
        <p className="font-bold">2.1 Semi solid trial : Pudding level 1/2 teaspoon</p>
        <Boxes label="Trial" options={["1st", "2nd", "3rd", "4th", "5th"]} on={pvList(r, "semisolid")} />
        <p className="italic">If swallow successfully, continue to part 2.2</p>

        <p className="mt-2 font-bold">2.2 Liquid trial : Water *Remark : ml = milliliter</p>
        <Boxes label="Trial" options={["3 ml", "5 ml", "10 ml", "20 ml", "50 ml"]} on={pvList(r, "liquid")} />
        <p className="italic">If swallow successfully, continue to part 2.3</p>

        <p className="mt-2 font-bold">2.3 Solid trial : Cracker</p>
        <Boxes label="Trial" options={["1st", "2nd", "3rd", "4th", "5th"]} on={pvList(r, "solid")} />

        <p className="mt-2 italic">If swallow successfully</p>
        <p>
          {pvList(r, "result").length ? "☑" : "☐"} Result : safe to swallow, minimal risk of aspiration
        </p>
        <p>
          <span className="font-bold">Recommendations :</span> Soft diet to regular diet, Regular liquids
          (First time under supervision of the OT)
        </p>
        <Line label="Remarks" value={pv(r, "remarks")} />
      </Section>

      <AdlSection r={r} />
      <PlanSection r={r} />
      <TherapistFooter r={r} />
    </>
  );
}

// ── Hand Function Assessment ──────────────────────────────────────────────
const PINCH_ROWS: { label: string; key: string }[] = [
  { label: "Grip strength", key: "grip_strength" },
  { label: "Lateral Pinch", key: "lateral_pinch" },
  { label: "3-Point Pinch", key: "3_point_pinch" },
  { label: "Tip Pinch", key: "tip_pinch" },
];

const SENSATION_ROWS: { label: string; key: string }[] = [
  { label: "Stereognosis", key: "sensation_stereognosis" },
  { label: "Proprioception", key: "sensation_proprioception" },
  { label: "Sharp/Dull", key: "sensation_sharp_dull" },
  { label: "Light Touch", key: "sensation_light_touch" },
  { label: "Temperature", key: "sensation_temperature" },
];

const PERCEPTION_ROWS: { label: string; key: string }[] = [
  { label: "Visual Field", key: "perception_visual_field" },
  { label: "Figure-Ground", key: "perception_figure_ground" },
  { label: "Body Scheme", key: "perception_body_scheme" },
  { label: "R/L Discrimination", key: "perception_r_l_discrimination" },
  { label: "R/L Neglect", key: "perception_r_l_neglect" },
];

const FINGERS = ["2nd", "3rd", "4th", "5th"];

/** Sensation / Perception rows scored R/L — `key` + _r / _l per the form's RtLtGrid. */
function RlRows({ r, rows }: { r: ReportDetail; rows: { label: string; key: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
      {rows.map((row) => (
        <Line
          key={row.key}
          label={row.label}
          value={[pv(r, `${row.key}_r`), pv(r, `${row.key}_l`)].filter(Boolean).join(" / ")}
        />
      ))}
    </div>
  );
}

export function HandAssessmentPrint({ r }: { r: ReportDetail }) {
  const pinchDate = pv(r, "pinch_test_date");
  return (
    <>
      <h1 className="py-3 text-center text-base font-bold">Hand Function Assessment</h1>
      <NameHeader r={r} />
      <div className="mt-2 space-y-1">
        {/* Client review 2026-07 renamed the paper's "Precaution" to Underlying
            and swapped in the Swallowing form's option set. */}
        <Boxes
          label="Underlying"
          options={["DM", "Hypertension", "Heart disease", "Dyslipidemia", "CKD", "Rheumatoid", "Gout", "No"]}
          on={pvList(r, "underlying")}
        />
        <RiskRows r={r} />
        <Line label="Operation/Lab/X-ray result" value={pv(r, "operation_result")} />
        <Line label="Subjective" value={pv(r, "subjective")} />
        <p>
          <span className="font-bold">Objective : Vital Signs</span>{" "}
          <span className="font-bold">BP :</span> {pv(r, "bp") || "-"} mmHg{" "}
          <span className="font-bold">HR :</span> {pv(r, "hr") || "-"} bpm{" "}
          <span className="font-bold">RR :</span> {pv(r, "rr") || "-"} times/min{" "}
          <span className="font-bold">SpO2 :</span> {pv(r, "spo2") || "-"} %
        </p>
      </div>

      <Section title="Physical Examination">
        <Boxes
          label="Consciousness"
          options={["Alert", "Stupor", "Delirium", "Semi-coma", "Coma"]}
          on={pvList(r, "consciousness")}
        />
        <Line label="ROM" value={pv(r, "rom")} />
        <Line label="Muscle tone" value={pv(r, "muscle_tone")} />
        <Line label="Muscle length" value={pv(r, "muscle_length")} />
        <Line label="Muscle power" value={pv(r, "muscle_power")} />
      </Section>

      <Section title="Pinch Grip Strength Test (kilogram)">
        <Line
          label="Date"
          value={/^\d{4}-\d{2}-\d{2}$/.test(pinchDate) ? formatThaiDate(pinchDate, { month: "long" }) : pinchDate}
          width="w-52"
        />
        {PINCH_ROWS.map((row) => (
          <p key={row.key} className="flex items-baseline gap-1">
            <span className="w-40 shrink-0 font-bold">{row.label} :</span>
            <span className="shrink-0">Rt</span>
            <span className="w-24 text-center">{pv(r, `${row.key}_rt`)}</span>
            <span className="shrink-0">Lt</span>
            <span className="w-24 text-center">{pv(r, `${row.key}_lt`)}</span>
          </p>
        ))}
        <p className="mt-1 font-bold">Pad to Pad Pinch</p>
        {(["rt", "lt"] as const).map((side) => (
          <p key={side} className="flex items-baseline gap-1">
            <span className="w-32 shrink-0">{side === "rt" ? "Rt" : "Lt"} thumb with:</span>
            {FINGERS.map((f) => (
              <span key={f} className="flex items-baseline gap-1">
                <span className="shrink-0">{f} finger</span>
                <span className="w-16 text-center">
                  {pv(r, `pad_to_pad_${side}_${f}`)}
                </span>
              </span>
            ))}
          </p>
        ))}
      </Section>

      <Section title="Sensory">
        <p className="italic">Key : I = Intact, Imp = Impaired, A = Absent, NT = Not Tested</p>
        <p className="mt-1 font-bold">Sensation (R/L)</p>
        <RlRows r={r} rows={SENSATION_ROWS} />
        <p className="mt-2 font-bold">Perception (R/L)</p>
        <RlRows r={r} rows={PERCEPTION_ROWS} />
      </Section>

      <Section title="Cognitive Function">
        <Boxes label="Orientation" options={["Person", "Place", "Time"]} on={pvList(r, "orientation")} />
        <Boxes label="Follows Commands" options={["One-Step", "Multi-Step", "Unable"]} on={pvList(r, "follows_commands")} />
        <Boxes label="Communications" options={["Verbal", "Non-verbal", "None"]} on={pvList(r, "communications")} />
        <Line label="Attention Span" value={pv(r, "attention_span")} />
        <Line label="Memory (Short)" value={pv(r, "memory_short")} />
        <Line label="Memory (Long)" value={pv(r, "memory_long")} />
        <Line label="Calculation" value={pv(r, "calculation")} />
      </Section>

      <SwallowEvalSection r={r} />
      <AdlSection r={r} />
      <PlanSection r={r} />
      <TherapistFooter r={r} />
    </>
  );
}
