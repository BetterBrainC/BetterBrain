import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { formatThaiTime, formatThaiClock, formatThaiDateTime, formatThaiDate } from "@/lib/date/buddhist";
import { DEFAULT_EXERCISE_GUIDE, parseExerciseItems, type ExerciseGuideItem } from "@/lib/content/exercise-guide";
import type { Database } from "@/lib/supabase/types";

type Diagnosis = Database["public"]["Enums"]["diagnosis_category"];
type PatientStatus = Database["public"]["Enums"]["patient_status"];
type SessionStatus = Database["public"]["Enums"]["session_status"];
type RequestStatus = Database["public"]["Enums"]["request_status"];

// NOTE: Supabase's select-string result inference collapses to `never` against
// our large generated Database type (deep instantiation), so we keep the typed
// client for safety on writes/RPCs and hand-assert read shapes here.
function rows<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : []) as T[];
}
function one<T>(data: unknown): T | null {
  return (data ?? null) as T | null;
}

/** Today's date as a Bangkok-local YYYY-MM-DD string. */
export function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeLabel(startISO: string | null, endISO: string | null): string {
  if (!startISO) return "";
  const s = formatThaiClock(startISO);
  return endISO ? `${s}–${formatThaiClock(endISO)} น.` : `${s} น.`;
}

export interface SessionRow {
  id: string;
  timeLabel: string;
  /** Raw start/end instants (UTC ISO) for client-side live time math. */
  scheduledStartISO: string | null;
  scheduledEndISO: string | null;
  patientName: string;
  program: string | null;
  status: SessionStatus;
  kind: "assessment" | "treatment";
}

type RawSession = {
  id: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: SessionStatus;
  kind: "assessment" | "treatment" | null;
  patients: { full_name: string | null; training_program: string | null } | null;
};

export async function getMyTodaySessions(): Promise<SessionRow[]> {
  const u = await getCurrentUser();
  if (!u) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("id, scheduled_start, scheduled_end, status, kind, patients(full_name, training_program)")
    .eq("employee_id", u.id)
    .eq("scheduled_date", bangkokToday())
    .order("scheduled_start");
  return rows<RawSession>(data).map((s) => ({
    id: s.id,
    timeLabel: timeLabel(s.scheduled_start, s.scheduled_end),
    scheduledStartISO: s.scheduled_start,
    scheduledEndISO: s.scheduled_end,
    patientName: s.patients?.full_name ?? "—",
    program: s.patients?.training_program ?? null,
    status: s.status,
    kind: s.kind === "assessment" ? "assessment" : "treatment",
  }));
}

/** Cases for a check-in correction: PAST cases only, within the last 7 days. */
export async function getMyRecentSessions(): Promise<{ id: string; label: string }[]> {
  const u = await getCurrentUser();
  if (!u) return [];
  const today = bangkokToday();
  const fromDate = new Date(`${today}T00:00:00Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - 7);
  const fromISO = fromDate.toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("id, scheduled_date, patients(full_name)")
    .eq("employee_id", u.id)
    .gte("scheduled_date", fromISO)
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: false })
    .limit(50);
  return rows<{ id: string; scheduled_date: string; patients: { full_name: string | null } | null }>(data).map((s) => ({
    id: s.id,
    label: `${formatThaiDate(s.scheduled_date)} · ${s.patients?.full_name ?? "—"}`,
  }));
}

export interface SessionDetail {
  id: string;
  patientId: string;
  patientName: string;
  program: string | null;
  address: string | null;
  timeLabel: string;
  scheduledStartISO: string | null;
  scheduledEndISO: string | null;
  homeLat: number | null;
  homeLng: number | null;
  courseUsed: number;
  courseTotal: number;
  status: SessionStatus;
  kind: "assessment" | "treatment";
}

/** Current user's display name — prefills "OT Name" on the daily report. */
export async function getMyName(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";
  const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return one<{ full_name: string }>(data)?.full_name ?? "";
}

export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("id, patient_id, scheduled_start, scheduled_end, status, kind, course_id, patients(full_name, training_program, address, home_lat, home_lng)")
    .eq("id", id)
    .maybeSingle();
  const s = one<{
    id: string;
    patient_id: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    status: SessionStatus;
    kind: "assessment" | "treatment";
    course_id: string | null;
    patients: {
      full_name: string | null;
      training_program: string | null;
      address: string | null;
      home_lat: number | null;
      home_lng: number | null;
    } | null;
  }>(data);
  if (!s) return null;

  let used = 0;
  let total = 0;
  if (s.course_id) {
    const { data: prog } = await supabase
      .from("course_progress")
      .select("used_sessions, total_sessions")
      .eq("course_id", s.course_id)
      .maybeSingle();
    const p = one<{ used_sessions: number; total_sessions: number }>(prog);
    used = Number(p?.used_sessions ?? 0);
    total = Number(p?.total_sessions ?? 0);
  }

  return {
    id: s.id,
    patientId: s.patient_id,
    patientName: s.patients?.full_name ?? "—",
    program: s.patients?.training_program ?? null,
    address: s.patients?.address ?? null,
    timeLabel: timeLabel(s.scheduled_start, s.scheduled_end),
    scheduledStartISO: s.scheduled_start,
    scheduledEndISO: s.scheduled_end,
    homeLat: s.patients?.home_lat ?? null,
    homeLng: s.patients?.home_lng ?? null,
    courseUsed: used,
    courseTotal: total,
    status: s.status,
    kind: s.kind,
  };
}

export interface PatientRow {
  id: string;
  hn: string | null;
  name: string;
  ageYears: number | null;
  program: string | null;
  diagnosis: Diagnosis | null;
  status: PatientStatus;
  courseUsed: number;
  courseTotal: number;
  /** ISO timestamp — powers the dashboard วัน/สัปดาห์/เดือน/ปี filter. */
  createdAt: string | null;
}

export async function getPatients(): Promise<PatientRow[]> {
  const supabase = await createClient();
  // Only booked (ทำนัดแล้ว) recipients belong on the patients page; รอชำระเงิน /
  // รอทำนัด / ยกเลิกนัด live on the การทำนัด (bookings) page instead.
  const { data } = await supabase
    .from("patients")
    .select("id, hn, full_name, age_years, training_program, diagnosis_category, status, created_at")
    .eq("appointment_status", "booked")
    // Latest-registered first — client rule: every recipient list leads with
    // the newest entries.
    .order("created_at", { ascending: false });
  const patients = rows<{
    id: string; hn: string | null; full_name: string; age_years: number | null;
    training_program: string | null; diagnosis_category: Diagnosis | null; status: PatientStatus;
    created_at: string | null;
  }>(data);
  if (patients.length === 0) return [];

  const { data: cData } = await supabase
    .from("courses")
    .select("id, patient_id, total_sessions")
    .in("patient_id", patients.map((p) => p.id));
  const courses = rows<{ id: string; patient_id: string; total_sessions: number }>(cData);

  const { data: pData } = await supabase
    .from("course_progress")
    .select("course_id, used_sessions, total_sessions");
  const progress = rows<{ course_id: string; used_sessions: number; total_sessions: number }>(pData);

  const progByCourse = new Map(progress.map((r) => [r.course_id, r]));
  const byPatient = new Map<string, { used: number; total: number }>();
  for (const c of courses) {
    const pr = progByCourse.get(c.id);
    byPatient.set(c.patient_id, {
      used: Number(pr?.used_sessions ?? 0),
      total: Number(pr?.total_sessions ?? c.total_sessions ?? 0),
    });
  }

  return patients.map((p) => ({
    id: p.id,
    hn: p.hn,
    name: p.full_name,
    ageYears: p.age_years,
    program: p.training_program,
    diagnosis: p.diagnosis_category,
    status: p.status,
    courseUsed: byPatient.get(p.id)?.used ?? 0,
    courseTotal: byPatient.get(p.id)?.total ?? 0,
    createdAt: p.created_at,
  }));
}

type PatientFull = Database["public"]["Tables"]["patients"]["Row"];
type CourseLite = { id: string; total_sessions: number | null; bonus_sessions: number; status: string };
type ReportLite = { id: string; report_type: string; report_date: string; status: string };

export type PatientSession = {
  id: string;
  dateISO: string;
  time: string;
  status: SessionStatus;
  employee: string;
};

export async function getPatientDetail(id: string): Promise<{
  patient: PatientFull;
  course: CourseLite | null;
  courseUsed: number;
  reports: ReportLite[];
  sessions: PatientSession[];
} | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  const patient = one<PatientFull>(data);
  if (!patient) return null;

  const { data: cData } = await supabase
    .from("courses")
    .select("id, total_sessions, bonus_sessions, status")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const course = one<CourseLite>(cData);

  let used = 0;
  if (course) {
    const { data: pr } = await supabase
      .from("course_progress")
      .select("used_sessions")
      .eq("course_id", course.id)
      .maybeSingle();
    used = Number(one<{ used_sessions: number }>(pr)?.used_sessions ?? 0);
  }

  const { data: rData } = await supabase
    .from("reports")
    .select("id, report_type, report_date, status")
    .eq("patient_id", id)
    .order("report_date", { ascending: false });

  const { data: sData } = await supabase
    .from("schedule_sessions")
    .select("id, scheduled_date, scheduled_start, status, employee:profiles!schedule_sessions_employee_id_fkey(full_name)")
    .eq("patient_id", id)
    .order("scheduled_start", { ascending: false })
    .limit(30);
  const sessions = rows<{
    id: string; scheduled_date: string; scheduled_start: string; status: SessionStatus;
    employee: { full_name: string | null } | null;
  }>(sData).map((s) => ({
    id: s.id,
    dateISO: s.scheduled_date,
    time: formatThaiTime(s.scheduled_start),
    status: s.status,
    employee: s.employee?.full_name ?? "—",
  }));

  return { patient, course, courseUsed: used, reports: rows<ReportLite>(rData), sessions };
}

export type AuditLogRow = {
  id: number;
  occurredAt: string;
  actorName: string;
  actorRole: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  changedCols: string[] | null;
};

/** Director-only audit log (RLS enforces director read). Latest 100 events. */
export async function getAuditLogs(): Promise<AuditLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, occurred_at, actor_id, actor_role, action, entity, entity_id, changed_cols")
    .order("occurred_at", { ascending: false })
    .limit(100);
  const logs = rows<{
    id: number; occurred_at: string; actor_id: string | null; actor_role: string | null;
    action: string; entity: string | null; entity_id: string | null; changed_cols: string[] | null;
  }>(data);
  const actorIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))] as string[];
  const nameById = new Map<string, string>();
  if (actorIds.length) {
    const { data: pData } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
    rows<{ id: string; full_name: string }>(pData).forEach((p) => nameById.set(p.id, p.full_name));
  }
  return logs.map((l) => ({
    id: l.id,
    occurredAt: l.occurred_at,
    actorName: l.actor_id ? nameById.get(l.actor_id) ?? "—" : "ระบบ",
    actorRole: l.actor_role,
    action: l.action,
    entity: l.entity,
    entityId: l.entity_id,
    changedCols: l.changed_cols,
  }));
}

export type EmployeeLite = {
  id: string; full_name: string; employee_code: string | null; position_title: string | null;
  license_no: string | null; phone: string | null; employment_type: "monthly" | "part_time";
  profession: "pt" | "ot" | null; photo_url: string | null; is_enabled: boolean;
};

export async function getEmployees(): Promise<EmployeeLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, employee_code, position_title, license_no, phone, employment_type, profession, photo_url, is_enabled")
    .eq("role", "employee")
    .order("employee_code");
  return rows<EmployeeLite>(data);
}

export async function getEmployeeDetail(id: string): Promise<{
  profile: Database["public"]["Tables"]["profiles"]["Row"];
  slots: { slot_start: string; slot_end: string }[];
} | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  const profile = one<Database["public"]["Tables"]["profiles"]["Row"]>(data);
  if (!profile) return null;
  const { data: sData } = await supabase
    .from("work_hour_slots")
    .select("slot_start, slot_end")
    .eq("employee_id", id)
    .order("slot_start");
  return { profile, slots: rows<{ slot_start: string; slot_end: string }>(sData) };
}

export interface EmployeeWorkSummary {
  employeeId: string;
  name: string;
  total: number;
  treatment: number;
  assessment: number;
  passed: number;
  upcoming: number;
  absent: number; // ไม่ได้เช็คอิน (ขาด)
  late: number;
  skipped: number;      // งด (ผู้รับบริการยกเลิกกะทันหัน)
  rescheduled: number;
  cancelled: number; // ยกเลิก
  onTime: number;    // ตรงเวลา = completed/attended (ไม่รวมสาย)
  earlyLeave: number;   // ออกก่อนเวลา (check-out ก่อนเวลานัด)
  patientCount: number; // ผู้รับบริการที่ดูแล (ไม่นับซ้ำ)
  specialCount: number; // เคสพิเศษ (is_special_case)
  specialAmount: number; // Σ special_amount (บาท)
  substituted: number;  // รับเวรแทน (substituted_from != null)
  workHours: number;    // Σ(check_out − check_in) เป็นชั่วโมง (ทศนิยม 1 ตำแหน่ง)
}

export type WorkPeriod = "day" | "month" | "year" | "all";

/** Bangkok-local [from,to] (inclusive) for the work-summary period tabs. */
export function workPeriodRange(
  period: WorkPeriod,
  todayISO = bangkokToday(),
): { from?: string; to?: string } {
  const y = Number(todayISO.slice(0, 4));
  const m = Number(todayISO.slice(5, 7));
  const mm = todayISO.slice(5, 7);
  if (period === "day") return { from: todayISO, to: todayISO };
  if (period === "month") {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
  }
  if (period === "year") return { from: `${y}-01-01`, to: `${y}-12-31` };
  return {};
}

/**
 * Per-employee case summary for staff: totals split by kind + attendance
 * outcomes. Optional Bangkok-local date range [from, to] (inclusive) drives the
 * รายวัน/รายเดือน/รายปี views.
 */
export async function getEmployeeWorkSummary(
  range?: { from?: string; to?: string },
): Promise<EmployeeWorkSummary[]> {
  const supabase = await createClient();
  let q = supabase
    .from("schedule_sessions")
    .select("status, kind, patient_id, is_special_case, special_amount, substituted_from, employee:profiles!schedule_sessions_employee_id_fkey(id, full_name)")
    .limit(5000);
  if (range?.from) q = q.gte("scheduled_date", range.from);
  if (range?.to) q = q.lte("scheduled_date", range.to);

  // check-in/out events in the same Bangkok-local window → real work hours +
  // early-leave counts per employee (sessions don't store the timestamps).
  let cq = supabase
    .from("check_ins")
    .select("employee_id, session_id, kind, is_early, client_event_at")
    .limit(10000);
  if (range?.from) cq = cq.gte("client_event_at", `${range.from}T00:00:00+07:00`);
  if (range?.to) cq = cq.lte("client_event_at", `${range.to}T23:59:59.999+07:00`);

  const [{ data }, { data: cData }] = await Promise.all([q, cq]);
  const evs = rows<{
    status: SessionStatus; kind: "assessment" | "treatment";
    patient_id: string | null; is_special_case: boolean | null;
    special_amount: number | null; substituted_from: string | null;
    employee: { id: string; full_name: string | null } | null;
  }>(data);
  const map = new Map<string, EmployeeWorkSummary>();
  const patientsOf = new Map<string, Set<string>>();
  const blank = (id: string, name: string): EmployeeWorkSummary => ({
    employeeId: id, name, total: 0, treatment: 0, assessment: 0, passed: 0,
    upcoming: 0, absent: 0, late: 0, skipped: 0, rescheduled: 0, cancelled: 0,
    onTime: 0, earlyLeave: 0, patientCount: 0, specialCount: 0,
    specialAmount: 0, substituted: 0, workHours: 0,
  });
  for (const r of evs) {
    if (!r.employee) continue;
    const id = r.employee.id;
    let e = map.get(id);
    if (!e) {
      e = blank(id, r.employee.full_name ?? "—");
      map.set(id, e);
    }
    e.total += 1;
    if (r.kind === "assessment") e.assessment += 1; else e.treatment += 1;
    if (["completed", "attended", "late"].includes(r.status)) e.passed += 1;
    if (["completed", "attended"].includes(r.status)) e.onTime += 1;
    if (["scheduled", "rescheduled", "in_progress"].includes(r.status)) e.upcoming += 1;
    if (r.status === "no_checkin") e.absent += 1;
    if (r.status === "late") e.late += 1;
    if (r.status === "skipped") e.skipped += 1;
    if (r.status === "rescheduled") e.rescheduled += 1;
    if (r.status === "cancelled") e.cancelled += 1;
    if (r.is_special_case) {
      e.specialCount += 1;
      e.specialAmount += r.special_amount ?? 0;
    }
    if (r.substituted_from) e.substituted += 1;
    if (r.patient_id) {
      const set = patientsOf.get(id) ?? new Set<string>();
      set.add(r.patient_id);
      patientsOf.set(id, set);
    }
  }

  // Pair check_in/check_out per session → hours; count early check-outs.
  const cEvs = rows<{
    employee_id: string; session_id: string; kind: string;
    is_early: boolean | null; client_event_at: string;
  }>(cData);
  const pair = new Map<string, { emp: string; in?: string; out?: string }>();
  for (const c of cEvs) {
    const p = pair.get(c.session_id) ?? { emp: c.employee_id };
    if (c.kind === "check_in") p.in = c.client_event_at;
    else if (c.kind === "check_out") {
      p.out = c.client_event_at;
      if (c.is_early) {
        const e = map.get(c.employee_id) ?? blank(c.employee_id, "—");
        map.set(c.employee_id, e);
        e.earlyLeave += 1;
      }
    }
    pair.set(c.session_id, p);
  }
  const msOf = new Map<string, number>();
  for (const p of pair.values()) {
    if (p.in && p.out) {
      const ms = new Date(p.out).getTime() - new Date(p.in).getTime();
      if (ms > 0) msOf.set(p.emp, (msOf.get(p.emp) ?? 0) + ms);
    }
  }
  for (const [id, e] of map) {
    e.patientCount = patientsOf.get(id)?.size ?? 0;
    e.workHours = Math.round((msOf.get(id) ?? 0) / 360_000) / 10;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/**
 * Work hours for an employee this month = Σ(check_out − check_in) per session,
 * in Asia/Bangkok. no_checkin/งด sessions have no check-in pair so are excluded.
 */
export async function getEmployeeWorkHours(
  employeeId: string,
): Promise<{ totalHours: number; sessionCount: number }> {
  const supabase = await createClient();
  const monthStart = `${bangkokToday().slice(0, 8)}01T00:00:00+07:00`;
  const { data } = await supabase
    .from("check_ins")
    .select("session_id, kind, client_event_at")
    .eq("employee_id", employeeId)
    .gte("client_event_at", monthStart);
  const evs = rows<{ session_id: string; kind: string; client_event_at: string }>(data);
  const bySession = new Map<string, { in?: string; out?: string }>();
  for (const r of evs) {
    const e = bySession.get(r.session_id) ?? {};
    if (r.kind === "check_in") e.in = r.client_event_at;
    else if (r.kind === "check_out") e.out = r.client_event_at;
    bySession.set(r.session_id, e);
  }
  let totalMs = 0;
  let sessionCount = 0;
  for (const e of bySession.values()) {
    if (e.in && e.out) {
      const ms = new Date(e.out).getTime() - new Date(e.in).getTime();
      if (ms > 0) {
        totalMs += ms;
        sessionCount += 1;
      }
    }
  }
  return { totalHours: Math.round(totalMs / 360_000) / 10, sessionCount };
}

export type BookingLite = {
  id: string; full_name: string; phone: string; area: string | null;
  status: Database["public"]["Enums"]["booking_status"]; created_at: string;
};

/**
 * The การทำนัด (bookings) list = recipients still in the pre-appointment pipeline
 * (รอชำระเงิน / รอทำนัด / ยกเลิกนัด). Once booked (ทำนัดแล้ว) a recipient moves to
 * the ผู้รับบริการ (patients) page. Backed by patients.appointment_status.
 */
export async function getBookings(): Promise<BookingLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, full_name, phone, address, appointment_status, created_at")
    .in("appointment_status", ["awaiting_payment", "awaiting_appointment", "cancelled"])
    .order("created_at", { ascending: false });
  const raw = rows<{
    id: string; full_name: string; phone: string | null; address: string | null;
    appointment_status: Database["public"]["Enums"]["booking_status"]; created_at: string;
  }>(data);
  return raw.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    phone: r.phone ?? "",
    area: r.address,
    status: r.appointment_status,
    created_at: r.created_at,
  }));
}

export type CorrectionField = { label: string; before: string | null; after: string | null };
export interface CorrectionItem {
  id: string;
  employeeName: string;
  patientName: string;
  dateLabel: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  changes: CorrectionField[];
}

// Human labels for the check-in fields a correction may change.
const CORRECTION_FIELD_LABEL: Record<string, string> = {
  client_event_at: "เวลาเช็คอิน",
  check_in_at: "เวลาเช็คอิน",
  check_out_at: "เวลาเช็คเอาท์",
  checkin_time: "เวลาเช็คอิน",
  checkout_time: "เวลาเช็คเอาท์",
  lat: "พิกัด (lat)",
  lng: "พิกัด (lng)",
  is_late: "สถานะสาย",
  note: "หมายเหตุ",
};

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? "ใช่" : "ไม่";
  return String(v);
}

/** Format a correction value: ISO datetimes → Thai date-time; else verbatim. */
function fmtCorrectionValue(v: unknown): string | null {
  const s = toStr(v);
  if (s === null) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s))) return formatThaiDateTime(s);
  return s;
}

function diffChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): CorrectionField[] {
  const req = after ?? {};
  // Shape from createCorrection: { field, from, to } → one labeled change.
  if (typeof req.field === "string") {
    const f = req.field;
    return [{
      label: CORRECTION_FIELD_LABEL[f] ?? f,
      before: fmtCorrectionValue(req.from),
      after: fmtCorrectionValue(req.to),
    }];
  }
  // Legacy shape: { <field>: value, ... } → one labeled change per field.
  return Object.keys(req).map((k) => ({
    label: CORRECTION_FIELD_LABEL[k] ?? k,
    before: fmtCorrectionValue(before?.[k]),
    after: fmtCorrectionValue(req[k]),
  }));
}

export async function getCorrections(): Promise<CorrectionItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("correction_requests")
    .select("id, reason, status, created_at, requested_changes, before_snapshot, employee:profiles!correction_requests_employee_id_fkey(full_name), session:schedule_sessions(scheduled_date, patients(full_name))")
    .order("created_at", { ascending: false });
  return rows<{
    id: string; reason: string; status: RequestStatus; created_at: string;
    requested_changes: Record<string, unknown> | null;
    before_snapshot: Record<string, unknown> | null;
    employee: { full_name: string | null } | null;
    session: { scheduled_date: string | null; patients: { full_name: string | null } | null } | null;
  }>(data).map((c) => ({
    id: c.id,
    employeeName: c.employee?.full_name ?? "—",
    patientName: c.session?.patients?.full_name ?? "—",
    dateLabel: c.session?.scheduled_date ? formatThaiDate(c.session.scheduled_date) : "",
    reason: c.reason,
    status: c.status,
    createdAt: c.created_at,
    changes: diffChanges(c.before_snapshot, c.requested_changes),
  }));
}

export interface MyCorrection {
  id: string;
  patientName: string;
  dateLabel: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
}

/** The current employee's own correction requests (history). */
export async function getMyCorrections(): Promise<MyCorrection[]> {
  const u = await getCurrentUser();
  if (!u) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("correction_requests")
    .select("id, reason, status, created_at, session:schedule_sessions(scheduled_date, patients(full_name))")
    .eq("employee_id", u.id)
    .order("created_at", { ascending: false });
  return rows<{
    id: string; reason: string; status: RequestStatus; created_at: string;
    session: { scheduled_date: string | null; patients: { full_name: string | null } | null } | null;
  }>(data).map((c) => ({
    id: c.id,
    patientName: c.session?.patients?.full_name ?? "—",
    dateLabel: c.session?.scheduled_date ? formatThaiDate(c.session.scheduled_date) : "",
    reason: c.reason,
    status: c.status,
    createdAt: c.created_at,
  }));
}

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export async function getNotifications(): Promise<NotificationRow[]> {
  const u = await getCurrentUser();
  if (!u) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  return rows<NotificationRow>(data);
}

export interface DashboardData {
  totalToday: number;
  checkedIn: number;
  inProgress: number;
  /** เคสประเมินแรกรับวันนี้ (session kind = assessment). */
  newRecipients: number;
  /** เคสแจ้งงดวันนี้ (status = skipped). */
  cancelledToday: number;
  pendingApprovals: number;
  monitor: { name: string; patient: string; time: string; status: SessionStatus; early: boolean }[];
  employeeCount: number;
  patients: PatientRow[];
  dailySeries: { label: string; total: number; done: number }[];
}

const DX_META: Record<Diagnosis, { label: string; varName: string }> = {
  stroke: { label: "Stroke", varName: "--dx-stroke" },
  parkinson: { label: "Parkinson", varName: "--dx-parkinson" },
  dementia_alzheimer: { label: "Dementia/Alzheimer", varName: "--dx-dementia" },
  als: { label: "ALS", varName: "--dx-als" },
  ms: { label: "MS", varName: "--dx-ms" },
  other: { label: "Other", varName: "--dx-other" },
};

/** Actionable counts for staff nav badges (pending corrections + new bookings). */
export async function getNavCounts(): Promise<{ approvals: number; bookings: number }> {
  const supabase = await createClient();
  const [{ count: approvals }, { count: bookings }] = await Promise.all([
    supabase.from("correction_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("patients").select("id", { count: "exact", head: true }).in("appointment_status", ["awaiting_payment", "awaiting_appointment"]),
  ]);
  return { approvals: approvals ?? 0, bookings: bookings ?? 0 };
}

export async function getDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  const today = bangkokToday();

  const { data: tData } = await supabase
    .from("schedule_sessions")
    .select("status, kind, scheduled_start, patients(full_name), employee:profiles!schedule_sessions_employee_id_fkey(full_name), check_ins(kind, is_early)")
    .eq("scheduled_date", today)
    .order("scheduled_start");
  const sessions = rows<{
    status: SessionStatus; kind: "assessment" | "treatment" | null; scheduled_start: string | null;
    patients: { full_name: string | null } | null;
    employee: { full_name: string | null } | null;
    check_ins: { kind: string; is_early: boolean }[] | null;
  }>(tData);
  const checkedIn = sessions.filter((s) =>
    ["in_progress", "attended", "late", "completed"].includes(s.status),
  ).length;
  const inProgress = sessions.filter((s) => s.status === "in_progress").length;
  const newRecipients = sessions.filter((s) => s.kind === "assessment").length;
  const cancelledToday = sessions.filter((s) => s.status === "skipped").length;

  // 14-day session trend (Bangkok-local dates).
  const start = new Date();
  start.setDate(start.getDate() - 13);
  const startISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(start);
  const { data: seriesData } = await supabase
    .from("schedule_sessions")
    .select("scheduled_date, status")
    .gte("scheduled_date", startISO)
    .lte("scheduled_date", today);
  const seriesRows = rows<{ scheduled_date: string; status: SessionStatus }>(seriesData);
  const byDate = new Map<string, { total: number; done: number }>();
  for (const r of seriesRows) {
    const cur = byDate.get(r.scheduled_date) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (["completed", "attended", "late"].includes(r.status)) cur.done += 1;
    byDate.set(r.scheduled_date, cur);
  }
  const dailySeries = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
    const e = byDate.get(iso) ?? { total: 0, done: 0 };
    return { label: iso.slice(5), total: e.total, done: e.done }; // MM-DD
  });

  const { count: pendingApprovals } = await supabase
    .from("correction_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: employeeCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "employee");

  return {
    totalToday: sessions.length,
    checkedIn,
    inProgress,
    newRecipients,
    cancelledToday,
    pendingApprovals: pendingApprovals ?? 0,
    monitor: sessions.map((s) => ({
      name: s.employee?.full_name ?? "—",
      patient: s.patients?.full_name ?? "—",
      time: s.scheduled_start ? formatThaiTime(s.scheduled_start) : "",
      status: s.status,
      early: s.check_ins?.some((c) => c.kind === "check_out" && c.is_early) ?? false,
    })),
    employeeCount: employeeCount ?? 0,
    patients: await getPatients(),
    dailySeries,
  };
}

export interface AssignChip {
  time: string;
  patient: string;
  emp: string;
}

export async function getMonthAssignments(
  year: number,
  month0: number,
): Promise<Record<number, AssignChip[]>> {
  const supabase = await createClient();
  const start = `${year}-${String(month0 + 1).padStart(2, "0")}-01`;
  const e = new Date(year, month0 + 1, 1);
  const end = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-01`;
  const { data } = await supabase
    .from("schedule_sessions")
    .select("scheduled_date, scheduled_start, patients(full_name), employee:profiles!schedule_sessions_employee_id_fkey(full_name)")
    .gte("scheduled_date", start)
    .lt("scheduled_date", end)
    .order("scheduled_start");
  const list = rows<{
    scheduled_date: string; scheduled_start: string;
    patients: { full_name: string | null } | null;
    employee: { full_name: string | null } | null;
  }>(data);
  const byDay: Record<number, AssignChip[]> = {};
  for (const s of list) {
    const day = Number(s.scheduled_date.slice(8, 10));
    (byDay[day] ??= []).push({
      time: formatThaiTime(s.scheduled_start),
      patient: (s.patients?.full_name ?? "—").replace(/^คุณ/, ""),
      emp: (s.employee?.full_name ?? "").split(" ")[1] ?? "—",
    });
  }
  return byDay;
}

// ── calendar (monthly scheduling view) ──────────────────────────────────
export interface CalendarSession {
  id: string;
  dateISO: string; // YYYY-MM-DD (Bangkok-local)
  time: string; // HH:MM (Thai)
  patient: string; // short (no "คุณ" prefix)
  employee: string; // given name only
  status: SessionStatus;
  kind: "assessment" | "treatment";
  isSpecial: boolean;
  // detail-sheet fields
  patientFull: string;
  employeeFull: string;
  program: string | null;
  address: string | null;
  homeLat: number | null;
  homeLng: number | null;
  mapUrl: string | null;
  timeLabel: string; // HH:MM–HH:MM
  specialAmount: number | null;
}

/**
 * All sessions for the scheduling calendar (client navigates months locally).
 * Clinic scale is small; bounded to keep the payload sane.
 */
export async function getCalendarSessions(): Promise<CalendarSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("id, scheduled_date, scheduled_start, scheduled_end, status, kind, is_special_case, special_amount, patients(full_name, training_program, address, home_lat, home_lng, map_url), employee:profiles!schedule_sessions_employee_id_fkey(full_name)")
    .order("scheduled_start")
    .limit(2000);
  return rows<{
    id: string; scheduled_date: string; scheduled_start: string; scheduled_end: string | null;
    status: SessionStatus; kind: "assessment" | "treatment"; is_special_case: boolean; special_amount: number | null;
    patients: { full_name: string | null; training_program: string | null; address: string | null; home_lat: number | null; home_lng: number | null; map_url: string | null } | null;
    employee: { full_name: string | null } | null;
  }>(data).map((s) => {
    const full = s.patients?.full_name ?? "—";
    const emp = s.employee?.full_name ?? "—";
    return {
      id: s.id,
      dateISO: s.scheduled_date,
      time: formatThaiTime(s.scheduled_start),
      patient: full.replace(/^คุณ/, ""),
      employee: emp.split(" ")[1] ?? emp,
      status: s.status,
      kind: s.kind,
      isSpecial: s.is_special_case,
      patientFull: full,
      employeeFull: emp,
      program: s.patients?.training_program ?? null,
      address: s.patients?.address ?? null,
      homeLat: s.patients?.home_lat ?? null,
      homeLng: s.patients?.home_lng ?? null,
      mapUrl: s.patients?.map_url ?? null,
      timeLabel: timeLabel(s.scheduled_start, s.scheduled_end),
      specialAmount: s.special_amount,
    };
  });
}

export interface RelativePortalSession {
  dateISO: string;
  time: string;
  therapist: string;
  status: SessionStatus;
}
export interface RelativePortalReport {
  id: string;
  type: "assessment_swallow" | "assessment_hand" | "followup" | "summary";
  dateISO: string;
  note: string | null;
}
export interface RelativePortalTherapist {
  name: string;
  role: string | null;
  photoUrl: string | null;
}
export interface RelativePortalData {
  patientName: string;
  program: string | null;
  courseTotal: number;
  courseUsed: number;
  bonus: number;
  courseComplete: boolean;
  upcoming: { date: string; time: string; therapist: string }[];
  sessions: RelativePortalSession[];
  reports: RelativePortalReport[];
  therapist: RelativePortalTherapist | null;
  exercises: { title: string; detail: string }[];
}

/** Pull a short human-readable note out of a clinical report's jsonb payload. */
function reportNote(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  for (const key of ["summary", "note", "progress_note", "detail", "สรุป", "บันทึก"]) {
    const v = p[key];
    if (typeof v === "string" && v.trim()) {
      const t = v.trim();
      return t.length > 180 ? `${t.slice(0, 180)}…` : t;
    }
  }
  return null;
}

/**
 * Internal: includes phoneLast4 for SERVER-SIDE verification only. Never return
 * this shape to the client — the verify action strips phoneLast4.
 */
export async function getRelativePortal(
  token: string,
): Promise<(RelativePortalData & { phoneLast4: string }) | null> {
  const admin = createAdminClient();
  const { data: aData } = await admin
    .from("relative_access")
    .select("patient_id, revoked, expires_at, show_followup, show_summary")
    .eq("access_token", token)
    .maybeSingle();
  const access = one<{
    patient_id: string; revoked: boolean; expires_at: string | null;
    show_followup: boolean; show_summary: boolean;
  }>(aData);
  if (!access || access.revoked) return null;
  // Honor the link's expiry at the gate (the share-link TTL is otherwise unenforced).
  if (access.expires_at && new Date(access.expires_at).getTime() <= Date.now()) return null;

  const { data: pData } = await admin
    .from("patients")
    .select("id, full_name, training_program, phone")
    .eq("id", access.patient_id)
    .maybeSingle();
  const patient = one<{ id: string; full_name: string; training_program: string | null; phone: string | null }>(pData);
  if (!patient) return null;

  const { data: cData } = await admin
    .from("courses")
    .select("id, total_sessions, bonus_sessions, status")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const course = one<{ id: string; total_sessions: number | null; bonus_sessions: number; status: string }>(cData);
  let used = 0;
  if (course) {
    const { data: pr } = await admin
      .from("course_progress")
      .select("used_sessions")
      .eq("course_id", course.id)
      .maybeSingle();
    used = Number(one<{ used_sessions: number }>(pr)?.used_sessions ?? 0);
  }

  const { data: sData } = await admin
    .from("schedule_sessions")
    .select("scheduled_date, scheduled_start, employee:profiles!schedule_sessions_employee_id_fkey(full_name)")
    .eq("patient_id", patient.id)
    .gte("scheduled_date", bangkokToday())
    .order("scheduled_start")
    .limit(5);
  const upcoming = rows<{
    scheduled_date: string; scheduled_start: string; employee: { full_name: string | null } | null;
  }>(sData).map((s) => ({
    date: s.scheduled_date,
    time: formatThaiTime(s.scheduled_start),
    therapist: s.employee?.full_name ?? "—",
  }));

  // All sessions (bounded) for the portal month calendar.
  const { data: allData } = await admin
    .from("schedule_sessions")
    .select("scheduled_date, scheduled_start, status, employee:profiles!schedule_sessions_employee_id_fkey(full_name)")
    .eq("patient_id", patient.id)
    .order("scheduled_start")
    .limit(400);
  const sessions = rows<{
    scheduled_date: string; scheduled_start: string; status: SessionStatus;
    employee: { full_name: string | null } | null;
  }>(allData).map((s) => ({
    dateISO: s.scheduled_date,
    time: formatThaiTime(s.scheduled_start),
    therapist: s.employee?.full_name ?? "—",
    status: s.status,
  }));

  // Settings.extra powers both the assessment-visibility flag and (below) the
  // home-training guide, so fetch it once up front.
  const { data: setData } = await admin.from("settings").select("extra").eq("id", 1).maybeSingle();
  const extra = (one<{ extra: Record<string, unknown> }>(setData)?.extra ?? {}) as Record<string, unknown>;

  // Completed reports the clinic chose to expose. followup/summary toggles live
  // on relative_access; the newer รายงานประเมินแรกรับ (assessment) toggle lives in
  // settings.extra.portal_show_assessment (patientId→bool, default ON).
  const showAssessMap = extra.portal_show_assessment && typeof extra.portal_show_assessment === "object"
    ? (extra.portal_show_assessment as Record<string, unknown>)
    : {};
  const showAssessment = showAssessMap[patient.id] !== false;
  const allowed: RelativePortalReport["type"][] = [
    ...(showAssessment ? (["assessment_swallow", "assessment_hand"] as const) : []),
    ...(access.show_followup ? (["followup"] as const) : []),
    ...(access.show_summary ? (["summary"] as const) : []),
  ];
  let reports: RelativePortalReport[] = [];
  if (allowed.length > 0) {
    const { data: rData } = await admin
      .from("reports")
      .select("id, report_type, report_date, payload")
      .eq("patient_id", patient.id)
      .eq("status", "completed")
      .in("report_type", allowed)
      .order("report_date", { ascending: false })
      .limit(12);
    reports = rows<{ id: string; report_type: RelativePortalReport["type"]; report_date: string; payload: unknown }>(rData)
      .map((r) => ({ id: r.id, type: r.report_type, dateISO: r.report_date, note: reportNote(r.payload) }));
  }

  // Current therapist = employee on the most recent session (name + role + photo).
  const { data: tData } = await admin
    .from("schedule_sessions")
    .select("employee:profiles!schedule_sessions_employee_id_fkey(full_name, position_title, photo_url)")
    .eq("patient_id", patient.id)
    .order("scheduled_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  const emp = one<{ employee: { full_name: string | null; position_title: string | null; photo_url: string | null } | null }>(tData)?.employee ?? null;
  const therapist: RelativePortalTherapist | null = emp
    ? { name: emp.full_name ?? "—", role: emp.position_title ?? "พนักงาน/นักบำบัด", photoUrl: emp.photo_url ?? null }
    : null;

  // Home-training guide (โปรแกรมฝึกที่บ้าน): staff can pin a specific program
  // per recipient (settings.extra.portal_home_programs) — otherwise it follows
  // the recipient's โปรแกรมการฝึก → legacy global list → hardcoded default.
  const byProgram = extra.exercise_guides && typeof extra.exercise_guides === "object"
    ? (extra.exercise_guides as Record<string, unknown>)
    : {};
  const pinned = extra.portal_home_programs && typeof extra.portal_home_programs === "object"
    ? (extra.portal_home_programs as Record<string, unknown>)
    : {};
  const pinnedProgram = typeof pinned[patient.id] === "string" ? (pinned[patient.id] as string).trim() : "";
  const program = pinnedProgram || (patient.training_program ?? "").trim();
  const perProgram = program ? parseExerciseItems(byProgram[program]) : [];
  const legacy = parseExerciseItems(extra.exercise_guide);
  const exercises = perProgram.length > 0 ? perProgram : legacy.length > 0 ? legacy : DEFAULT_EXERCISE_GUIDE;

  const total = Number(course?.total_sessions ?? 0);
  const courseComplete = course?.status === "course_complete" || (total > 0 && used >= total);

  return {
    patientName: patient.full_name,
    phoneLast4: (patient.phone ?? "").replace(/\D/g, "").slice(-4),
    program: patient.training_program,
    courseTotal: total,
    courseUsed: used,
    bonus: Number(course?.bonus_sessions ?? 0),
    courseComplete,
    upcoming,
    sessions,
    reports,
    therapist,
    exercises,
  };
}

/** Staff: read the relatives-portal report-visibility flags for a patient. */
export async function getRelativeVisibility(
  patientId: string,
): Promise<{ hasLink: boolean; showFollowup: boolean; showSummary: boolean }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("relative_access")
    .select("show_followup, show_summary")
    .eq("patient_id", patientId)
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = one<{ show_followup: boolean; show_summary: boolean }>(data);
  return {
    hasLink: !!row,
    showFollowup: row?.show_followup ?? true,
    showSummary: row?.show_summary ?? true,
  };
}

// ── จัดการหน้าญาติ (relatives management hub) ───────────────────────────────
export interface RelativeManagePatient {
  id: string;
  name: string;
  hn: string | null;
  program: string | null;
  /** Pinned โปรแกรมฝึกที่บ้าน for the portal; null = follow `program`. */
  portalProgram: string | null;
  hasLink: boolean;
  token: string | null;
  showAssessment: boolean;
  showFollowup: boolean;
  showSummary: boolean;
}
export interface RelativeManageData {
  programs: { program: string; items: ExerciseGuideItem[] }[];
  patients: RelativeManagePatient[];
}

/**
 * Data for the "จัดการหน้าญาติ" page: per-course exercise guides (keyed by
 * โปรแกรมการฝึก) + per-recipient relatives-link + report-visibility state.
 * Staff-guarded at the page; reads via the service-role admin client (relatives
 * tables are staff-RLS only and the portal itself is service-role).
 */
export async function getRelativeManage(): Promise<RelativeManageData> {
  const admin = createAdminClient();

  const { data: pData } = await admin
    .from("patients")
    .select("id, full_name, hn, training_program, appointment_status")
    .order("full_name");
  const active = rows<{
    id: string; full_name: string; hn: string | null; training_program: string | null; appointment_status: string;
  }>(pData).filter((p) => p.appointment_status === "booked");

  const { data: raData } = await admin
    .from("relative_access")
    .select("patient_id, access_token, show_followup, show_summary, expires_at")
    .eq("revoked", false)
    .order("created_at", { ascending: false });
  const raMap = new Map<string, { token: string | null; showFollowup: boolean; showSummary: boolean }>();
  for (const r of rows<{
    patient_id: string; access_token: string; show_followup: boolean; show_summary: boolean; expires_at: string | null;
  }>(raData)) {
    if (raMap.has(r.patient_id)) continue; // rows are created_at-desc → first is latest
    const activeLink = !r.expires_at || new Date(r.expires_at).getTime() > Date.now();
    raMap.set(r.patient_id, {
      token: activeLink ? r.access_token : null,
      showFollowup: r.show_followup,
      showSummary: r.show_summary,
    });
  }

  const { data: setData } = await admin.from("settings").select("extra").eq("id", 1).maybeSingle();
  const extra = (one<{ extra: Record<string, unknown> }>(setData)?.extra ?? {}) as Record<string, unknown>;
  const byProgram = extra.exercise_guides && typeof extra.exercise_guides === "object"
    ? (extra.exercise_guides as Record<string, unknown>)
    : {};

  const managed = Array.isArray(extra.training_programs) ? extra.training_programs : [];
  const progSet = new Set<string>();
  for (const m of managed) if (typeof m === "string" && m.trim()) progSet.add(m.trim());
  for (const p of active) if (p.training_program?.trim()) progSet.add(p.training_program.trim());
  for (const k of Object.keys(byProgram)) if (k.trim()) progSet.add(k.trim());
  const programs = [...progSet]
    .sort((a, b) => a.localeCompare(b, "th"))
    .map((program) => ({ program, items: parseExerciseItems(byProgram[program]) }));

  const pinned = extra.portal_home_programs && typeof extra.portal_home_programs === "object"
    ? (extra.portal_home_programs as Record<string, unknown>)
    : {};
  const showAssessMap = extra.portal_show_assessment && typeof extra.portal_show_assessment === "object"
    ? (extra.portal_show_assessment as Record<string, unknown>)
    : {};

  const patients: RelativeManagePatient[] = active.map((p) => {
    const ra = raMap.get(p.id);
    return {
      id: p.id,
      name: p.full_name,
      hn: p.hn,
      program: p.training_program,
      portalProgram: typeof pinned[p.id] === "string" && (pinned[p.id] as string).trim()
        ? (pinned[p.id] as string).trim()
        : null,
      hasLink: !!ra?.token,
      token: ra?.token ?? null,
      showAssessment: showAssessMap[p.id] !== false,
      showFollowup: ra?.showFollowup ?? true,
      showSummary: ra?.showSummary ?? true,
    };
  });

  return { programs, patients };
}

/**
 * All known โปรแกรมฝึก / คอร์สการฟื้นฟู = the managed list
 * (settings.extra.training_programs) unioned with programs already in use by
 * recipients and any exercise-guide keys — so the CRUD page and the intake
 * dropdown reflect reality, not just what was explicitly saved.
 */
export async function getTrainingPrograms(): Promise<string[]> {
  const admin = createAdminClient();
  const [{ data: setData }, { data: pData }] = await Promise.all([
    admin.from("settings").select("extra").eq("id", 1).maybeSingle(),
    admin.from("patients").select("training_program").eq("appointment_status", "booked"),
  ]);
  const extra = (one<{ extra: Record<string, unknown> }>(setData)?.extra ?? {}) as Record<string, unknown>;
  const managed = Array.isArray(extra.training_programs) ? extra.training_programs : [];
  const byProgram = extra.exercise_guides && typeof extra.exercise_guides === "object"
    ? (extra.exercise_guides as Record<string, unknown>)
    : {};
  const inUse = rows<{ training_program: string | null }>(pData).map((p) => p.training_program);

  const seen = new Set<string>();
  const out: string[] = [];
  const addAll = (arr: unknown[]) => {
    for (const v of arr) {
      if (typeof v !== "string") continue;
      const s = v.trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  };
  addAll(managed);
  addAll(inUse);
  addAll(Object.keys(byProgram));
  return out.sort((a, b) => a.localeCompare(b, "th"));
}

// ── KPI templates (year-versioned question bank) ────────────────────────
export interface KpiQuestion {
  id: string;
  question: string;
  answerType: "text" | "choice";
  options?: string[];
  /** Correct option — Director-only; STRIPPED before sending to employees. */
  answer?: string | null;
}
export interface KpiTemplate {
  id: string;
  kind: "knowledge" | "stress";
  title: string;
  periodYear: number;
  questions: KpiQuestion[];
}

type RawKpiQuestion = {
  id: string;
  question: string;
  answer_type?: string;
  options?: string[];
  answer?: string | null;
};

/**
 * KPI templates with answer keys intact (Director editor + server-side scoring).
 * NEVER pass the result straight to employees — use stripKpiAnswers first.
 */
export async function getKpiTemplates(): Promise<KpiTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_templates")
    .select("id, kind, title, period_year, questions")
    .order("period_year", { ascending: false });
  return rows<{
    id: string; kind: "knowledge" | "stress"; title: string; period_year: number;
    questions: RawKpiQuestion[] | null;
  }>(data).map((t) => ({
    id: t.id,
    kind: t.kind,
    title: t.title,
    periodYear: t.period_year,
    questions: (t.questions ?? []).map((q) => ({
      id: q.id,
      question: q.question,
      answerType: q.answer_type === "choice" ? "choice" : "text",
      options: Array.isArray(q.options) ? q.options : undefined,
      answer: q.answer ?? null,
    })),
  }));
}

export interface PatientKpiResult {
  id: string;
  patientName: string;
  fois: string | null;
  barthel: number | null;
  functionItems: string[]; // checked Functional flags (not scored)
  fim: number | null;
  dateISO: string;
}
export interface EmployeeKpiResult {
  id: string;
  employeeName: string;
  kind: "knowledge" | "stress" | null;
  score: number | null;
  mood: number | null; // 0–4 face index for stress (เช็คสุขภาพใจ)
  year: number | null;
  dateISO: string;
}

/** Director-only KPI results (การวัดผล): patient scales + employee self-assessments. */
export async function getMeasurementResults(): Promise<{
  patient: PatientKpiResult[];
  employee: EmployeeKpiResult[];
}> {
  const supabase = await createClient();
  const { data: pData } = await supabase
    .from("kpi_evaluations")
    .select("id, fois_level, barthel_index, function_checklist, answers, evaluated_on, patients(full_name)")
    .eq("target", "patient")
    .order("evaluated_on", { ascending: false })
    .limit(200);
  const patient = rows<{
    id: string; fois_level: string | null; barthel_index: number | null;
    function_checklist: Record<string, boolean> | null; answers: { fim?: number | null } | null;
    evaluated_on: string; patients: { full_name: string | null } | null;
  }>(pData).map((r) => {
    const fc = r.function_checklist ?? {};
    return {
      id: r.id,
      patientName: r.patients?.full_name ?? "—",
      fois: r.fois_level,
      barthel: r.barthel_index,
      functionItems: Object.entries(fc).filter(([, v]) => v).map(([k]) => k),
      fim: r.answers?.fim ?? null,
      dateISO: r.evaluated_on,
    };
  });

  const { data: eData } = await supabase
    .from("kpi_evaluations")
    .select("id, employee_kpi_kind, score, period_year, evaluated_on, answers, employee:profiles!kpi_evaluations_employee_id_fkey(full_name)")
    .eq("target", "employee")
    .order("evaluated_on", { ascending: false })
    .limit(200);
  const employee = rows<{
    id: string; employee_kpi_kind: "knowledge" | "stress" | null; score: number | null;
    period_year: number | null; evaluated_on: string; answers: { mood?: number | string | null } | null;
    employee: { full_name: string | null } | null;
  }>(eData).map((r) => {
    const moodNum = Number(r.answers?.mood);
    return {
      id: r.id,
      employeeName: r.employee?.full_name ?? "—",
      kind: r.employee_kpi_kind,
      score: r.score,
      mood: r.employee_kpi_kind === "stress" && Number.isFinite(moodNum) ? moodNum : null,
      year: r.period_year,
      dateISO: r.evaluated_on,
    };
  });

  return { patient, employee };
}

/** Drop the correct-answer key so the question bank is safe to send to employees. */
export function stripKpiAnswers(t: KpiTemplate | null): KpiTemplate | null {
  if (!t) return null;
  return {
    ...t,
    questions: t.questions.map(({ answer: _a, ...q }) => {
      void _a;
      return q;
    }),
  };
}

export interface EmployeeKpiTemplate {
  templateId: string | null;
  questions: KpiQuestion[]; // answer keys stripped by the RPC
}

/** Question bank for the employee self-assessment — answer keys removed (definer RPC). */
export async function getEmployeeKpiQuestions(
  kind: "knowledge" | "stress",
  year: number,
): Promise<EmployeeKpiTemplate> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("kpi_questions_for_employee", { p_kind: kind, p_year: year });
  const row = (Array.isArray(data) ? data[0] : null) as
    | { template_id: string; questions: RawKpiQuestion[] }
    | null;
  if (!row) return { templateId: null, questions: [] };
  return {
    templateId: row.template_id,
    questions: (row.questions ?? []).map((q) => ({
      id: q.id,
      question: q.question,
      answerType: q.answer_type === "choice" ? "choice" : "text",
      options: Array.isArray(q.options) ? q.options : undefined,
    })),
  };
}

/** Patients the current employee may access (RLS-filtered) — for the KPI picker. */
export async function getMyAssignedPatients(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, full_name")
    .order("full_name");
  return rows<{ id: string; full_name: string }>(data).map((p) => ({ id: p.id, name: p.full_name }));
}

/** Upcoming sessions (today forward) for the substitution picker. */
export async function getUpcomingSessions(): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("id, scheduled_date, scheduled_start, status, patients(full_name), employee:profiles!schedule_sessions_employee_id_fkey(full_name)")
    .gte("scheduled_date", bangkokToday())
    .neq("status", "cancelled")
    .order("scheduled_date")
    .order("scheduled_start")
    .limit(80);
  return rows<{
    id: string; scheduled_date: string; scheduled_start: string;
    patients: { full_name: string | null } | null;
    employee: { full_name: string | null } | null;
  }>(data).map((s) => ({
    id: s.id,
    label: `${formatThaiDate(s.scheduled_date)} ${formatThaiTime(s.scheduled_start)} · ${(s.patients?.full_name ?? "—")} · ${(s.employee?.full_name ?? "—")}`,
  }));
}

// ── reports list (staff + director) ─────────────────────────────────────
const REPORT_TYPE_LABEL: Record<string, string> = {
  assessment_swallow: "Assessment · Swallowing",
  assessment_hand: "Assessment · Hand Function",
  followup: "Follow up (รายวัน)",
  summary: "Summary (รายเดือน)",
};
export interface ReportRow {
  id: string;
  typeLabel: string;
  patientHn: string | null;
  patientName: string;
  authorName: string;
  date: string;
  status: string;
}

export async function getReports(): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, report_type, report_date, status, patients(full_name, hn), author:profiles!reports_author_id_fkey(full_name)")
    .order("report_date", { ascending: false })
    .limit(200);
  return rows<{
    id: string; report_type: string; report_date: string; status: string;
    patients: { full_name: string | null; hn: string | null } | null;
    author: { full_name: string | null } | null;
  }>(data).map((r) => ({
    id: r.id,
    typeLabel: REPORT_TYPE_LABEL[r.report_type] ?? r.report_type,
    patientHn: r.patients?.hn ?? null,
    patientName: r.patients?.full_name ?? "—",
    authorName: r.author?.full_name ?? "—",
    date: r.report_date,
    status: r.status,
  }));
}

export interface ReportField {
  key: string;
  value: string;
}
export interface ReportDetail {
  id: string;
  reportType: string;
  typeLabel: string;
  patientId: string | null;
  patientName: string;
  patientAge: number | null;
  /** From the patient record (print templates: ลิ้งก์ข้อมูลมาจากข้อมูลผู้รับบริการ). */
  patientDiagnosis: Diagnosis | null;
  /** Date of this patient's earliest assessment report (วันที่ประเมินแรกรับ). */
  firstAssessmentDate: string | null;
  authorName: string;
  date: string;
  status: string;
  fields: ReportField[];
  /** Raw payload — powers the letterhead PDF/print template. */
  payload: Record<string, unknown>;
}

/** Flatten a clinical report's jsonb payload into ordered key/value rows. */
function flattenReportPayload(payload: unknown, prefix = ""): ReportField[] {
  if (payload === null || payload === undefined) return [];
  if (typeof payload !== "object") {
    return [{ key: prefix || "ค่า", value: String(payload) }];
  }
  if (Array.isArray(payload)) {
    return payload.flatMap((v, i) => flattenReportPayload(v, prefix ? `${prefix} [${i + 1}]` : `[${i + 1}]`));
  }
  return Object.entries(payload as Record<string, unknown>).flatMap(([k, v]) => {
    const key = prefix ? `${prefix} · ${k}` : k;
    if (v !== null && typeof v === "object") return flattenReportPayload(v, key);
    if (typeof v === "boolean") return [{ key, value: v ? "ใช่" : "ไม่" }];
    return [{ key, value: v === null || v === undefined ? "—" : String(v) }];
  });
}

/** Full detail of one report (Admin/Director) — for click-through + per-person export. */
export async function getReportDetail(id: string): Promise<ReportDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, report_type, report_date, status, payload, patient_id, patients(full_name, age_years, diagnosis_category), author:profiles!reports_author_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  const r = one<{
    id: string; report_type: string; report_date: string; status: string;
    payload: unknown; patient_id: string | null;
    patients: { full_name: string | null; age_years: number | null; diagnosis_category: Diagnosis | null } | null;
    author: { full_name: string | null } | null;
  }>(data);
  if (!r) return null;

  let firstAssessmentDate: string | null = null;
  if (r.patient_id) {
    const { data: fa } = await supabase
      .from("reports")
      .select("report_date")
      .eq("patient_id", r.patient_id)
      .in("report_type", ["assessment_swallow", "assessment_hand"])
      .order("report_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    firstAssessmentDate = one<{ report_date: string }>(fa)?.report_date ?? null;
  }

  return {
    id: r.id,
    reportType: r.report_type,
    typeLabel: REPORT_TYPE_LABEL[r.report_type] ?? r.report_type,
    patientId: r.patient_id,
    patientName: r.patients?.full_name ?? "—",
    patientAge: r.patients?.age_years ?? null,
    patientDiagnosis: r.patients?.diagnosis_category ?? null,
    firstAssessmentDate,
    authorName: r.author?.full_name ?? "—",
    date: r.report_date,
    status: r.status,
    fields: flattenReportPayload(r.payload),
    payload: (r.payload && typeof r.payload === "object" ? r.payload : {}) as Record<string, unknown>,
  };
}

// ── reports grouped by recipient (บันทึกรายงาน list = one row per ผู้รับบริการ) ──
export interface ReportPatientRow {
  patientId: string;
  patientName: string;
  patientHn: string | null;
  reportCount: number;
  assessmentCount: number;
  lastDate: string;
  lastStatus: string;
}

/** Unique recipients that have any report, with per-recipient report tallies. */
export async function getReportPatients(): Promise<ReportPatientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("report_type, report_date, status, patient_id, patients(full_name, hn)")
    .order("report_date", { ascending: false })
    .limit(1000);
  const raw = rows<{
    report_type: string; report_date: string; status: string; patient_id: string | null;
    patients: { full_name: string | null; hn: string | null } | null;
  }>(data);
  const byPatient = new Map<string, ReportPatientRow>();
  for (const r of raw) {
    if (!r.patient_id) continue;
    const existing = byPatient.get(r.patient_id);
    if (existing) {
      existing.reportCount += 1;
      if (r.report_type.startsWith("assessment")) existing.assessmentCount += 1;
    } else {
      // Rows arrive date-desc, so the first seen per patient is the latest.
      byPatient.set(r.patient_id, {
        patientId: r.patient_id,
        patientName: r.patients?.full_name ?? "—",
        patientHn: r.patients?.hn ?? null,
        reportCount: 1,
        assessmentCount: r.report_type.startsWith("assessment") ? 1 : 0,
        lastDate: r.report_date,
        lastStatus: r.status,
      });
    }
  }
  return [...byPatient.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

// ── per-recipient assessment history + KPI trend (report drill-in) ──────────
export interface PatientAssessmentHistory {
  patientId: string;
  patientName: string;
  patientHn: string | null;
  reports: { id: string; typeLabel: string; date: string; status: string }[];
  kpi: { dateISO: string; fois: number | null; barthel: number | null; fim: number | null; functionItems: string[] }[];
  latest: { fois: number | null; barthel: number | null; fim: number | null };
  totals: { reports: number; assessments: number; evaluations: number };
}

/** All reports + KPI evaluations for one recipient — powers the report drill-in. */
export async function getPatientAssessmentHistory(patientId: string): Promise<PatientAssessmentHistory | null> {
  const supabase = await createClient();
  const { data: pData } = await supabase
    .from("patients")
    .select("full_name, hn")
    .eq("id", patientId)
    .maybeSingle();
  const p = one<{ full_name: string | null; hn: string | null }>(pData);
  if (!p) return null;

  const { data: rData } = await supabase
    .from("reports")
    .select("id, report_type, report_date, status")
    .eq("patient_id", patientId)
    .order("report_date", { ascending: false })
    .limit(300);
  const reports = rows<{ id: string; report_type: string; report_date: string; status: string }>(rData).map((r) => ({
    id: r.id,
    typeLabel: REPORT_TYPE_LABEL[r.report_type] ?? r.report_type,
    date: r.report_date,
    status: r.status,
  }));

  const { data: kData } = await supabase
    .from("kpi_evaluations")
    .select("fois_level, barthel_index, function_checklist, answers, evaluated_on")
    .eq("target", "patient")
    .eq("patient_id", patientId)
    .order("evaluated_on", { ascending: true })
    .limit(300);
  const kpi = rows<{
    fois_level: string | null; barthel_index: number | null;
    function_checklist: Record<string, boolean> | null; answers: { fim?: number | null } | null;
    evaluated_on: string;
  }>(kData).map((r) => {
    const fc = r.function_checklist ?? {};
    const foisNum = r.fois_level ? Number(r.fois_level.replace(/\D/g, "")) || null : null;
    return {
      dateISO: r.evaluated_on,
      fois: foisNum,
      barthel: r.barthel_index,
      fim: r.answers?.fim ?? null,
      functionItems: Object.entries(fc).filter(([, v]) => v).map(([k]) => k),
    };
  });

  const last = kpi[kpi.length - 1];
  return {
    patientId,
    patientName: p.full_name ?? "—",
    patientHn: p.hn,
    reports,
    kpi,
    latest: { fois: last?.fois ?? null, barthel: last?.barthel ?? null, fim: last?.fim ?? null },
    totals: {
      reports: reports.length,
      assessments: reports.filter((r) => r.typeLabel.startsWith("Assessment")).length,
      evaluations: kpi.length,
    },
  };
}

// ── patient statistics (สถิติผู้รับบริการ) ──────────────────────────────
const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export interface PatientStatsData {
  diagnosis: { label: string; count: number; varName: string }[];
  monthly: { label: string; total: number; done: number }[];
  monthlyTotal: number;
  buddhistYear: number;
  repeatCourse: { repeatCount: number; totalWithCourse: number };
}

/**
 * Patient-facing statistics: diagnosis breakdown + monthly case table for the
 * current calendar year (client 18/6/2569: stats live under ผู้รับบริการ).
 */
export async function getPatientStats(): Promise<PatientStatsData> {
  const supabase = await createClient();
  const today = bangkokToday();
  const year = Number(today.slice(0, 4));

  const { data: dxData } = await supabase
    .from("patients")
    .select("diagnosis_category")
    .eq("appointment_status", "booked");
  const dx = rows<{ diagnosis_category: Diagnosis | null }>(dxData);
  const counts = new Map<Diagnosis, number>();
  for (const r of dx) {
    if (r.diagnosis_category) counts.set(r.diagnosis_category, (counts.get(r.diagnosis_category) ?? 0) + 1);
  }
  const diagnosis = (Object.keys(DX_META) as Diagnosis[]).map((k) => ({
    label: DX_META[k].label,
    varName: DX_META[k].varName,
    count: counts.get(k) ?? 0,
  }));

  const { data: sData } = await supabase
    .from("schedule_sessions")
    .select("scheduled_date, status")
    .gte("scheduled_date", `${year}-01-01`)
    .lte("scheduled_date", `${year}-12-31`)
    .limit(10000);
  const sessions = rows<{ scheduled_date: string; status: SessionStatus }>(sData);
  const byMonth = Array.from({ length: 12 }, () => ({ total: 0, done: 0 }));
  for (const s of sessions) {
    const bucket = byMonth[Number(s.scheduled_date.slice(5, 7)) - 1];
    if (!bucket) continue;
    bucket.total += 1;
    if (["completed", "attended", "late"].includes(s.status)) bucket.done += 1;
  }
  const monthly = byMonth.map((m, i) => ({ label: THAI_MONTHS_FULL[i] ?? "", total: m.total, done: m.done }));

  // Repeat course purchase (สถิติซื้อคอร์สซ้ำ): patients holding ≥2 courses.
  const { data: cData } = await supabase.from("courses").select("patient_id").limit(20000);
  const courseRows = rows<{ patient_id: string | null }>(cData);
  const perPatient = new Map<string, number>();
  for (const c of courseRows) {
    if (c.patient_id) perPatient.set(c.patient_id, (perPatient.get(c.patient_id) ?? 0) + 1);
  }
  let repeatCount = 0;
  for (const n of perPatient.values()) if (n >= 2) repeatCount += 1;

  return {
    diagnosis,
    monthly,
    monthlyTotal: sessions.length,
    buddhistYear: year + 543,
    repeatCourse: { repeatCount, totalWithCourse: perPatient.size },
  };
}

/**
 * Raw (date, recipient) pairs from the schedule, so the patients-page chart can
 * bucket "จำนวนผู้รับบริการ" by day / month / year on the client (distinct
 * recipients served per period). Bounded for a small clinic.
 */
export async function getRecipientTimeSeries(): Promise<{ dateISO: string; patientId: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("scheduled_date, patient_id")
    .order("scheduled_date", { ascending: true })
    .limit(8000);
  return rows<{ scheduled_date: string; patient_id: string | null }>(data)
    .filter((r) => !!r.patient_id)
    .map((r) => ({ dateISO: r.scheduled_date, patientId: r.patient_id as string }));
}

// ── settings ────────────────────────────────────────────────────────────
export interface SettingsData {
  companyName: string;
  logoUrl: string | null;
  selfieEnforced: boolean;
  lateThresholdMin: number;
  earlyThresholdMin: number;
  geofenceRadiusM: number;
}

export async function getSettings(): Promise<SettingsData> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("company_name, logo_url, selfie_enforced, late_threshold_minutes, early_threshold_minutes, geofence_radius_m")
    .eq("id", 1)
    .maybeSingle();
  const s = one<{
    company_name: string; logo_url: string | null; selfie_enforced: boolean;
    late_threshold_minutes: number; early_threshold_minutes: number; geofence_radius_m: number;
  }>(data);
  return {
    companyName: s?.company_name ?? "Better Brain Rehab at Home",
    logoUrl: s?.logo_url ?? null,
    selfieEnforced: s?.selfie_enforced ?? true,
    lateThresholdMin: Number(s?.late_threshold_minutes ?? 15),
    earlyThresholdMin: Number(s?.early_threshold_minutes ?? 15),
    geofenceRadiusM: Number(s?.geofence_radius_m ?? 1000),
  };
}

/** Lean check-in config for the employee session page (geofence + lateness). */
export async function getCheckinSettings(): Promise<{
  radiusM: number;
  lateThresholdMin: number;
  earlyThresholdMin: number;
  selfieEnforced: boolean;
}> {
  const s = await getSettings();
  return {
    radiusM: s.geofenceRadiusM,
    lateThresholdMin: s.lateThresholdMin,
    earlyThresholdMin: s.earlyThresholdMin,
    selfieEnforced: s.selfieEnforced,
  };
}
