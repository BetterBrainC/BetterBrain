"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

type Kind = "knowledge" | "stress";

const KIND_TITLE: Record<Kind, string> = {
  knowledge: "แบบทดสอบความรู้ประจำปี",
  stress: "แบบประเมินความเครียดประจำปี",
};

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** Director: append a question to the year-versioned KPI question bank (kpi_templates). */
export async function addKpiQuestion(input: {
  year: number;
  kind: Kind;
  question: string;
  answerType?: "text" | "choice";
  options?: string[];
  answer?: string;
}): Promise<ActionResult> {
  const question = input.question.trim();
  if (!question) return { error: "กรอกคำถาม" };
  const { supabase, userId } = await authed();

  const { data: existing } = await supabase
    .from("kpi_templates")
    .select("id, questions")
    .eq("kind", input.kind)
    .eq("period_year", input.year)
    .maybeSingle();

  // stress = scale; knowledge = text or multiple-choice (with answer key).
  const at = input.kind === "stress" ? "scale" : (input.answerType ?? "text");
  const newQ: Record<string, unknown> = { id: randomUUID(), question, answer_type: at };
  if (at === "choice") {
    const opts = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return { error: "ต้องมีตัวเลือกอย่างน้อย 2 ข้อ" };
    if (!input.answer || !opts.includes(input.answer)) return { error: "เลือกคำตอบที่ถูกต้อง" };
    newQ.options = opts;
    newQ.answer = input.answer;
  }

  if (existing) {
    const prev = Array.isArray((existing as { questions: unknown }).questions)
      ? ((existing as { questions: unknown[] }).questions as unknown[])
      : [];
    const { error } = await supabase
      .from("kpi_templates")
      .update({ questions: [...prev, newQ] as never })
      .eq("id", (existing as { id: string }).id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("kpi_templates").insert({
      kind: input.kind,
      title: KIND_TITLE[input.kind],
      period_year: input.year,
      questions: [newQ] as never,
      created_by: userId,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/staff/measurement");
  return { ok: true };
}

/** Director: remove a question from a template's question bank. */
export async function removeKpiQuestion(input: {
  templateId: string;
  questionId: string;
}): Promise<ActionResult> {
  const { supabase } = await authed();
  const { data: tmpl } = await supabase
    .from("kpi_templates")
    .select("questions")
    .eq("id", input.templateId)
    .maybeSingle();
  const prev = Array.isArray((tmpl as { questions?: unknown })?.questions)
    ? ((tmpl as { questions: { id: string }[] }).questions)
    : [];
  const next = prev.filter((q) => q.id !== input.questionId);
  const { error } = await supabase
    .from("kpi_templates")
    .update({ questions: next as never })
    .eq("id", input.templateId);
  if (error) return { error: error.message };
  revalidatePath("/staff/measurement");
  return { ok: true };
}

/** Director: edit an existing question in the year-versioned KPI question bank. */
export async function updateKpiQuestion(input: {
  templateId: string;
  questionId: string;
  kind: Kind;
  question: string;
  answerType?: "text" | "choice";
  options?: string[];
  answer?: string;
}): Promise<ActionResult> {
  const question = input.question.trim();
  if (!question) return { error: "กรอกคำถาม" };
  const { supabase } = await authed();

  const at = input.kind === "stress" ? "scale" : (input.answerType ?? "text");
  let opts: string[] = [];
  if (at === "choice") {
    opts = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return { error: "ต้องมีตัวเลือกอย่างน้อย 2 ข้อ" };
    if (!input.answer || !opts.includes(input.answer)) return { error: "เลือกคำตอบที่ถูกต้อง" };
  }

  const { data: tmpl } = await supabase
    .from("kpi_templates")
    .select("questions")
    .eq("id", input.templateId)
    .maybeSingle();
  const prev = Array.isArray((tmpl as { questions?: unknown })?.questions)
    ? ((tmpl as { questions: { id: string }[] }).questions)
    : [];
  if (!prev.some((q) => q.id === input.questionId)) return { error: "ไม่พบคำถาม" };
  const next = prev.map((q) => {
    if (q.id !== input.questionId) return q;
    const nq: Record<string, unknown> = { id: input.questionId, question, answer_type: at };
    if (at === "choice") {
      nq.options = opts;
      nq.answer = input.answer;
    }
    return nq;
  });
  const { error } = await supabase
    .from("kpi_templates")
    .update({ questions: next as never })
    .eq("id", input.templateId);
  if (error) return { error: error.message };
  revalidatePath("/staff/measurement");
  return { ok: true };
}

/** Employee records a service-recipient KPI evaluation (FOIS / Barthel / Functional / FIM). */
export async function savePatientKpi(input: {
  patientId: string;
  fois: string | null;
  barthel: number | null;
  functionChecklist: Record<string, boolean>;
  fim: number | null;
}): Promise<ActionResult> {
  if (!input.patientId) return { error: "เลือกผู้รับบริการ" };
  const { supabase, userId } = await authed();
  if (!userId) return { error: "ไม่ได้เข้าสู่ระบบ" };
  // FIM scoring criteria are still pending from the client; capture the raw
  // score in `answers` so data can be collected now without losing it.
  const answers = { fim: input.fim };
  const { error } = await supabase.from("kpi_evaluations").insert({
    target: "patient",
    patient_id: input.patientId,
    evaluated_by: userId,
    fois_level: (input.fois || null) as never,
    barthel_index: input.barthel,
    function_checklist: input.functionChecklist as never,
    answers: answers as never,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/measurement");
  return { ok: true };
}

export interface KpiSubmitResult extends ActionResult {
  score?: number | null; // % for scored knowledge tests
  graded?: boolean;
}

/** Employee submits their own self-assessment. Knowledge MC is graded SERVER-SIDE
 *  (the answer key is read with the service role; employees never see it). */
export async function saveEmployeeKpi(input: {
  kind: Kind;
  templateId: string | null;
  year: number;
  answers: Record<string, string>;
}): Promise<KpiSubmitResult> {
  const { supabase, userId } = await authed();
  if (!userId) return { error: "ไม่ได้เข้าสู่ระบบ" };

  let score: number | null = null;
  let graded = false;
  if (input.kind === "knowledge" && input.templateId) {
    const admin = createAdminClient();
    const { data: tmpl } = await admin
      .from("kpi_templates")
      .select("questions")
      .eq("id", input.templateId)
      .maybeSingle();
    const qs = Array.isArray((tmpl as { questions?: unknown } | null)?.questions)
      ? ((tmpl as { questions: { id: string; answer_type?: string; answer?: string }[] }).questions)
      : [];
    const choice = qs.filter((q) => q.answer_type === "choice");
    if (choice.length) {
      const correct = choice.filter((q) => input.answers[q.id] === q.answer).length;
      score = Math.round((correct / choice.length) * 100);
      graded = true;
    }
  }

  const { error } = await supabase.from("kpi_evaluations").insert({
    target: "employee",
    employee_id: userId,
    evaluated_by: userId,
    employee_kpi_kind: input.kind,
    template_id: input.templateId,
    answers: input.answers as never,
    score,
    period_year: input.year,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/measurement");
  return { ok: true, score, graded };
}
