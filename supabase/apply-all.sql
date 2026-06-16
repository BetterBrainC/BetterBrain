-- TPM consolidated apply (0001..0005 + seed) — paste into Supabase SQL Editor.

-- ╔═══ 0001_init ═══╗
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
                                        'approve','reject','apply_correction','password_change','export','access_revoke');

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
  show_followup boolean not null default true,   -- clinic selects which reports relatives see
  show_summary  boolean not null default true,
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

-- ── push_subscriptions (Web Push / VAPID; staff/employee AND relatives) ──
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  relative_id uuid references public.relatives(id) on delete cascade,  -- relatives are NOT auth users
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint chk_push_owner check (num_nonnulls(profile_id, relative_id) = 1)  -- exactly one owner
);
create index idx_push_profile on public.push_subscriptions(profile_id);
create index idx_push_relative on public.push_subscriptions(relative_id);

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

-- ╔═══ 0002_rls ═══╗
-- ════════════════════════════════════════════════════════════════════════
-- TPM — Row Level Security. Default-deny: enable RLS on every table, then add
-- least-privilege policies. See docs/DATA-MODEL.md §RLS.
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles            enable row level security;
alter table public.settings            enable row level security;
alter table public.diagnoses           enable row level security;
alter table public.work_hour_slots     enable row level security;
alter table public.patients            enable row level security;
alter table public.patient_assignments enable row level security;
alter table public.bookings            enable row level security;
alter table public.courses             enable row level security;
alter table public.schedule_sessions   enable row level security;
alter table public.check_ins           enable row level security;
alter table public.reports             enable row level security;
alter table public.kpi_templates       enable row level security;
alter table public.kpi_evaluations     enable row level security;
alter table public.correction_requests enable row level security;
alter table public.relatives           enable row level security;
alter table public.relative_access     enable row level security;
alter table public.notifications       enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.audit_logs          enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_staff());
create policy profiles_insert on public.profiles for insert
  with check (public.is_staff());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_staff())
  with check (id = auth.uid() or public.is_staff());
create policy profiles_delete on public.profiles for delete
  using (public.is_director());

-- Employees may not self-edit privileged fields (role/license/code/enabled).
create or replace function public.profiles_self_guard()
returns trigger language plpgsql as $$
begin
  if not public.is_staff() and auth.uid() = new.id then
    if new.role is distinct from old.role
       or new.license_no is distinct from old.license_no
       or new.employee_code is distinct from old.employee_code
       or new.is_enabled is distinct from old.is_enabled then
      raise exception 'employees may only edit phone/photo on their own profile';
    end if;
  end if;
  return new;
end $$;
create trigger trg_profiles_self_guard before update on public.profiles
  for each row execute function public.profiles_self_guard();

-- ── settings ────────────────────────────────────────────────────────────
create policy settings_select on public.settings for select
  using (auth.uid() is not null);
create policy settings_update on public.settings for update
  using (public.is_staff()) with check (public.is_staff());

-- ── diagnoses ───────────────────────────────────────────────────────────
create policy diagnoses_select on public.diagnoses for select
  using (auth.uid() is not null);
create policy diagnoses_write on public.diagnoses for all
  using (public.is_staff()) with check (public.is_staff());

-- ── work_hour_slots ─────────────────────────────────────────────────────
create policy slots_select on public.work_hour_slots for select
  using (public.is_staff() or employee_id = auth.uid());
create policy slots_write on public.work_hour_slots for all
  using (public.is_staff()) with check (public.is_staff());

-- ── patients (assigned-only for employees; address NOT masked) ──────────
create policy patients_select on public.patients for select
  using (public.can_access_patient(id));
create policy patients_insert on public.patients for insert
  with check (public.is_staff());
create policy patients_update on public.patients for update
  using (public.is_staff()) with check (public.is_staff());
create policy patients_delete on public.patients for delete
  using (public.is_director());

-- ── patient_assignments ─────────────────────────────────────────────────
create policy assign_select on public.patient_assignments for select
  using (public.is_staff() or employee_id = auth.uid());
create policy assign_write on public.patient_assignments for all
  using (public.is_staff()) with check (public.is_staff());

-- ── bookings (public insert handled by a SECURITY DEFINER RPC, P2) ──────
create policy bookings_select on public.bookings for select
  using (public.is_staff());
create policy bookings_write on public.bookings for all
  using (public.is_staff()) with check (public.is_staff());

-- ── courses ─────────────────────────────────────────────────────────────
create policy courses_select on public.courses for select
  using (public.is_staff() or public.can_access_patient(patient_id));
create policy courses_write on public.courses for all
  using (public.is_staff()) with check (public.is_staff());

-- ── schedule_sessions ───────────────────────────────────────────────────
create policy sessions_select on public.schedule_sessions for select
  using (public.is_staff() or employee_id = auth.uid());
create policy sessions_write on public.schedule_sessions for all
  using (public.is_staff()) with check (public.is_staff());

-- ── check_ins (Admin edits only after an approved correction) ───────────
create policy checkins_select on public.check_ins for select
  using (public.is_staff() or employee_id = auth.uid());
create policy checkins_insert on public.check_ins for insert
  with check (employee_id = auth.uid());
create policy checkins_update on public.check_ins for update
  using (
    public.is_director()
    or (public.is_admin() and exists (
      select 1 from public.correction_requests cc
      where cc.check_in_id = check_ins.id and cc.status = 'approved'))
  )
  with check (true);
create policy checkins_delete on public.check_ins for delete
  using (public.is_director());

-- ── reports (vanish-on-save) ────────────────────────────────────────────
create policy reports_select on public.reports for select
  using (public.is_staff() or (author_id = auth.uid() and status = 'draft'));
create policy reports_insert on public.reports for insert
  with check (author_id = auth.uid() and public.can_access_patient(patient_id));
create policy reports_update_employee on public.reports for update
  using (author_id = auth.uid() and status = 'draft')
  with check (author_id = auth.uid());
create policy reports_update_staff on public.reports for update
  using (public.is_staff()) with check (public.is_staff());
create policy reports_delete on public.reports for delete
  using (public.is_director());

-- ── kpi_templates ───────────────────────────────────────────────────────
create policy kpi_tmpl_select on public.kpi_templates for select
  using (public.is_staff());  -- answer key must not reach employees; they use kpi_questions_for_employee()
create policy kpi_tmpl_write on public.kpi_templates for all
  using (public.is_staff()) with check (public.is_staff());

-- ── kpi_evaluations (results = Director-only view) ──────────────────────
create policy kpi_eval_select on public.kpi_evaluations for select
  using (public.is_director());
create policy kpi_eval_insert on public.kpi_evaluations for insert
  with check (
    public.is_staff()
    or (target = 'employee' and employee_id = auth.uid())
    or (target = 'patient' and public.can_access_patient(patient_id))
  );
create policy kpi_eval_update on public.kpi_evaluations for update
  using (public.is_staff()) with check (public.is_staff());

-- (leave_requests removed — leave system deferred to a later HR module)

-- ── correction_requests ─────────────────────────────────────────────────
create policy corr_select on public.correction_requests for select
  using (public.is_staff() or employee_id = auth.uid());
create policy corr_insert on public.correction_requests for insert
  with check (employee_id = auth.uid());
create policy corr_update on public.correction_requests for update
  using (public.is_staff()) with check (public.is_staff());

-- ── relatives / relative_access (managed by staff; portal uses service-role)
create policy relatives_staff on public.relatives for all
  using (public.is_staff()) with check (public.is_staff());
create policy relaccess_staff on public.relative_access for all
  using (public.is_staff()) with check (public.is_staff());

-- ── notifications ───────────────────────────────────────────────────────
create policy notif_select on public.notifications for select
  using (public.is_staff() or recipient_profile_id = auth.uid());
create policy notif_update on public.notifications for update
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());
create policy notif_staff_write on public.notifications for insert
  with check (public.is_staff());

-- ── push_subscriptions (own devices only) ───────────────────────────────
create policy push_all on public.push_subscriptions for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ── audit_logs (director-only read; writes via SECURITY DEFINER paths) ──
create policy audit_select_director on public.audit_logs for select
  using (public.is_director());

-- ╔═══ 0003_auth_hooks ═══╗
-- ════════════════════════════════════════════════════════════════════════
-- Auth hook: auto-create a profile row when an auth user is created.
-- New users default to 'employee'; promote to 'admin'/'director' explicitly (the
-- director cap of 2 is enforced by trg_director_cap in 0001_init.sql).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'employee'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ╔═══ 0004_hardening ═══╗
-- ════════════════════════════════════════════════════════════════════════
-- 0004_hardening.sql — resolve Supabase security advisors after 0001–0003.
-- (RLS-helper fns is_staff/is_director/is_admin/current_user_role/is_enabled/
--  can_access_patient KEEP execute — RLS policies call them, so they must stay
--  executable by `authenticated`; only trigger-only fns get execute revoked.)
-- ════════════════════════════════════════════════════════════════════════

-- 1) course_progress view respects the querying user's RLS (was SECURITY DEFINER).
alter view public.course_progress set (security_invoker = on);

-- 2) Pin search_path on trigger functions (function_search_path_mutable).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.reports_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    new.completed_at := now();
  end if;
  if old.status = 'completed' and new.status = 'draft' and not public.is_staff() then
    raise exception 'employees cannot revert a completed report to draft';
  end if;
  return new;
end $$;

create or replace function public.profiles_self_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_staff() and auth.uid() = new.id then
    if new.role is distinct from old.role
       or new.license_no is distinct from old.license_no
       or new.employee_code is distinct from old.employee_code
       or new.is_enabled is distinct from old.is_enabled then
      raise exception 'employees may only edit phone/photo on their own profile';
    end if;
  end if;
  return new;
end $$;

-- 3) Trigger-only functions are not meant to be PostgREST RPC endpoints.
revoke execute on function public.set_updated_at()       from public, anon, authenticated;
revoke execute on function public.reports_guard()        from public, anon, authenticated;
revoke execute on function public.profiles_self_guard()  from public, anon, authenticated;
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.enforce_director_cap() from public, anon, authenticated;

-- 4) check_ins update: tighten WITH CHECK (was always-true).
drop policy if exists checkins_update on public.check_ins;
create policy checkins_update on public.check_ins for update
  using (
    public.is_director()
    or (public.is_admin() and exists (
      select 1 from public.correction_requests cc
      where cc.check_in_id = check_ins.id and cc.status = 'approved'))
  )
  with check (public.is_director() or public.is_admin());

-- ╔═══ 0005_checkin_rpc ═══╗
-- ════════════════════════════════════════════════════════════════════════
-- 0005 — employee check-in/out + Follow-up RPCs (SECURITY DEFINER).
-- Employees cannot write schedule_sessions directly (RLS = staff only), so the
-- attendance status flip happens inside these definer functions, which verify
-- the caller owns the session.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.record_check_event(
  p_session_id uuid,
  p_kind public.checkin_kind,
  p_lat double precision,
  p_lng double precision,
  p_distance_m double precision,
  p_within boolean,
  p_is_late boolean default false,
  p_is_early boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare v_emp uuid;
begin
  select employee_id into v_emp from public.schedule_sessions where id = p_session_id;
  if v_emp is null or v_emp <> auth.uid() then
    raise exception 'not authorized for this session';
  end if;
  insert into public.check_ins(id, session_id, employee_id, kind, client_event_at,
    lat, lng, distance_m, within_geofence, is_late, is_early)
  values (gen_random_uuid(), p_session_id, auth.uid(), p_kind, now(),
    p_lat, p_lng, p_distance_m, p_within, coalesce(p_is_late,false), coalesce(p_is_early,false))
  on conflict (session_id, kind) do nothing;
  if p_kind = 'check_in' then
    update public.schedule_sessions
      set status = case when coalesce(p_is_late,false) then 'late'::session_status else 'in_progress'::session_status end
      where id = p_session_id and status in ('scheduled','rescheduled');
  end if;
end $$;

create or replace function public.save_followup(
  p_session_id uuid,
  p_payload jsonb default '{}',
  p_fois public.fois_level default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_emp uuid; v_patient uuid; v_course uuid; v_checkin uuid; v_report uuid;
begin
  select employee_id, patient_id, course_id into v_emp, v_patient, v_course
    from public.schedule_sessions where id = p_session_id;
  if v_emp is null or v_emp <> auth.uid() then
    raise exception 'not authorized for this session';
  end if;
  select id into v_checkin from public.check_ins where session_id = p_session_id and kind = 'check_in' limit 1;
  insert into public.reports(report_type, patient_id, course_id, session_id, author_id, check_in_id, status, payload, fois_level, completed_at)
  values ('followup', v_patient, v_course, p_session_id, auth.uid(), v_checkin, 'completed', coalesce(p_payload,'{}'::jsonb), p_fois, now())
  returning id into v_report;
  update public.schedule_sessions set status = 'completed' where id = p_session_id;
  return v_report;
end $$;

revoke execute on function public.record_check_event(uuid,public.checkin_kind,double precision,double precision,double precision,boolean,boolean,boolean) from public, anon;
grant  execute on function public.record_check_event(uuid,public.checkin_kind,double precision,double precision,double precision,boolean,boolean,boolean) to authenticated;
revoke execute on function public.save_followup(uuid,jsonb,public.fois_level) from public, anon;
grant  execute on function public.save_followup(uuid,jsonb,public.fois_level) to authenticated;

-- ╔═══ 0008_relative_portal_and_revoke ═══╗
-- Saving a Summary on a FINISHED course revokes relative + employee access and
-- marks the course complete (audit-logged). See migrations/0008.
create or replace function public.revoke_access_on_summary()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_remaining int;
  v_status public.course_status;
begin
  if new.report_type <> 'summary' or new.status <> 'completed' or new.course_id is null then
    return new;
  end if;

  select remaining_sessions into v_remaining
    from public.course_progress where course_id = new.course_id;
  select status into v_status from public.courses where id = new.course_id;

  if coalesce(v_remaining, 1) > 0 and v_status is distinct from 'course_complete' then
    return new;
  end if;

  update public.courses
     set status = 'course_complete', completed_on = coalesce(completed_on, current_date)
   where id = new.course_id and status <> 'course_complete';

  update public.relative_access
     set revoked = true
   where patient_id = new.patient_id and revoked = false;

  insert into public.audit_logs(actor_id, action, entity, entity_id, after, context)
  values (auth.uid(), 'access_revoke', 'patient', new.patient_id::text,
          jsonb_build_object('reason', 'summary_completed', 'course_id', new.course_id),
          jsonb_build_object('report_id', new.id));

  delete from public.patient_assignments where patient_id = new.patient_id;
  return new;
end $$;
revoke execute on function public.revoke_access_on_summary() from public, anon, authenticated;

drop trigger if exists trg_revoke_on_summary on public.reports;
create trigger trg_revoke_on_summary
  after insert or update of status on public.reports
  for each row execute function public.revoke_access_on_summary();

-- ╔═══ 0009_kpi_geofence_course ═══╗
-- Employee question bank without the answer key (definer; RLS-bypassing).
create or replace function public.kpi_questions_for_employee(
  p_kind public.employee_kpi_kind,
  p_year int
) returns table(template_id uuid, questions jsonb)
language sql security definer set search_path = public stable as $$
  select t.id,
    coalesce((select jsonb_agg(q - 'answer') from jsonb_array_elements(t.questions) q), '[]'::jsonb)
  from public.kpi_templates t
  where t.kind = p_kind and t.period_year = p_year and t.is_active = true
  order by t.created_at desc
  limit 1
$$;
revoke execute on function public.kpi_questions_for_employee(public.employee_kpi_kind, int) from public, anon;
grant  execute on function public.kpi_questions_for_employee(public.employee_kpi_kind, int) to authenticated;

-- Check-in RPC: geofence enforced server-side + selfie + client event id.
drop function if exists public.record_check_event(uuid, public.checkin_kind, double precision, double precision, double precision, boolean, boolean, boolean);
create or replace function public.record_check_event(
  p_session_id uuid, p_kind public.checkin_kind, p_lat double precision, p_lng double precision,
  p_distance_m double precision, p_within boolean, p_is_late boolean default false,
  p_is_early boolean default false, p_selfie_url text default null, p_event_id uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_emp uuid; v_patient uuid; v_hlat double precision; v_hlng double precision; v_radius int; v_dist double precision; v_id uuid;
begin
  select s.employee_id, s.patient_id into v_emp, v_patient from public.schedule_sessions s where s.id = p_session_id;
  if v_emp is null or v_emp <> auth.uid() then raise exception 'not authorized for this session'; end if;
  if p_kind = 'check_in' then
    select home_lat, home_lng into v_hlat, v_hlng from public.patients where id = v_patient;
    select geofence_radius_m into v_radius from public.settings where id = 1;
    if v_hlat is not null and v_hlng is not null and p_lat is not null and p_lng is not null then
      v_dist := 2 * 6371000 * asin(sqrt(power(sin(radians((p_lat - v_hlat)/2)),2) + cos(radians(v_hlat))*cos(radians(p_lat))*power(sin(radians((p_lng - v_hlng)/2)),2)));
      if v_dist > coalesce(v_radius, 1000) then raise exception 'OUT_OF_GEOFENCE'; end if;
    end if;
  end if;
  v_id := coalesce(p_event_id, gen_random_uuid());
  insert into public.check_ins(id, session_id, employee_id, kind, client_event_at, lat, lng, distance_m, within_geofence, is_late, is_early, selfie_url)
  values (v_id, p_session_id, auth.uid(), p_kind, now(), p_lat, p_lng, p_distance_m, p_within, coalesce(p_is_late,false), coalesce(p_is_early,false), p_selfie_url)
  on conflict (session_id, kind) do nothing;
  if p_kind = 'check_in' then
    update public.schedule_sessions set status = case when coalesce(p_is_late,false) then 'late'::session_status else 'in_progress'::session_status end
      where id = p_session_id and status in ('scheduled','rescheduled');
  end if;
end $$;
revoke execute on function public.record_check_event(uuid, public.checkin_kind, double precision, double precision, double precision, boolean, boolean, boolean, text, uuid) from public, anon;
grant  execute on function public.record_check_event(uuid, public.checkin_kind, double precision, double precision, double precision, boolean, boolean, boolean, text, uuid) to authenticated;

-- Course package shape (new rows only).
alter table public.courses drop constraint if exists chk_course_pkg;
alter table public.courses add constraint chk_course_pkg check (
  (course_type = 'pkg_10_plus_1' and base_sessions = 10 and bonus_sessions = 1)
  or (course_type = 'pkg_30' and base_sessions = 30 and bonus_sessions = 0)
) not valid;

-- ╔═══ 0011_save_followup_idempotent ═══╗
drop function if exists public.save_followup(uuid, jsonb, public.fois_level);
create or replace function public.save_followup(
  p_session_id uuid, p_payload jsonb default '{}', p_fois public.fois_level default null, p_report_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_emp uuid; v_patient uuid; v_course uuid; v_checkin uuid; v_report uuid;
begin
  select employee_id, patient_id, course_id into v_emp, v_patient, v_course from public.schedule_sessions where id = p_session_id;
  if v_emp is null or v_emp <> auth.uid() then raise exception 'not authorized for this session'; end if;
  select id into v_checkin from public.check_ins where session_id = p_session_id and kind = 'check_in' limit 1;
  v_report := coalesce(p_report_id, gen_random_uuid());
  insert into public.reports(id, report_type, patient_id, course_id, session_id, author_id, check_in_id, status, payload, fois_level, completed_at)
  values (v_report, 'followup', v_patient, v_course, p_session_id, auth.uid(), v_checkin, 'completed', coalesce(p_payload,'{}'::jsonb), p_fois, now())
  on conflict (id) do nothing;
  update public.schedule_sessions set status = 'completed' where id = p_session_id;
  return v_report;
end $$;
revoke execute on function public.save_followup(uuid, jsonb, public.fois_level, uuid) from public, anon;
grant  execute on function public.save_followup(uuid, jsonb, public.fois_level, uuid) to authenticated;

-- ╔═══ seed.sql ═══╗
-- ════════════════════════════════════════════════════════════════════════
-- Seed data — safe to run repeatedly (idempotent upserts).
-- ════════════════════════════════════════════════════════════════════════

-- Singleton settings row.
insert into public.settings (id, company_name)
values (1, 'Better Brain - Swallow Rehab')
on conflict (id) do nothing;

-- Private storage bucket for report photos + check-in selfies.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 8388608)
on conflict (id) do nothing;

-- Diagnosis categories (for statistics; store full English names).
insert into public.diagnoses (category, label_en, sort) values
  ('stroke',             'Stroke',                          1),
  ('parkinson',          'Parkinson',                       2),
  ('dementia_alzheimer', 'Dementia / Alzheimer',            3),
  ('als',                'Amyotrophic Lateral Sclerosis (ALS)', 4),
  ('ms',                 'Multiple Sclerosis (MS)',         5),
  ('other',              'Other',                           6)
on conflict (category) do update set label_en = excluded.label_en, sort = excluded.sort;

-- ── Director accounts (max 2) ───────────────────────────────────────────
-- Auth users cannot be seeded reliably via plain SQL. Create the 2 director
-- accounts first (Supabase dashboard → Authentication, or the admin API),
-- then promote them by email:
--
--   update public.profiles p set role = 'director', full_name = 'Director 1'
--   from auth.users u
--   where u.email = 'director1@betterbrain.co' and p.id = u.id;
--
--   update public.profiles p set role = 'director', full_name = 'Director 2'
--   from auth.users u
--   where u.email = 'director2@betterbrain.co' and p.id = u.id;
--
-- Promote an Admin account the same way with role = 'admin'.

