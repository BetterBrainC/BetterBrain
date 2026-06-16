# CLAUDE.md — TPM (Better Brain · Swallow Rehab)

> Authoritative entry point for this repository. Read this first. Exhaustive detail lives in `/docs` (linked below). When `/docs` and this file disagree, **this file wins for rules/conventions; `/docs` wins for detailed specs** — keep them in sync.

---

## 1. Project Overview

**TPM** is a Thai-language back-office + employee PWA for the in-home therapy clinic **"Better Brain - Swallow Rehab"**, providing at-home physical/occupational therapy focused on **swallowing rehabilitation** and neuro conditions (stroke, Parkinson, dementia/Alzheimer, ALS, MS).

The system manages the full lifecycle: **public booking → in-person assessment → course purchase → monthly schedule assignment → GPS check-in at the patient's home → clinical reports → KPI/outcome measurement → course completion**, with a relatives portal, employee KPI, dashboards, and Excel/CSV export.

- **UI language:** Thai (primary). All dates display in **Buddhist era (พ.ศ. = year + 543; e.g. 2569 = 2026)**. Storage is always UTC `timestamptz`; พ.ศ. is presentation-only.
- **Operating timezone:** `Asia/Bangkok` for every business-time calculation (late/early/no-checkin/day-boundary crons, dashboards, exports).

## 2. Brand & UI Direction

- **Reference feel:** the **OOCA app** — clean, light, high whitespace, `rounded-2xl` tinted cards, ONE confident blue pill CTA per surface, a **teal active accent on the bottom-nav item only**, illustration-led empty states (verified against `flow/1.jpg`, `flow/2.jpg`).
- **Brand:** the logo = navy head outline + sky-blue swallowing pathway + **a single orange epiglottis accent** + silver gradient wordmark (verified against `flow/S__362397734_0.jpg`).
- **Locked tokens:** `--primary #2F7FF6`, `--teal #14B8A6` (active nav), `--brand-navy #1B3A6B`, `--sky #4AA3E0`, `--accent #F5A623` (orange; "one per screen"), `--surface-tint #EAF2FF`, `--bg #F7FAFC`, neutrals `#1F2A37 / #6B7280`.
- **Typography:** **Google Prompt** (Thai-aware geometric sans; used for body + display), self-hosted at build via `next/font` (matches the original build). Never letter-space Thai runs. Full spec in **docs/DESIGN-SYSTEM.md**.

## 3. Tech Stack (LOCKED — do not substitute)

- **Next.js 15** (App Router, RSC + Server Actions) + **TypeScript**, on **Vercel**.
- **Supabase**: Postgres, Auth, **RLS**, Storage, Realtime, Edge Functions + cron.
- **Employee app = mobile-first installable PWA**: offline check-in via **IndexedDB (Dexie) + background sync (Serwist)**, browser **Geolocation** + **camera (selfie)**; works offline and syncs on reconnect.
- **Booking intake = native public form** (no Google Sheet). HR can also create bookings/appointments manually (required fallback).
- Libraries: FullCalendar (scheduling), Recharts (dashboards), SheetJS/xlsx (export), React Hook Form + Zod, TanStack Query.

## 4. Repository / App Structure (high level)

```
app/
  (public)/    public booking + PDPA consent (unauthenticated)
  (auth)/      login / forgot / reset
  (app)/       EMPLOYEE PWA (mobile-first; registers the service worker)
  (staff)/     HR + OWNER shared shell (desktop sidebar); shared Live Monitor lives here
  (relatives)/ tokenized relatives portal (server-rendered; no auth user)
actions/   Server Actions (per domain; auth+Zod+authorize+audit+revalidate)
features/  domain logic (geo/haversine, course progress, statuses) — testable, shared
components/ ui / forms / shell / calendar / charts / offline
lib/       supabase (server|client|admin), date (buddhist/tz), i18n, db (dexie), sync, export
supabase/  migrations/ (schema + RLS) and functions/ (edge functions + cron)
```
Full layout + route map in **docs/ARCHITECTURE.md**.

## 5. Roles & Approval Chain (EXACTLY 3 roles)

`user_role = ('employee','admin','director')` — single enum, used in DB, JWT claim, and audit. (Renamed per client review v3: owner→**director**, hr→**admin**.)

- **employee (พนักงาน / OT):** sees own profile + **only assigned service recipients (ผู้รับบริการ)** (incl. their **name, address, and training program** — address is NOT masked; the employee drives to the home). Check-in/out; writes reports; records ผู้รับบริการ KPI; completes own stress + knowledge assessments; requests check-in corrections. Profiles exist only for case-handling employees.
- **admin (Admin):** full CRUD on master data; assigns cases via the **monthly calendar**; manages courses + slots; creates bookings/appointments; arranges **จัดเวรแทน/สลับเวร**; sees ALL reports; exports. **Cannot edit check-in data until the director approves the correction**, then admin applies + confirms it.
- **director (Director; superadmin; EXACTLY 2 accounts, hard-capped):** approves corrections; full control; shared dashboard; settings; audit log; the **only role that views การวัดผล/KPI**; sees everything.

> **Only these 3 roles exist** (`director` / `admin` / `employee`) — no owner / CEO / Supervisor / HR labels. UI labels: **Director / Admin / พนักงาน**.

**Approval chain (audit-logged):** `employee submits correction → DIRECTOR approves/rejects → admin applies + confirms`. **Leave system is removed** for now (deferred to a later unified HR module). **Substitution / shift-swap (จัดเวรแทน/สลับเวร) is standalone** (not leave-driven): admin reassigns a session to a conflict-free employee (`coverage_status` + `substituted_from`). State machines in **docs/DOMAIN-SPEC.md**.

## 6. Core Business Flow

1. Customer books via the native form, or **Admin creates an HN + sends a Thai registration link** (an **opaque random token**, not the HN → not enumerable; stored in `registration_links`, expires 14 days) to the relative to fill the intake (employee tops up missing fields at the first assessment) → `bookings`/`patients` (`booked` ทำนัดแล้ว / `awaiting_payment` รอชำระเงิน / `cancelled` ยกเลิกนัด).
2. Appointment to meet → record an **Assessment** (Swallowing OR Hand Function) — **requires check-in** for employees.
3. Customer confirms a course → Admin assigns the month via the calendar (ผู้รับบริการ → employee → date/time per session).
4. Employee attends per queue → **check-in (GPS within 1 km, realtime clock, optional selfie)** → treat → **press "เช็คเอาท์" → the Follow up (daily) report opens immediately** → save → KPI → **"จบเคส"**.

## 7. Key Domain Rules (must hold in UI **and** DB)

- **Reports = 3 types** (client v3): **Assessment** (Swallowing/Hand) · **Follow up** (บันทึกรายวัน) · **Summary report** (ความก้าวหน้ารายเดือน). **Check-in gating:** Assessment + Follow up **require a check-in**; Summary anytime. Enforced in Server Action + DB CHECK.
- **Check-out → Follow up:** check-out is a **manual button**; pressing it records `check_out_time` and **immediately opens the Follow up (daily) report**. Work hours = `check_out − check_in` (`Asia/Bangkok`).
- **Report visibility flip ("จบเคส"):** when `reports.status` → `completed`, the row **disappears from the employee view** (RLS predicate `status='draft' AND author_id=auth.uid()`), visible only to admin + director. RLS-enforced, not UI-only.
- **Attendance labels** (on `schedule_sessions.status`): `late` → **"สาย"**; missing → **"ไม่ได้เช็คอิน"** (excluded from work hours); patient last-minute cancel → **"งด"** (not counted, no session consumed); early check-out → **"ออกก่อนเวลา"** (surfaced on the shared Live Monitor).
- **Course lifecycle:** **10 (+1 free bonus)** or **30** sessions; `used` counted from valid check-ins; `งด`/`ไม่ได้เช็คอิน` never consume a session. Alert at **session 9** (`used = base_sessions - 1`) and at **0 remaining** → **"ครบคอร์ส"** → Continue or No service (→ post-treatment Score). **Employees see course progress as a bar only (no numbers)** + a **"เหลือ 1 ครั้งจบคอร์ส"** warning on the last step.
- **Access auto-revoke:** when a course completes, **employee + relative access ends as soon as the Summary (monthly) report is saved**.
- **Statuses on overview list AND ผู้รับบริการ detail:** ผู้รับบริการ `active`/`hold`/`no_service`; course `on_process`/`hold`/`no_service`.
- **การวัดผล / KPI (Director-only view):** ผู้รับบริการ = **FOIS** (7 levels, client wording) + **Barthel** (0–100) + **Function** (ลุกนั่ง/ยืน/เดิน/กินได้/ถอดสายได้) + **FIM + MFS** (criteria pending from client). Employee = stress + yearly knowledge test. "สรุปประเมิน" is merged into การวัดผล.
- **Special cases (เคสพิเศษ):** any session flagged for **extra pay** (manually typed amount) — set by **editing an existing session and ticking "เคสพิเศษ"**, or by **creating a new session ticked as special**. Not limited to holidays. Stored as `is_special_case` + `special_amount` on `schedule_sessions`.
- **Diagnosis stats:** Stroke, Parkinson, Dementia/Alzheimer, ALS, MS, Other (store full English names).
- **Work-hour slots** bound per employee; hours auto-calculate from slots + check-in/out (`Asia/Bangkok`).
- **Settings:** company name, logo, selfie toggle, late-threshold (+ early-threshold, geofence radius).
- **Relatives portal access:** verify with the **last 4 digits of the ผู้รับบริการ's phone** before viewing; portal adds a **"วิธีออกกำลังกาย"** section and selectable report visibility.
- **Audit EVERYTHING** (append-only, director-only read): login, check-in/out, edits, approvals, password changes, exports — who/what/when + before/after.

## 8. Data Model Overview

Core tables: `profiles` (role director/admin/employee), `bookings`, `patients` (ผู้รับบริการ), `registration_links` (opaque relative-intake tokens; staff-only RLS; 14-day expiry), `patient_assignments` (RLS backbone), `diagnoses`, `courses`, `work_hour_slots`, `schedule_sessions` (monthly queue; owns attendance status + `is_special_case`/`special_amount` + standalone substitution `coverage_status`/`substituted_from`/`substitution_reason`), `check_ins` (GPS/selfie evidence; client-UUID PK for idempotent sync), `reports` (clinical forms as `jsonb`; `report_type` = assessment_swallow/assessment_hand/**followup**/**summary**), `kpi_evaluations`, `kpi_templates` (year-versioned employee question bank), `correction_requests`, `relatives` + `relative_access`, `notifications`, `push_subscriptions` (Web Push/VAPID), `audit_logs`, `settings`. **No `leave_requests`** (leave deferred to a later HR module). Full DDL, enums, relationships, RLS in **docs/DATA-MODEL.md**.

## 9. Security / RLS / PDPA (summary)

- Patient health data is **sensitive under Thai PDPA** → explicit consent (booking + intake), least-privilege RLS on every table (`enable` + `force`), access logging, encryption at rest.
- **Secrets in env only.** `SUPABASE_SERVICE_ROLE_KEY` server-side only; never `NEXT_PUBLIC_*`. Client uses the publishable/anon key + RLS.
- **Owner cap (max 2)** enforced by trigger. Deactivated users blocked on every write via `is_enabled()` (live DB check) + forced sign-out.
- **Relatives are not auth users** in v1: portal is server-rendered with the service-role key filtered by token→patient mapping (no relative RLS via `auth.uid()`, no Realtime for relatives).

## 10. Coding Conventions

- **Immutability**; **many small files** (≤800 lines); organize by feature.
- **Zod validation at boundaries**; one schema per form, shared by client (RHF) + Server Action.
- **Explicit error handling**; user-friendly Thai messages; never swallow errors.
- **Server Actions** authenticate like API routes: `getUser()` → Zod → authorize → re-check `is_enabled()` → write → audit → revalidate.
- **Naming:** `camelCase`, `PascalCase` types/components, `UPPER_SNAKE_CASE` constants, `useX` hooks, boolean `is/has/should/can`.
- **CSS tokens only**; compositor-friendly animation; semantic HTML; honor `prefers-reduced-motion`.
- **A11y:** WCAG 2.2 AA; ≥48px touch targets; visible focus; never color-only status.
- **Tests:** unit + integration + E2E; **≥80% coverage gate in CI**. The 4 critical RLS negative tests ship with their feature phase.

## 11. Build / Test / Run (placeholders — fill once scaffolded)

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:coverage     # enforce >= 80%
supabase db push
supabase functions deploy <name>
```

## 12. Phase Roadmap (summary → docs/ROADMAP.md)

P0 Foundation/Auth/RLS/tokens/PWA · P1 Master data (+employment fields, intake, courses, slots, settings, consent) · P2 Native booking + Admin HN/registration-link · P3 Assessments + Score scaffold · P4 Monthly calendar + **จัดเวรแทน/สลับเวร** · P5 Check-in/out (manual check-out → Follow up) + OFFLINE (incl. left-early) · P6 Reports (Assessment/Follow up/Summary) + vanish-on-save RLS · P7 Course lifecycle + special-case pay flag + access-revoke · P8 Corrections + approval chain (Director→Admin) · P8.5 การวัดผล hub (FOIS/Barthel/Function/FIM/MFS, Director-only) + employee KPI · P9 Relatives portal (phone-verify + วิธีออกกำลังกาย) + reminders · P9.5 **Web Push (VAPID)** + in-app notification center · P10 Shared Live Monitor + stats + export · P11 Hardening. *(Leave system = later HR module; Synnis brand = separate project.)*

**Demo-first slice:** P0 → P1(min) → P2 → P4 → P5 **+ one thin Follow up save** to prove "จบเคส + vanish-on-save".

**v1 INCLUDES:** relatives portal + notifications, การวัดผล, dashboard + export. **v1 EXCLUDES:** realtime team chat; **leave system** (deferred); **Synnis** brand (separate project).

## 13. Client Decisions (locked 2026-06-14, review v3 = flow/3.pdf)

- **Roles = exactly `director` / `admin` / `employee`** (renamed from owner/hr). UI labels Director / Admin / พนักงาน. Chain: Director approves → Admin applies.
- **"ผู้ป่วย" → "ผู้รับบริการ"** everywhere.
- **Leave system removed** (later unified HR module). **Substitution / shift-swap (จัดเวรแทน/สลับเวร) kept standalone**, decoupled from leave.
- **Reports = 3:** Assessment · **Follow up** (รายวัน) · **Summary report** (รายเดือน). Check-out (manual) opens **Follow up** immediately.
- **การวัดผล = Director-only**, merges "สรุปประเมิน"; ผู้รับบริการ scales = FOIS + Barthel + Function + **FIM + MFS** (FIM/MFS criteria pending).
- **Course progress (employee) = bar only**, "เหลือ 1 ครั้งจบคอร์ส" warning. **Access auto-revokes** for employee + relative when the Summary report saves on a completed course.
- **Relatives portal:** verify via **phone last-4 digits**; add **วิธีออกกำลังกาย** + selectable report visibility.
- **Synnis** = **same system/codebase** as BetterBrain, differing only by **profession (staff group)** + **assessment/report form templates** + green theme. Model later as a **brand/profession config** (not a separate app); booking/ผู้รับบริการ flow identical.

Residual (pending client): **FIM / MFS** scoring criteria.

> Terminology: roles **Director / Admin / พนักงาน**; **ผู้รับบริการ** (not ผู้ป่วย); reports **Assessment / Follow up / Summary**; **"ไม่ได้เช็คอิน"** (not "ไม่มา"); **"จบเคส"** on save; **"สาย"** / **"งด"** / **"ครบคอร์ส"** / **"ออกก่อนเวลา"**.
