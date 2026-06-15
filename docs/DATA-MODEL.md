# TPM — Data Model (Postgres / Supabase) + RLS

> **Client review v3 (2026-06-14, flow/3.pdf) — applied.** Roles renamed `owner→director`, `hr→admin` (helpers `is_director()`/`is_admin()`, `enforce_director_cap`). `report_type` = `assessment_swallow`/`assessment_hand`/**`followup`**/**`summary`** (3 types). **`leave_requests` removed** (leave deferred to a later HR module); substitution is **standalone** on `schedule_sessions` (`coverage_status`/`substituted_from`/`substitution_reason`). ผู้รับบริการ KPI adds **FIM + MFS** (criteria pending). The SQL in `supabase/migrations/` is canonical where this prose lags.

Conventions: all tables in `public`. Every table has `id uuid PK default gen_random_uuid()` (except `check_ins` whose `id` is the client-generated UUID, and `settings`/`audit_logs` noted below), `created_at timestamptz default now()`, `updated_at timestamptz default now()` (via `set_updated_at()` trigger). All timestamps are UTC `timestamptz`; พ.ศ. is display-only. Soft-delete via `deleted_at` on master tables. Money `numeric(12,2)`. GPS as `double precision` lat/lng (PostGIS not required). **All derived time comparisons use `Asia/Bangkok`.**

This is the single source of truth for table/column/enum names referenced by docs/ARCHITECTURE.md and docs/DOMAIN-SPEC.md.

---

## 1. ENUMS (defined first)

```sql
create type user_role         as enum ('employee','admin','director');
create type employment_type   as enum ('monthly','part_time');
create type booking_status    as enum ('booked','awaiting_payment','cancelled');     -- ทำนัดแล้ว/รอชำระเงิน/ยกเลิกนัด
create type patient_status     as enum ('active','hold','no_service');                -- นัดหมายปกติ/งดกระทันหัน/จบคอร์ส
create type course_type        as enum ('pkg_10_plus_1','pkg_30');
create type course_status      as enum ('on_process','hold','course_complete','no_service');
create type course_outcome     as enum ('continue','no_service');                     -- chosen at ครบคอร์ส
create type session_status     as enum (
  'scheduled','in_progress','attended','late','completed',
  'no_checkin','skipped','rescheduled','cancelled','corrected');                      -- attendance lives here
create type checkin_kind       as enum ('check_in','check_out');
create type report_type        as enum ('assessment_swallow','assessment_hand','followup','summary');  -- Assessment · Follow up (รายวัน) · Summary (รายเดือน)
create type report_status      as enum ('draft','completed','corrected','discarded'); -- single lifecycle col; RLS reads this
create type request_status     as enum ('pending','approved','rejected','applied','cancelled');  -- check-in corrections only (leave removed v3)
create type coverage_status    as enum ('not_required','needs_substitute','covered'); -- standalone substitution (จัดเวรแทน), not leave-driven
create type diagnosis_category as enum ('stroke','parkinson','dementia_alzheimer','als','ms','other');
create type fois_level         as enum ('L1','L2','L3','L4','L5','L6','L7');
create type kpi_target         as enum ('patient','employee');
create type employee_kpi_kind  as enum ('stress','knowledge');                        -- แบบประเมินความเครียด / แบบทดสอบความรู้
create type notification_type  as enum ('session_reminder_1d','course_ending','session_alert_9',
                                        'course_remaining_0','correction_decision',
                                        'substitute_needed','substitute_assigned','generic');
create type notification_channel  as enum ('in_app','push','email','line');           -- 'push' = Web Push for authenticated staff/employee ONLY (never relatives)
create type notification_audience as enum ('employee','admin','director','relative');
create type audit_action       as enum ('login','logout','create','update','delete','check_in','check_out',
                                        'approve','reject','apply_correction','password_change','export');
create type gender             as enum ('male','female','other');
```

Notes: there is **no** `report_visibility` enum/column (visibility derives from `report_status`). There is **no** `consciousness` enum (consciousness lives in the Hand assessment jsonb payload). `report_type` carries the assessment subtype directly (`assessment_swallow`/`assessment_hand`); the daily report is **`followup`** and the monthly is **`summary`**. **Leave is removed in v3** — there is no `leave_requests` table and no `request_type`/`leave_kind`/`leave_duration` enums (nor `leave_*` notification types); substitution is standalone via `schedule_sessions.coverage_status`/`substituted_from` (not leave-driven).

---

## 2. Table-by-table spec

### `profiles` — staff + employee accounts (1:1 with `auth.users`)
| Column | Type | Notes |
|---|---|---|
| `id` uuid PK = `auth.users.id` | | on delete cascade |
| `role` user_role not null default `'employee'` | | mirrored to JWT claim |
| `full_name` text not null | | |
| `nickname` text | | |
| `employee_code` text | | รหัสพนักงาน (unique when present) |
| `department` text | | แผนก |
| `position` text | | ตำแหน่ง |
| `employment_type` employment_type | | รายเดือน/พาร์ทไทม์ |
| `license_no` text | | เลขที่ใบประกอบวิชาชีพ — single source; monthly report reads this, not hand-typed |
| `phone` text · `email` text | | |
| `photo_path` text | | Storage; relatives portal |
| `bio` text | | brief therapist profile |
| `is_active` bool not null default true | | gates `is_enabled()` |
| `deleted_at` timestamptz | | |

Indexes: `(role)`, `(is_active)`, unique `(employee_code) where employee_code is not null`.

### `bookings` — native public intake (+ Admin manual entry)
`contact_name`*, `contact_phone`*, `contact_line`, `patient_is` (self|relative), `relation`, `preferred_date date`, `preferred_time time`, `area text`, `appointment_at timestamptz`, `status booking_status not null default 'booked'`, `referral_source text`, `chief_complaint text`, `note text`, `consent_pdpa bool not null default false`, `payload jsonb not null default '{}'`, `converted_patient_id uuid FK→patients`, `converted bool not null default false`, `created_by uuid FK→profiles` (null = public). Index `(status)`, `(appointment_at)`, GIN `(payload)`.

### `patients` — master + intake (ใบประวัติการรักษา)
`hn text` (Hospital Number, **digits only** e.g. 69010000; unique when present; created by Admin), `full_name`*, `dob date`, `age_years int`, `national_id text` (PDPA; normalized 13-digit on write), `nationality`, `race`, `marital_status`, `gender gender`, `phone`, `address text` (**visible to assigned employee**), `home_lat double precision`, `home_lng double precision` (geofence center), `underlying_disease text` (U/D), `drug_allergy text`, `diagnosis_category diagnosis_category`, `training_program text` (โปรแกรมฝึก, shown to employee), `status patient_status not null default 'active'`, `referral_source`, `consent_pdpa bool not null default false`, `consent_at timestamptz`, `intake_payload jsonb not null default '{}'` (full intake form), `created_by uuid FK→profiles`, `deleted_at`. Unique `(hn) where not null`; index `(status)`, `(diagnosis_category)`, GIN `(intake_payload)`. No employee FK here — access via `patient_assignments`.

### `registration_links` — opaque relative-intake links (server-resolved)
`token text primary key` (random 128-bit UUID hex, **NOT the HN** → not enumerable), `hn text not null` (the HN this link registers), `created_by uuid FK→profiles` (Admin/Director), `created_at timestamptz not null default now()`, `used_at timestamptz`. Admin's **"สร้าง HN + ส่งลิงก์"** inserts a row → relative opens `/register/<token>`; the page resolves token→HN via the **service-role** client (no anon grant) and `submitRegistration` upserts the patient by HN then stamps `used_at`. Links **expire 14 days** after `created_at` (enforced in the action **and** the page); within the window the relative may re-open the link to correct data. RLS: staff-only (`reglink_staff_all using is_staff()`); anon is never granted. Migration `0006_registration_links.sql`.

### `patient_assignments` — RLS backbone (THE single visibility mechanism)
`patient_id uuid FK→patients`*, `employee_id uuid FK→profiles`*, `is_active bool not null default true`, `assigned_by uuid FK→profiles`. Unique `(patient_id, employee_id)`; index `(employee_id) where is_active`. Admin creates/maintains these alongside scheduling (a row is upserted when Admin first assigns the employee to a patient on the calendar).

### `diagnoses` — disease dictionary → stat category
`name_th text`* (unique), `name_en text` (full names, e.g. "Amyotrophic Lateral Sclerosis (ALS)", "Multiple Sclerosis (MS)"), `category diagnosis_category not null default 'other'`, `is_active bool`. Index `(category)`. (Match-by-category, not a FK from `patients`.)

### `courses` — purchased package
`patient_id uuid FK→patients`*, `course_type course_type`*, `base_sessions int`* (10 or 30), `bonus_sessions int not null default 0` (1 for pkg_10_plus_1 else 0), `total_sessions int generated always as (base_sessions + bonus_sessions) stored`, `price numeric(12,2)`, `status course_status not null default 'on_process'`, `outcome course_outcome`, `started_on date`, `completed_on date`, `created_by`. Index `(patient_id)`, `(status)`. `used`/`remaining` derived (see §5).

### `work_hour_slots` — per-employee windows
`employee_id uuid FK→profiles`*, `slot_start time`*, `slot_end time`*, `weekday smallint (0–6, null=any)`, `is_active bool`. Index `(employee_id, weekday)`; check `slot_end > slot_start`.

### `schedule_sessions` — MONTHLY assignment queue (owns attendance status)
`patient_id`*, `course_id FK→courses`, `employee_id`*, `slot_id FK→work_hour_slots`, `scheduled_date date`*, `scheduled_start timestamptz`* `= (scheduled_date + slot.slot_start) AT TIME ZONE 'Asia/Bangkok'`, `scheduled_end timestamptz`, `status session_status not null default 'scheduled'`, `counts_as_training bool not null default true` (false when skipped/no_checkin/cancelled), `is_special_case bool not null default false`, `special_amount numeric(12,2)` (extra pay; required iff is_special_case), `special_note`, `coverage_status coverage_status not null default 'not_required'`, `substituted_from FK→profiles` (original employee when reassigned for standalone shift-swap), `substitution_reason text`, `assigned_by`, `note`. Index `(employee_id, scheduled_date)`, `(patient_id, scheduled_date)`, `(course_id)`, `(status)`, `(coverage_status) where coverage_status='needs_substitute'`. Drives employee day/week/month views, team calendar, relatives calendar, Live Monitor.

### `check_ins` — GPS/selfie evidence (offline-syncable, idempotent)
| Column | Type | Notes |
|---|---|---|
| `id` uuid PK | | **client-generated** (idempotent sync; no default) |
| `session_id` FK→schedule_sessions* · `employee_id` FK→profiles* | | |
| `kind` checkin_kind not null default 'check_in' | | |
| `client_event_at` timestamptz not null | | device clock (authoritative event time) |
| `server_received_at` timestamptz not null default now() | | |
| `lat`/`lng` double precision not null · `distance_m` · `within_geofence` bool | | |
| `is_late` bool not null default false | | check_in: client_event_at > scheduled_start + late_threshold |
| `is_early` bool not null default false | | check_out: client_event_at < scheduled_end − early_threshold (left early) |
| `selfie_url` text | | required iff settings.selfie_enforced |
| `device_id` text · `corrected` bool not null default false | | |

Unique `(session_id, kind)`; index `(employee_id, client_event_at)`. **No `status`/`checked_in_at` columns** — attendance status lives on `schedule_sessions`; this table is evidence.

### `reports` — the clinical forms (jsonb payloads); single lifecycle column
| Column | Type | Notes |
|---|---|---|
| `report_type` report_type* · `patient_id` FK* · `course_id` FK · `session_id` FK | | |
| `author_id` FK→profiles* · `check_in_id` FK→check_ins | | gates assessment+daily |
| `status` report_status not null default 'draft' | | RLS reads THIS; `completed` = "จบเคส" + vanish |
| `report_date` date not null default current_date | | |
| `payload` jsonb not null default '{}' | | full form body |
| `attachments` jsonb not null default '[]' | | Storage paths (e.g. daily Image) |
| `fois_level` fois_level | | denormalized for stats (assessment baseline / monthly / summary) |
| `completed_at` timestamptz · `discarded_at` timestamptz | | |

CHECK: `report_type in ('assessment_swallow','assessment_hand','followup') ⇒ check_in_id is not null` (deferrable, to allow dependency-ordered offline sync). Trigger on `status='completed'`: set `completed_at=now()` and prevent employee from reverting to draft. Index `(patient_id, report_type)`, `(author_id, status)`, `(session_id)`, GIN `(payload)`. Payload shapes per type are specified in docs/DOMAIN-SPEC.md (Summary has **no source schema** — KPI trigger only).

### `kpi_evaluations` — patient + employee measurements
`target kpi_target`*, `patient_id FK`, `employee_id FK`, `report_id FK→reports`, `evaluated_by FK→profiles`*, `fois_level fois_level`, `barthel_index int (0–100)`, `function_checklist jsonb default '{}'` (`sit_to_stand/stand/walk/eat/tube_removal`), `progress_kind text` (`daily`|`monthly` for patient KPI sub-headings), `employee_kpi_kind employee_kpi_kind`, `template_id FK→kpi_templates`, `answers jsonb not null default '{}'`, `score numeric(6,2)`, `evaluated_on date default current_date`, `period_year int` (Gregorian; พ.ศ. derived; dashboards group by Bangkok-local period). CHECK `target<>'patient' or patient_id is not null`; `target<>'employee' or (employee_id is not null and employee_kpi_kind is not null)`. Index `(patient_id)`, `(employee_id, employee_kpi_kind, period_year)`, GIN `(answers)`.

### `kpi_templates` — year-versioned employee question bank (created BEFORE kpi_evaluations in migration order)
`kind employee_kpi_kind`*, `title text`*, `period_year int`*, `questions jsonb not null default '[]'` (`[{id,question,answer_type,options,max_score}]` — free-text question + answer slots), `is_active bool`, `created_by`. Unique `(kind, period_year, title)`; index `(kind, period_year)`.

### `leave_requests` — **REMOVED (v3)**
Leave is deferred to a later unified HR module (client review v3, flow/3.pdf p.7) and **this table does not exist** in the current schema. Substitution / shift-swap (จัดเวรแทน/สลับเวร) is kept standalone via `schedule_sessions.coverage_status`/`substituted_from`/`substitution_reason` — not leave-driven.

### `correction_requests` — check-in/time correction (Director approves → Admin applies)
`employee_id FK`*, `check_in_id FK→check_ins`, `session_id FK→schedule_sessions`*, `requested_changes jsonb not null default '{}'`, `before_snapshot jsonb`, `reason text`*, `status request_status not null default 'pending'`, `approved_by FK→profiles` (director), `approved_at`, `applied_by FK→profiles` (admin), `applied_at`, `decision_note`. Path: `pending → approved → applied` (or `rejected`/`cancelled`). Index `(employee_id, status)`, `(status)`, `(check_in_id)`.

### Special cases (เคสพิเศษ) — NOT a separate table
A special case = a `schedule_sessions` row with `is_special_case=true` + a manual `special_amount` (extra pay). Set by **editing an existing session** (tick เคสพิเศษ + amount) or **creating a new session** ticked special — not limited to holidays. Employees see their own special-case sessions via the normal `schedule_sessions` self-select policy; pay reporting reads `special_amount`.

### `relatives` & `relative_access` — relatives portal (NOT auth users in v1)
`relatives`: `patient_id FK`*, `full_name`, `relation`, `phone`, `email`, `line_user_id`, `is_active bool`.
`relative_access`: `relative_id FK→relatives`*, `patient_id FK→patients`* (denorm for server-side filtering), `access_token text unique`*, `consent_relative_portal bool not null default false`, `expires_at timestamptz`, `revoked bool not null default false`. Index `(access_token)`, `(patient_id)`. **No `auth_user_id`** — access is by token, resolved server-side with the service-role key (see RLS note below).

### `notifications`
`type notification_type`*, `audience notification_audience`*, `recipient_profile_id FK→profiles`, `recipient_relative_id FK→relatives`, `channel notification_channel not null default 'in_app'`, `title`*, `body`, `data jsonb not null default '{}'`, `scheduled_for timestamptz`, `sent_at`, `read_at`, `dedupe_key text` (unique when not null). Index `(scheduled_for) where sent_at is null`, `(recipient_profile_id, read_at)`. Web Push (`channel='push'`) goes only to authenticated staff/employee that have a `push_subscriptions` row; **relatives never receive push** (unauthenticated → in_app/email/LINE only).

### `push_subscriptions` — Web Push endpoints (VAPID; staff/employee only)
`profile_id FK→profiles`*, `endpoint text`* unique, `p256dh text`*, `auth text`*, `user_agent text`, `last_used_at timestamptz`, `is_active bool not null default true`. Index `(profile_id)`. Read by the `push-sender` Edge Function for leave/substitute/correction events; subscriptions pruned on HTTP 410 Gone.

### `audit_logs` — append-only, Director-only read (single canonical shape)
`id bigint generated always as identity PK`, `occurred_at timestamptz not null default now()`, `actor_id uuid`, `actor_role user_role`, `action audit_action not null`, `entity text` (table/logical name), `entity_id text` (polymorphic), `before jsonb`, `after jsonb`, `changed_cols text[]`, `ip inet`, `user_agent text`, `request_id text`, `context jsonb`. Index `(entity, entity_id)`, `(actor_id, occurred_at desc)`, `(action, occurred_at desc)`. Partition by month on `occurred_at` for retention. RLS: SELECT **Director only**; no insert/update/delete policy (written only by a `SECURITY DEFINER` trigger/RPC owned by a `bypassrls` role).

### `settings` — singleton (id=1)
`id smallint PK check(id=1) default 1`, `company_name text not null default 'Better Brain - Swallow Rehab'`, `logo_url text`, `selfie_enforced bool not null default true`, `late_threshold_minutes int not null default 15`, `early_threshold_minutes int not null default 15`, `geofence_radius_m int not null default 1000`, `session_9_alert_enabled bool not null default true`, `reminder_lead_days int not null default 1`, `extra jsonb not null default '{}'`.

---

## 3. Relationships (cardinalities)
```
auth.users 1─1 profiles
profiles(employee) 1─* patient_assignments *─1 patients      (M:N access grid — THE visibility backbone)
profiles(employee) 1─* work_hour_slots ; 1─* schedule_sessions
bookings *─0..1 patients (converted)
patients 1─* courses (sequential; only one on_process) ; 1─* schedule_sessions ; 1─* reports ; 1─* kpi_evaluations ; 1─* relatives
diagnoses ──(category match, no FK)── patients
courses 1─0..* schedule_sessions (0..1 per session) ; 1─0..* reports
schedule_sessions 1─0..2 check_ins (≤1 check_in + ≤1 check_out) ; 1─0..1 daily/assessment report ; substituted_from → profiles when reassigned for standalone shift-swap
check_ins 1─0..1 reports.check_in_id ; 1─0..* correction_requests
reports(summary) 1─0..1 kpi_evaluations ; kpi_templates 1─* kpi_evaluations(employee)
profiles 1─* push_subscriptions (staff/employee Web Push)
correction_requests *─1 director(approved_by) *─1 admin(applied_by)
relatives 1─* relative_access (scoped to one patient)
profiles/relatives 1─* notifications
everything ─* audit_logs (polymorphic entity/entity_id)
settings = singleton
```

---

## 4. DDL sketch (representative — full set follows these patterns)
```sql
-- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'employee',
  full_name text not null, nickname text,
  employee_code text, department text, position text,
  employment_type employment_type,
  license_no text, phone text, email text, photo_path text, bio text,
  is_active boolean not null default true, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index uq_profiles_empcode on profiles(employee_code) where employee_code is not null;

-- director cap = 2 (single mechanism; no broken unique index)
create or replace function enforce_director_cap() returns trigger language plpgsql as $$
begin
  if (select count(*) from profiles where role='director') > 2 then
    raise exception 'DIRECTOR_CAP_EXCEEDED: maximum 2 director accounts';
  end if; return null;
end $$;
create constraint trigger trg_director_cap after insert or update of role on profiles
  deferrable initially deferred for each row when (new.role='director')
  execute function enforce_director_cap();

-- schedule_sessions (attendance status)
create table schedule_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  employee_id uuid not null references profiles(id),
  slot_id uuid references work_hour_slots(id),
  scheduled_date date not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  status session_status not null default 'scheduled',
  counts_as_training boolean not null default true,
  is_special_case boolean not null default false,
  assigned_by uuid references profiles(id), note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- check_ins (client UUID id; evidence only)
create table check_ins (
  id uuid primary key,
  session_id uuid not null references schedule_sessions(id) on delete cascade,
  employee_id uuid not null references profiles(id),
  kind checkin_kind not null default 'check_in',
  client_event_at timestamptz not null,
  server_received_at timestamptz not null default now(),
  lat double precision not null, lng double precision not null,
  distance_m double precision, within_geofence boolean,
  is_late boolean not null default false, is_early boolean not null default false,
  selfie_url text, device_id text, corrected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, kind)
);

-- reports (single lifecycle column; deferrable check-in CHECK)
create table reports (
  id uuid primary key default gen_random_uuid(),
  report_type report_type not null,
  patient_id uuid not null references patients(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  session_id uuid references schedule_sessions(id) on delete set null,
  author_id uuid not null references profiles(id),
  check_in_id uuid references check_ins(id),
  status report_status not null default 'draft',
  report_date date not null default current_date,
  payload jsonb not null default '{}', attachments jsonb not null default '[]',
  fois_level fois_level, completed_at timestamptz, discarded_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint chk_report_checkin check (
    report_type not in ('assessment_swallow','assessment_hand','followup') or check_in_id is not null
  ) deferrable initially deferred
);
```
`kpi_templates` is created before `kpi_evaluations`. Remaining tables (`bookings`, `patients`, `registration_links`, `patient_assignments`, `diagnoses`, `courses`, `work_hour_slots`, `kpi_evaluations`, `correction_requests`, `relatives`, `relative_access`, `notifications`, `push_subscriptions`, `audit_logs`, `settings`) follow the §2 specs with the same id/created_at/updated_at scaffolding. (`leave_requests` removed in v3 — see §2.)

---

## 5. Derived values (single source of truth)

**Course used / remaining (count on `schedule_sessions.status`, not on `check_ins`):**
```sql
create or replace view course_progress as
select c.id as course_id, c.base_sessions, c.bonus_sessions, c.total_sessions,
  count(*) filter (where s.counts_as_training and s.status in ('attended','late','completed')) as used_sessions,
  greatest(c.total_sessions
    - count(*) filter (where s.counts_as_training and s.status in ('attended','late','completed')), 0) as remaining_sessions
from courses c
left join schedule_sessions s on s.course_id = c.id
group by c.id, c.base_sessions, c.bonus_sessions, c.total_sessions;
```
Counting on session status (the field corrections update) avoids the desync of joining `check_ins`. **Alerts:** fire `session_alert_9` when `used_sessions = base_sessions - 1` (=9 for a 10+1 pack — "one before the paid course ends," independent of bonus); fire `course_remaining_0` when `remaining_sessions = 0` → show "ครบคอร์ส" + Continue/No service (writes `courses.outcome`). Bonus is consumed last automatically.

**Attendance derivation (server/edge, `Asia/Bangkok`):** on check-in insert compute `distance_m` (Haversine vs patient home), `within_geofence = distance_m <= settings.geofence_radius_m`; `is_late = client_event_at > scheduled_start + late_threshold` → session `status='late'` else `'attended'`. On check-out: `is_early = client_event_at < scheduled_end - early_threshold` (left-early flag). Nightly Bangkok-midnight sweep: past `scheduled_end` with no check-in → `status='no_checkin'`, `counts_as_training=false`. Patient last-minute cancel → `status='skipped'`, `counts_as_training=false`.

**Auto work-hours:** per session, overlap of (`work_hour_slots` window or `scheduled_start..scheduled_end`) with actual `check_in→check_out`, counted only when `status in ('attended','late','completed')` (excludes no_checkin/skipped/cancelled); fall back to `scheduled_end` if no check-out. Special-case pay is independent (manual `schedule_sessions.special_amount` where `is_special_case`).

**Stats:** `reports.fois_level` + `kpi_evaluations.fois_level` denormalized; "which disease used most" = group `patients.diagnosis_category`.

---

## 6. RLS / PDPA (load-bearing)

Every table: `enable row level security` + `force row level security`. Per-command policies (never blanket `for all`). Every insert/update/delete ANDs `is_enabled()`. Deny-by-default.

**Role helpers (SECURITY DEFINER, owned by a `bypassrls` role so `force` doesn't block them):**
```sql
create or replace function auth_role() returns user_role
language sql stable security definer set search_path=public as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'app_role','')::user_role,
    (select role from profiles where id = auth.uid()));
$$;
create or replace function is_director() returns boolean language sql stable security definer as $$ select auth_role()='director' $$;
create or replace function is_admin()    returns boolean language sql stable security definer as $$ select auth_role()='admin' $$;
create or replace function is_staff()    returns boolean language sql stable security definer as $$ select auth_role() in ('admin','director') $$;
create or replace function is_enabled() returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce((select is_active from profiles where id = auth.uid()), false) $$;
-- single visibility mechanism: patient_assignments
create or replace function can_access_patient(p_patient uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists (select 1 from patient_assignments
                 where patient_id=p_patient and employee_id=auth.uid() and is_active) $$;
```
A Custom Access Token Hook mirrors `profiles.role` into the `app_role` JWT claim; on role change / deactivation, force-revoke sessions (`auth.admin.signOut(userId,'global')`) so claims re-mint, and `is_enabled()` (live) backstops stale tokens.

**Key policies:**
- **profiles:** select self OR `is_staff()`; insert/delete `is_staff()`; update `is_staff()` for any row, self may update only phone/photo (trigger rejects role/license self-edit).
- **patients:** `select using (is_staff() or can_access_patient(id))`; insert/update/delete `is_staff()` only (delete = Director; Admin soft-archives). **Employees see assigned patients including `address` and `training_program`** (NOT masked). A `patient_card` security-barrier view masks **only `national_id`** for non-staff (fail-closed: any value not matching the normalized 13-digit pattern is fully masked, never passed raw):
```sql
create or replace view patient_card with (security_barrier=true) as
select p.id, p.hn, p.full_name, p.age_years, p.gender, p.phone,
       p.address, p.training_program, p.diagnosis_category, p.status,
       case when is_staff() then p.national_id
            when p.national_id ~ '^[0-9]{13}$'
              then '*-****-****-'||right(p.national_id,2) else null end as national_id
from patients p;
```
- **bookings:** `is_staff()` for all CRUD; public insert ONLY via `SECURITY DEFINER submit_public_booking(payload)` (rate-limited, honeypot, requires consent; sets status from config, column default `booked` is fallback). `anon` gets execute on that function only.
- **reports (vanish-on-save):** `select using (is_staff() or (author_id=auth.uid() and status='draft'))` → completed/corrected rows leave the employee result set automatically. insert: employee, `author_id=auth.uid()`, `can_access_patient(patient_id)`, and for assessment/daily an `exists` check-in for the session. update (employee): `using (author_id=auth.uid() and status='draft')` — saving sets `status='completed'`, after which no employee update matches; a trigger forbids `completed→draft`. update (staff): on completed/corrected rows (audited). delete: Director only.
- **schedule_sessions:** select `is_staff() or employee_id=auth.uid()`; insert/update/delete `is_staff()`.
- **check_ins:** select `is_staff() or employee_id=auth.uid()`; insert `employee_id=auth.uid()`; **update**: `is_director()` anytime, OR `is_admin()` only when `exists(correction_requests cc where cc.check_in_id=check_ins.id and cc.status='approved')`; employees never update. delete Director only. Offline dedupe is done by the `SECURITY DEFINER` check-in RPC (`INSERT … ON CONFLICT (id) DO NOTHING`), not a client upsert.
- **correction_requests:** select requester + `is_staff()`; insert employee (own). Transitions guarded by triggers — `pending→approved|rejected` **director** only; `approved→applied` **admin** (or director) only — **Director approves → Admin applies** (the apply path writes `check_ins.client_event_at`/`corrected`, sets `applied`, audits). `pending→cancelled` requester.
- **registration_links:** `reglink_staff_all` — `is_staff()` for all CRUD; `anon` never granted. The public `/register/[token]` page resolves the token via the **service-role** client server-side (token is a random UUID, not the HN, and expires after 14 days).
- **push_subscriptions:** select/insert/update/delete `profile_id=auth.uid()` (own device subscriptions only); the `push-sender` reads via service-role. (Special cases need no own policy — they are `schedule_sessions` rows governed by that table's policy.)
- **kpi_templates:** `is_staff()` for select + write — **employees do NOT read this table** (the answer key would leak); they receive questions via the `SECURITY DEFINER kpi_questions_for_employee` RPC that strips the `answer` field, and scoring happens server-side.
- **kpi_evaluations:** select `is_staff()`; employee select own pre-completion + insert for assigned patients; employee_kpi own.
- **settings:** select all authenticated (public subset needed by PWA); update Director full, Admin subset (trigger enforces columns).
- **audit_logs:** SELECT **Director only**; writes only via definer trigger/RPC (no role insert policy; revoke update/delete from all). **Admin cannot read the audit log** (separation of duties — Admin is the most-audited actor for check-in edits). This is the canonical rule (overrides any earlier "Admin scoped" phrasing).
- **relatives / relative_access:** no `auth.uid()`-based relative policies. Relative portal data is read **server-side with the service-role key**, filtered by the resolved `relative_access.patient_id` (token → patient), returning only: assigned therapist public profile, that patient's `schedule_sessions`, `completed` reports (curated subset), and course progress. No Realtime for relatives.

**PDPA controls:** consent captured at booking + intake (versioned), withdrawal = new record (never destructive); read-logging at the app boundary for PHI detail/exports (Postgres selects aren't auto-logged); exports audit-logged with row count + filters; retention via `archived_at` + anonymization sweep (hash national_id, null phone/address, keep de-identified diagnosis_category for stats); audit retained ≥ data retention, partitioned. Service-role key server-side only.

Source files: `F:\tmp\docx_extract.txt` (form fields), `F:\SaaS\TPM\flow\*` (employee fields รหัส/แผนก/ตำแหน่ง/รายเดือน-พาร์ทไทม์, address-visible-to-employee, left-early, FOIS-on-monthly, full ALS/MS names).
