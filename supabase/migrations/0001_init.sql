-- ════════════════════════════════════════════════════════════════════════
-- TPM · Better Brain Swallow Rehab — initial schema
-- Storage is UTC timestamptz; พ.ศ. + Asia/Bangkok are presentation-only.
-- See docs/DATA-MODEL.md for the full spec. RLS policies live in 0002_rls.sql.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Enums ───────────────────────────────────────────────────────────────
create type user_role          as enum ('employee','admin','director');  -- director=top approver, admin=ops (was owner/hr)
create type employment_type    as enum ('monthly','part_time');
create type gender             as enum ('male','female','other');
create type booking_status     as enum ('booked','awaiting_payment','cancelled');
create type patient_status     as enum ('active','hold','no_service');
create type course_type        as enum ('pkg_10_plus_1','pkg_30');
create type course_status      as enum ('on_process','hold','course_complete','no_service');
create type course_outcome     as enum ('continue','no_service');
create type session_status     as enum (
  'scheduled','in_progress','attended','late','completed',
  'no_checkin','skipped','rescheduled','cancelled','corrected');
create type coverage_status    as enum ('not_required','needs_substitute','covered');
create type checkin_kind       as enum ('check_in','check_out');
create type report_type        as enum ('assessment_swallow','assessment_hand','followup','summary');  -- 3 types: Assessment · Follow up(รายวัน) · Summary(รายเดือน)
create type report_status      as enum ('draft','completed','corrected','discarded');
create type request_status     as enum ('pending','approved','rejected','applied','cancelled');
-- Leave system deferred to a later unified HR module (client 3.pdf p.7);
-- substitution/shift-swap is kept standalone via coverage_status (above).
create type diagnosis_category as enum ('stroke','parkinson','dementia_alzheimer','als','ms','other');
create type fois_level         as enum ('L1','L2','L3','L4','L5','L6','L7');
create type kpi_target         as enum ('patient','employee');
create type employee_kpi_kind  as enum ('stress','knowledge');
create type notification_type  as enum (
  'session_reminder_1d','course_ending','session_alert_9','course_remaining_0',
  'correction_decision','substitute_needed','substitute_assigned','generic');
create type notification_channel  as enum ('in_app','push','email','line');
create type notification_audience as enum ('employee','admin','director','relative');
create type audit_action       as enum ('login','logout','create','update','delete','check_in','check_out',
                                        'approve','reject','apply_correction','password_change','export');

-- ── Shared triggers ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ── profiles (1:1 auth.users) ───────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'employee',
  full_name     text not null,
  employee_code text unique,
  department    text,
  position_title text,
  license_no    text,
  phone         text,
  photo_url     text,
  employment_type employment_type not null default 'monthly',
  is_enabled    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Director cap: at most 2 director accounts.
create or replace function public.enforce_director_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'director'
     and (select count(*) from public.profiles where role = 'director' and id <> new.id) >= 2 then
    raise exception 'director account cap (2) reached';
  end if;
  return new;
end $$;
create trigger trg_director_cap before insert or update of role on public.profiles
  for each row when (new.role = 'director') execute function public.enforce_director_cap();

-- ── Role helpers (security definer; avoid RLS recursion) ─────────────────
create or replace function public.current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.is_director() returns boolean
  language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'director' $$;
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'admin' $$;
create or replace function public.is_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('admin','director') $$;
create or replace function public.is_enabled() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select is_enabled from public.profiles where id = auth.uid()), false) $$;

-- ── settings (singleton id=1) ───────────────────────────────────────────
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null default 'Better Brain - Swallow Rehab',
  logo_url text,
  selfie_enforced boolean not null default true,
  late_threshold_minutes int not null default 15,
  early_threshold_minutes int not null default 15,
  geofence_radius_m int not null default 1000,
  session_9_alert_enabled boolean not null default true,
  reminder_lead_days int not null default 1,
  extra jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.settings
  for each row execute function public.set_updated_at();

-- ── diagnoses lookup (stats) ────────────────────────────────────────────
create table public.diagnoses (
  category diagnosis_category primary key,
  label_en text not null,
  sort int not null default 0
);

-- ── work_hour_slots ─────────────────────────────────────────────────────
create table public.work_hour_slots (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  slot_start time not null,
  slot_end   time not null,
  weekday smallint check (weekday between 0 and 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (slot_end > slot_start)
);
create index idx_slots_employee on public.work_hour_slots(employee_id, weekday);

-- ── patients (intake / treatment history) ───────────────────────────────
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  hn text unique,                          -- Hospital Number; digits only (e.g. 69010000)
  full_name text not null,
  age_years int,
  dob date,
  national_id text,
  nationality text,
  race text,
  marital_status text,
  address text,
  gender gender,
  phone text,
  underlying text,
  drug_allergy text,
  past_history text,
  surgery_history text,
  chief_complaint text,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  referral_source text,
  training_program text,
  diagnosis_category diagnosis_category,
  status patient_status not null default 'active',
  home_lat double precision,
  home_lng double precision,
  consent_intake boolean not null default false,
  consent_version text,
  created_by uuid references public.profiles(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_patients_updated before update on public.patients
  for each row execute function public.set_updated_at();
create index idx_patients_status on public.patients(status);
create index idx_patients_dx on public.patients(diagnosis_category);

-- ── patient_assignments (RLS backbone: who may see whom) ─────────────────
create table public.patient_assignments (
  employee_id uuid not null references public.profiles(id) on delete cascade,
  patient_id  uuid not null references public.patients(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (employee_id, patient_id)
);
create index idx_assign_patient on public.patient_assignments(patient_id);

-- ── bookings (public intake → conversion) ───────────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  area text,
  note text,
  source text not null default 'public_form',
  status booking_status not null default 'booked',
  consent_booking boolean not null default false,
  patient_id uuid references public.patients(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();
create index idx_bookings_status on public.bookings(status);

-- ── courses ─────────────────────────────────────────────────────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  course_type course_type not null,
  base_sessions int not null,
  bonus_sessions int not null default 0,
  total_sessions int generated always as (base_sessions + bonus_sessions) stored,
  price numeric(12,2),
  status course_status not null default 'on_process',
  outcome course_outcome,
  started_on date,
  completed_on date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_courses_updated before update on public.courses
  for each row execute function public.set_updated_at();
create index idx_courses_patient on public.courses(patient_id);
create index idx_courses_status on public.courses(status);

-- ── schedule_sessions (monthly assignment queue; owns attendance) ────────
create table public.schedule_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  employee_id uuid not null references public.profiles(id),
  slot_id uuid references public.work_hour_slots(id),
  scheduled_date date not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  status session_status not null default 'scheduled',
  counts_as_training boolean not null default true,
  is_special_case boolean not null default false,
  special_amount numeric(12,2),
  special_note text,
  coverage_status coverage_status not null default 'not_required',
  substituted_from uuid references public.profiles(id),  -- original employee when reassigned (จัดเวรแทน/สลับเวร)
  substitution_reason text,
  assigned_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_special_case or special_amount is not null)
);
create trigger trg_sessions_updated before update on public.schedule_sessions
  for each row execute function public.set_updated_at();
create index idx_sessions_emp_date on public.schedule_sessions(employee_id, scheduled_date);
create index idx_sessions_pat_date on public.schedule_sessions(patient_id, scheduled_date);
create index idx_sessions_course on public.schedule_sessions(course_id);
create index idx_sessions_status on public.schedule_sessions(status);
create index idx_sessions_needs_sub on public.schedule_sessions(coverage_status)
  where coverage_status = 'needs_substitute';

-- ── check_ins (client-UUID PK for idempotent offline sync) ──────────────
create table public.check_ins (
  id uuid primary key,                                  -- client-generated
  session_id uuid not null references public.schedule_sessions(id) on delete cascade,
  employee_id uuid not null references public.profiles(id),
  kind checkin_kind not null default 'check_in',
  client_event_at timestamptz not null,
  server_received_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  distance_m double precision,
  within_geofence boolean,
  is_late boolean not null default false,
  is_early boolean not null default false,
  selfie_url text,
  device_id text,
  corrected boolean not null default false,
  unique (session_id, kind)
);
create index idx_checkins_emp on public.check_ins(employee_id, client_event_at);

-- ── reports (clinical forms as jsonb) ───────────────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type report_type not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  session_id uuid references public.schedule_sessions(id) on delete set null,
  author_id uuid not null references public.profiles(id),
  check_in_id uuid references public.check_ins(id),
  status report_status not null default 'draft',
  report_date date not null default current_date,
  payload jsonb not null default '{}',
  attachments jsonb not null default '[]',
  fois_level fois_level,
  completed_at timestamptz,
  discarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Assessment + Follow up require a check-in. (Plain CHECK — Postgres does not
  -- allow DEFERRABLE on CHECK; offline sync inserts the check-in row first.)
  constraint chk_report_requires_checkin check (
    report_type not in ('assessment_swallow','assessment_hand','followup')
    or check_in_id is not null
  )
);
create trigger trg_reports_updated before update on public.reports
  for each row execute function public.set_updated_at();
create index idx_reports_patient on public.reports(patient_id, report_type);
create index idx_reports_author on public.reports(author_id, status);
create index idx_reports_session on public.reports(session_id);
create index idx_reports_payload on public.reports using gin (payload);

-- Vanish-on-save: completing a report stamps completed_at; block employee revert.
create or replace function public.reports_guard()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    new.completed_at := now();
  end if;
  if old.status = 'completed' and new.status = 'draft' and not public.is_staff() then
    raise exception 'employees cannot revert a completed report to draft';
  end if;
  return new;
end $$;
create trigger trg_reports_guard before update on public.reports
  for each row execute function public.reports_guard();

-- ── kpi_templates (year-versioned employee question bank) ───────────────
create table public.kpi_templates (
  id uuid primary key default gen_random_uuid(),
  kind employee_kpi_kind not null,
  title text not null,
  period_year int not null,
  questions jsonb not null default '[]',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (kind, period_year, title)
);
create index idx_kpi_templates_kind on public.kpi_templates(kind, period_year);

-- ── kpi_evaluations (patient + employee) ────────────────────────────────
create table public.kpi_evaluations (
  id uuid primary key default gen_random_uuid(),
  target kpi_target not null,
  patient_id uuid references public.patients(id) on delete cascade,
  employee_id uuid references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  evaluated_by uuid not null references public.profiles(id),
  fois_level fois_level,
  barthel_index int check (barthel_index between 0 and 100),
  function_checklist jsonb not null default '{}',
  progress_kind text,
  employee_kpi_kind employee_kpi_kind,
  template_id uuid references public.kpi_templates(id),
  answers jsonb not null default '{}',
  score numeric(6,2),
  evaluated_on date not null default current_date,
  period_year int,
  created_at timestamptz not null default now(),
  check (target <> 'patient' or patient_id is not null),
  check (target <> 'employee' or (employee_id is not null and employee_kpi_kind is not null))
);
create index idx_kpi_patient on public.kpi_evaluations(patient_id);
create index idx_kpi_employee on public.kpi_evaluations(employee_id, employee_kpi_kind, period_year);

-- ── correction_requests (director approves → admin applies) ─────────────
create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  check_in_id uuid references public.check_ins(id),
  session_id uuid not null references public.schedule_sessions(id) on delete cascade,
  requested_changes jsonb not null default '{}',
  before_snapshot jsonb,
  reason text not null,
  status request_status not null default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  applied_by uuid references public.profiles(id),
  applied_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_corrections_updated before update on public.correction_requests
  for each row execute function public.set_updated_at();
create index idx_corrections_employee on public.correction_requests(employee_id, status);
create index idx_corrections_status on public.correction_requests(status);

-- ── relatives portal (NOT auth users) ───────────────────────────────────
create table public.relatives (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  full_name text,
  relation text,
  phone text,
  email text,
  line_user_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.relative_access (
  id uuid primary key default gen_random_uuid(),
  relative_id uuid not null references public.relatives(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  access_token text not null unique,
  consent_relative_portal boolean not null default false,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_relaccess_patient on public.relative_access(patient_id);

-- ── notifications ───────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type notification_type not null,
  audience notification_audience not null,
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  recipient_relative_id uuid references public.relatives(id) on delete cascade,
  channel notification_channel not null default 'in_app',
  title text not null,
  body text,
  data jsonb not null default '{}',
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);
create index idx_notif_pending on public.notifications(scheduled_for) where sent_at is null;
create index idx_notif_recipient on public.notifications(recipient_profile_id, read_at);

-- ── push_subscriptions (Web Push / VAPID; staff/employee only) ──────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_push_profile on public.push_subscriptions(profile_id);

-- ── audit_logs (append-only; director-only read) ────────────────────────
create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_role user_role,
  action audit_action not null,
  entity text,
  entity_id text,
  before jsonb,
  after jsonb,
  changed_cols text[],
  ip inet,
  user_agent text,
  request_id text,
  context jsonb
);
create index idx_audit_entity on public.audit_logs(entity, entity_id);
create index idx_audit_actor on public.audit_logs(actor_id, occurred_at desc);
create index idx_audit_action on public.audit_logs(action, occurred_at desc);

-- ── Derived: course progress (count on session status) ──────────────────
create or replace view public.course_progress as
select c.id as course_id, c.base_sessions, c.bonus_sessions, c.total_sessions,
  count(*) filter (where s.counts_as_training and s.status in ('attended','late','completed')) as used_sessions,
  greatest(c.total_sessions
    - count(*) filter (where s.counts_as_training and s.status in ('attended','late','completed')), 0) as remaining_sessions
from public.courses c
left join public.schedule_sessions s on s.course_id = c.id
group by c.id, c.base_sessions, c.bonus_sessions, c.total_sessions;

-- ── can_access_patient (assigned-only visibility) ───────────────────────
create or replace function public.can_access_patient(p_patient_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff()
      or exists (
        select 1 from public.patient_assignments pa
        where pa.patient_id = p_patient_id and pa.employee_id = auth.uid()
      )
$$;
