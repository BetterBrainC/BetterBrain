import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { formatThaiTime } from "@/lib/date/buddhist";
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
  const s = formatThaiTime(startISO);
  return endISO ? `${s}–${formatThaiTime(endISO)}` : s;
}

export interface SessionRow {
  id: string;
  timeLabel: string;
  patientName: string;
  program: string | null;
  status: SessionStatus;
}

type RawSession = {
  id: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: SessionStatus;
  patients: { full_name: string | null; training_program: string | null } | null;
};

export async function getMyTodaySessions(): Promise<SessionRow[]> {
  const u = await getCurrentUser();
  if (!u) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("id, scheduled_start, scheduled_end, status, patients(full_name, training_program)")
    .eq("employee_id", u.id)
    .eq("scheduled_date", bangkokToday())
    .order("scheduled_start");
  return rows<RawSession>(data).map((s) => ({
    id: s.id,
    timeLabel: timeLabel(s.scheduled_start, s.scheduled_end),
    patientName: s.patients?.full_name ?? "—",
    program: s.patients?.training_program ?? null,
    status: s.status,
  }));
}

export async function getMyRecentSessions(): Promise<{ id: string; label: string }[]> {
  const u = await getCurrentUser();
  if (!u) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("id, scheduled_date, patients(full_name)")
    .eq("employee_id", u.id)
    .order("scheduled_date", { ascending: false })
    .limit(20);
  return rows<{ id: string; scheduled_date: string; patients: { full_name: string | null } | null }>(data).map((s) => ({
    id: s.id,
    label: `${s.scheduled_date} · ${s.patients?.full_name ?? "—"}`,
  }));
}

export interface SessionDetail {
  id: string;
  patientName: string;
  program: string | null;
  address: string | null;
  timeLabel: string;
  scheduledStartISO: string | null;
  homeLat: number | null;
  homeLng: number | null;
  courseUsed: number;
  courseTotal: number;
  status: SessionStatus;
}

export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_sessions")
    .select("id, scheduled_start, scheduled_end, status, course_id, patients(full_name, training_program, address, home_lat, home_lng)")
    .eq("id", id)
    .maybeSingle();
  const s = one<{
    id: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    status: SessionStatus;
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
    patientName: s.patients?.full_name ?? "—",
    program: s.patients?.training_program ?? null,
    address: s.patients?.address ?? null,
    timeLabel: timeLabel(s.scheduled_start, s.scheduled_end),
    scheduledStartISO: s.scheduled_start,
    homeLat: s.patients?.home_lat ?? null,
    homeLng: s.patients?.home_lng ?? null,
    courseUsed: used,
    courseTotal: total,
    status: s.status,
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
}

export async function getPatients(): Promise<PatientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, hn, full_name, age_years, training_program, diagnosis_category, status")
    .order("created_at", { ascending: true });
  const patients = rows<{
    id: string; hn: string | null; full_name: string; age_years: number | null;
    training_program: string | null; diagnosis_category: Diagnosis | null; status: PatientStatus;
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

type EmployeeLite = {
  id: string; full_name: string; employee_code: string | null; position_title: string | null;
  license_no: string | null; phone: string | null; employment_type: "monthly" | "part_time";
  is_enabled: boolean;
};

export async function getEmployees(): Promise<EmployeeLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, employee_code, position_title, license_no, phone, employment_type, is_enabled")
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

type BookingLite = {
  id: string; full_name: string; phone: string; area: string | null;
  status: Database["public"]["Enums"]["booking_status"]; created_at: string;
};

export async function getBookings(): Promise<BookingLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, full_name, phone, area, status, created_at")
    .order("created_at", { ascending: false });
  return rows<BookingLite>(data);
}

export type CorrectionField = { label: string; before: string | null; after: string | null };
export interface CorrectionItem {
  id: string;
  employeeName: string;
  patientName: string;
  dateLabel: string;
  reason: string;
  status: RequestStatus;
  changes: CorrectionField[];
}

// Human labels for the check-in fields a correction may change.
const CORRECTION_FIELD_LABEL: Record<string, string> = {
  client_event_at: "เวลาเช็คอิน",
  check_in_at: "เวลาเช็คอิน",
  check_out_at: "เวลาเช็คเอาท์",
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

function diffChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): CorrectionField[] {
  const req = after ?? {};
  return Object.keys(req).map((k) => ({
    label: CORRECTION_FIELD_LABEL[k] ?? k,
    before: toStr(before?.[k]),
    after: toStr(req[k]),
  }));
}

export async function getCorrections(): Promise<CorrectionItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("correction_requests")
    .select("id, reason, status, created_at, requested_changes, before_snapshot, employee:profiles!correction_requests_employee_id_fkey(full_name), session:schedule_sessions(scheduled_date, patients(full_name))")
    .order("created_at", { ascending: false });
  return rows<{
    id: string; reason: string; status: RequestStatus;
    requested_changes: Record<string, unknown> | null;
    before_snapshot: Record<string, unknown> | null;
    employee: { full_name: string | null } | null;
    session: { scheduled_date: string | null; patients: { full_name: string | null } | null } | null;
  }>(data).map((c) => ({
    id: c.id,
    employeeName: c.employee?.full_name ?? "—",
    patientName: c.session?.patients?.full_name ?? "—",
    dateLabel: c.session?.scheduled_date ?? "",
    reason: c.reason,
    status: c.status,
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
    dateLabel: c.session?.scheduled_date ?? "",
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
  pendingApprovals: number;
  diagnosis: { label: string; count: number; varName: string }[];
  monitor: { name: string; patient: string; time: string; status: SessionStatus }[];
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

export async function getDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  const today = bangkokToday();

  const { data: tData } = await supabase
    .from("schedule_sessions")
    .select("status, scheduled_start, patients(full_name), employee:profiles!schedule_sessions_employee_id_fkey(full_name)")
    .eq("scheduled_date", today)
    .order("scheduled_start");
  const sessions = rows<{
    status: SessionStatus; scheduled_start: string | null;
    patients: { full_name: string | null } | null;
    employee: { full_name: string | null } | null;
  }>(tData);
  const checkedIn = sessions.filter((s) =>
    ["in_progress", "attended", "late", "completed"].includes(s.status),
  ).length;
  const inProgress = sessions.filter((s) => s.status === "in_progress").length;

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

  const { data: dxData } = await supabase.from("patients").select("diagnosis_category");
  const dx = rows<{ diagnosis_category: Diagnosis | null }>(dxData);
  const counts = new Map<Diagnosis, number>();
  for (const r of dx) {
    if (r.diagnosis_category)
      counts.set(r.diagnosis_category, (counts.get(r.diagnosis_category) ?? 0) + 1);
  }
  const diagnosis = (Object.keys(DX_META) as Diagnosis[]).map((k) => ({
    label: DX_META[k].label,
    varName: DX_META[k].varName,
    count: counts.get(k) ?? 0,
  }));

  const { count: employeeCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "employee");

  return {
    totalToday: sessions.length,
    checkedIn,
    inProgress,
    pendingApprovals: pendingApprovals ?? 0,
    diagnosis,
    monitor: sessions.map((s) => ({
      name: s.employee?.full_name ?? "—",
      patient: s.patients?.full_name ?? "—",
      time: s.scheduled_start ? formatThaiTime(s.scheduled_start) : "",
      status: s.status,
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
  isSpecial: boolean;
  // detail-sheet fields
  patientFull: string;
  employeeFull: string;
  program: string | null;
  address: string | null;
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
    .select("id, scheduled_date, scheduled_start, scheduled_end, status, is_special_case, special_amount, patients(full_name, training_program, address), employee:profiles!schedule_sessions_employee_id_fkey(full_name)")
    .order("scheduled_start")
    .limit(2000);
  return rows<{
    id: string; scheduled_date: string; scheduled_start: string; scheduled_end: string | null;
    status: SessionStatus; is_special_case: boolean; special_amount: number | null;
    patients: { full_name: string | null; training_program: string | null; address: string | null } | null;
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
      isSpecial: s.is_special_case,
      patientFull: full,
      employeeFull: emp,
      program: s.patients?.training_program ?? null,
      address: s.patients?.address ?? null,
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
export interface RelativePortalData {
  patientName: string;
  program: string | null;
  courseTotal: number;
  courseUsed: number;
  bonus: number;
  upcoming: { date: string; time: string; therapist: string }[];
  sessions: RelativePortalSession[];
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
    .select("patient_id, revoked")
    .eq("access_token", token)
    .maybeSingle();
  const access = one<{ patient_id: string; revoked: boolean }>(aData);
  if (!access || access.revoked) return null;

  const { data: pData } = await admin
    .from("patients")
    .select("id, full_name, training_program, phone")
    .eq("id", access.patient_id)
    .maybeSingle();
  const patient = one<{ id: string; full_name: string; training_program: string | null; phone: string | null }>(pData);
  if (!patient) return null;

  const { data: cData } = await admin
    .from("courses")
    .select("id, total_sessions, bonus_sessions")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const course = one<{ id: string; total_sessions: number | null; bonus_sessions: number }>(cData);
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

  return {
    patientName: patient.full_name,
    phoneLast4: (patient.phone ?? "").replace(/\D/g, "").slice(-4),
    program: patient.training_program,
    courseTotal: Number(course?.total_sessions ?? 0),
    courseUsed: used,
    bonus: Number(course?.bonus_sessions ?? 0),
    upcoming,
    sessions,
  };
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
    label: `${s.scheduled_date} ${formatThaiTime(s.scheduled_start)} · ${(s.patients?.full_name ?? "—")} · ${(s.employee?.full_name ?? "—")}`,
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
  patientName: string;
  authorName: string;
  date: string;
  status: string;
}

export async function getReports(): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, report_type, report_date, status, patients(full_name), author:profiles!reports_author_id_fkey(full_name)")
    .order("report_date", { ascending: false })
    .limit(200);
  return rows<{
    id: string; report_type: string; report_date: string; status: string;
    patients: { full_name: string | null } | null;
    author: { full_name: string | null } | null;
  }>(data).map((r) => ({
    id: r.id,
    typeLabel: REPORT_TYPE_LABEL[r.report_type] ?? r.report_type,
    patientName: r.patients?.full_name ?? "—",
    authorName: r.author?.full_name ?? "—",
    date: r.report_date,
    status: r.status,
  }));
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
    companyName: s?.company_name ?? "Better Brain - Swallow Rehab",
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
  selfieEnforced: boolean;
}> {
  const s = await getSettings();
  return {
    radiusM: s.geofenceRadiusM,
    lateThresholdMin: s.lateThresholdMin,
    selfieEnforced: s.selfieEnforced,
  };
}
