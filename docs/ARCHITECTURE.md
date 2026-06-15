# TPM — Application Architecture (Next.js 15 + Supabase)

Stack (locked): Next.js 15 (App Router, RSC + Server Actions, TS) on Vercel · Supabase (Postgres/Auth/RLS/Storage/Realtime/Edge Functions+cron) · mobile-first PWA (Serwist + Dexie) · Thai UI / พ.ศ. dates · `Asia/Bangkok` for all business-time math.

This document is consistent with docs/DATA-MODEL.md (table/column/enum names) and docs/DOMAIN-SPEC.md (flows/statuses). Where attendance status is referenced it lives on `schedule_sessions.status`; report visibility is driven by `reports.status`.

---

## 0. Design-system anchor (OOCA-derived)

Light canvas `#F7FAFC`, large `rounded-2xl` tinted cards (`--surface-tint #EAF2FF`), one dominant action-blue pill CTA (`#2F7FF6`), **teal active bottom-nav item only** (`#14B8A6`), illustration empty states. This yields two shells:

- **Employee PWA** — mobile-first, OOCA bottom-tab bar, big friendly cards, one primary action per screen.
- **Staff (Admin + Director) shell** — shared desktop sidebar (navy `#1B3A6B`, teal active item), data-dense but airy. Admin and Director share one shell because the company-wide **Live Monitor/dashboard is identical for Admin and Director** (ground-truth requirement); role differences are gated per-route, not per-shell.

Fonts: IBM Plex Sans Thai (body) + IBM Plex Sans Thai Looped (display) via `next/font/local`, subset thai+latin, `display:swap`, preload the 400/600 body weights only. Full tokens in docs/DESIGN-SYSTEM.md.

---

## 1. Folder / module layout (feature-domain organized)

Route **groups** isolate shells; the employee PWA group is the only one that registers the service worker.

```text
tpm/
├─ app/
│  ├─ layout.tsx                 # <html lang="th">, fonts, ThaiLocale + TZ provider, providers
│  ├─ globals.css                # imports tokens.css, typography.css
│  ├─ manifest.ts                # Web App Manifest (route handler)
│  ├─ ~offline/page.tsx          # SW offline fallback
│  │
│  ├─ (public)/                  # PUBLIC BOOKING (unauthenticated)
│  │  ├─ layout.tsx              # bare public shell (logo from settings)
│  │  ├─ booking/{page,success}.tsx + _components/BookingForm.tsx
│  │  └─ consent/page.tsx        # PDPA consent text + capture
│  │
│  ├─ (auth)/{login,forgot,reset}/page.tsx   # forgot → resetPasswordForEmail; reset → updateUser
│  │
│  ├─ (app)/                     # EMPLOYEE PWA (mobile-first)
│  │  ├─ layout.tsx              # OOCA bottom-tab shell; registers SW; SyncProvider
│  │  ├─ page.tsx                # หน้าหลัก: today's queue + pending-sync count + quick check-in
│  │  ├─ schedule/page.tsx       # schedule view (day/week/month filtering client-side)
│  │  ├─ check-in/page.tsx       # GPS+clock+selfie (offline-capable)
│  │  ├─ session/[id]/page.tsx   # session detail + start check-in CTA
│  │  ├─ session/[id]/report/[type]/page.tsx  # assessment (swallowing/hand) or followup (daily) or summary (monthly)
│  │  ├─ measurement/page.tsx    # การวัดผล hub: own patient KPI entry + own stress/knowledge assessments
│  │  ├─ corrections/page.tsx    # view own corrections (self-only)
│  │  ├─ notifications/page.tsx  # in-app notification center
│  │  └─ account/page.tsx
│  │
│  ├─ (staff)/                   # Admin + Director (shared desktop sidebar)
│  │  ├─ layout.tsx              # navy sidebar; nav items per source mockup (see §2)
│  │  ├─ live-monitor/page.tsx   # SHARED realtime dashboard (Admin + Director identical)
│  │  ├─ dashboard/page.tsx      # stats + diagnosis breakdown + course alerts
│  │  ├─ assign/page.tsx         # MONTHLY ASSIGNMENT GRID + จัดเวรแทน/สลับเวร (core)
│  │  ├─ patients/{page,new,[id],(intake|assessments|course)}.tsx
│  │  ├─ bookings/{page,[id]}.tsx     # CRUD + status; Admin manual entry path
│  │  ├─ employees/{page,new,[id]}.tsx  # employee_code/department/position/employment_type/license
│  │  ├─ reports/page.tsx             # ALL reports (read), filters
│  │  ├─ measurement/page.tsx         # การวัดผล hub (Director-only): patient KPI + employee stress/knowledge
│  │  ├─ approvals/page.tsx           # Director approves corrections; Admin applies
│  │  ├─ audit/page.tsx               # Director-only (route-guarded)
│  │  ├─ settings/page.tsx            # Director write; Admin read subset
│  │  ├─ notifications/page.tsx       # Admin + Director
│  │  └─ exports/page.tsx
│  │
│  └─ (relatives)/
│     └─ r/[token]/page.tsx          # server-rendered, service-role, phone-last-4 gate; progress + calendar + reports + วิธีออกกำลังกาย
│
├─ actions/    checkin · booking · report · assignment · correction ·
│              kpi · course · settings · audit · notification · relative
├─ features/   checkin/{geo.ts,status.ts,tz.ts} · booking · reports · assessment ·
│              assignment · course/{progress.ts,alerts.ts} · kpi/{fois.ts,barthel.ts,bank.ts} · audit
├─ components/ ui · forms · shell · calendar · charts · offline
├─ lib/        supabase/{server,client,middleware,admin} · date/{buddhist,tz,format} ·
│              i18n · db/dexie · sync/{queue,processor,conflict} · query · export
├─ app/sw.ts   Serwist service worker source
├─ middleware.ts  session refresh + role-group gate
└─ supabase/   migrations/ · functions/{relative-reminders,course-alerts,attendance-sweep,export-builder}
```

Rationale: routes are thin RSC pages; business rules live in `features/*` + `actions/*`, reused by both Server Actions and Edge Functions (Haversine, course progress).

---

## 2. Route map per role (selected — full tree above)

### Staff sidebar nav (from client review v3, flow/3.pdf)
Sidebar (Admin + Director): **พนักงาน · อนุมัติ · ปฏิทิน · รายงาน · การวัดผล · นัดหมาย · ประวัติ (Director-only) · ตั้งค่า (Director-only)**.
Live Monitor header (shared): **ภาพรวม (stats + diagnosis breakdown + Live Monitor realtime) · ปฏิทินทีม (all sessions, all employees) · การสั่งจ้าง (monthly assignment + จัดเวรแทน/สลับเวร + เคสพิเศษ)**.
Four Live-Monitor KPI tiles (exact): **เคสทั้งหมด (total cases) · เช็คอินแล้ว + % (checked-in) · กำลังทำ (in-progress) · รออยู่ในวงรอบ (waiting in cycle)**, plus realtime working / late / **left-early (ออกก่อนเวลา)** counts with an entry/exit graph.

### Public
`/booking` (native intake → `bookings` `booked`) · `/booking/success` · `/consent`.

### Employee PWA `(app)` — assigned-only, RLS-enforced
`/` home (today's queue + pending-sync + quick check-in CTA) · `/schedule` (day/week/month views, client-side filtering) · `/check-in` (GPS ≤1km + clock + selfie, offline-capable) · `/session/[id]` (shows assigned ผู้รับบริการ name + address + training program + course progress bar + status) · `/session/[id]/report/assessment/swallowing` (requires check-in) · `/session/[id]/report/assessment/hand` (requires check-in) · `/session/[id]/report/followup` (daily report, requires check-in, opens after check-out) · `/session/[id]/report/summary` (monthly summary, no check-in required) · `/measurement` (การวัดผล hub: own patient-KPI entry + own stress/knowledge assessments) · `/corrections` (view own submitted corrections) · `/notifications` (in-app notification center) · `/account` (profile).

### Admin `(staff)` — can see most routes
`/` (ภาพรวม: stats + diagnosis + Live Monitor) · `/bookings` (CRUD, manual entry) · `/assign` (monthly assignment grid + จัดเวรแทน/สลับเวร + เคสพิเศษ flag on sessions) · `/patients` (master list CRUD) · `/patients/[id]` (detail, intake, course, assessments) · `/employees` (list, edit employment fields) · `/reports` (read-only, all reports, filters) · `/measurement` (read-only: patient KPI rollups, employee stress/knowledge) · `/notifications` (in-app center) · `/exports` (export-builder, signed URLs).

### Director `(staff)` — exactly 2 accounts, superadmin
All Admin routes **plus** `/approvals` (approve/reject corrections; admin then applies) · `/audit` (audit log, Director-only) · `/settings` (Director write, Admin read subset).

### Relatives `(relatives)` — tokenized link, server-rendered, no auth user
`/r/[token]` — single server-rendered page, **phone last-4 verify gate** → course progress bar + count/bonus/remaining + ปฏิทินคิวฝึก (read-only) + training reports subset + **วิธีออกกำลังกาย**. No auth user; service-role filtered by token→patient.

---

## 3. RSC vs Client vs Server Actions

**Default: Server Components**, fetching with the Supabase **server** client (cookie auth → RLS applies). Service-role only in `lib/supabase/admin.ts`, used by Server Actions/Edge Functions/relatives rendering.

| Layer | Use for |
|---|---|
| **RSC (default)** | All list/detail pages, dashboard initial payloads, report read views. Parallel-fetch with `Promise.all`; per-request dedup via `React.cache()`. |
| **Client Components** | Interactive: monthly assignment grid, check-in (GPS/camera/clock), all RHF forms, charts, realtime subscriptions, offline sync UI, install prompt. `"use client"` at the leaf. |
| **Server Actions** | All mutations. Each: (1) `getUser()` server-side, (2) Zod-parse, (3) authorize by role, (4) **re-check `is_enabled()` live** (not from JWT claim), (5) write, (6) **audit-record**, (7) `revalidatePath`/`revalidateTag`. |
| **TanStack Query** | Online-interactive surfaces (calendar optimistic assignment, report filtering, Live Monitor). RSC seeds initial data → hydrated → background revalidate. |

**Realtime:** Live Monitor + dashboards subscribe to Postgres Changes on `schedule_sessions`, `check_ins`, `bookings`, `correction_requests`; channels are RLS-scoped (Admin and Director get the same company-wide view). Relatives get **no** Realtime (they are not auth users) — their portal revalidates on request.

**Forms:** React Hook Form + Zod, one schema per form in `features/*/schema.ts`, shared by client and Server Action. Long clinical forms (Swallowing/Hand/Intake) are **schema-driven jsonb**: a field manifest drives `<JsonbFormRenderer>` and a matching Zod schema; payload stored as `jsonb`, fields matching docs/DOMAIN-SPEC.md exactly.

---

## 4. PWA + OFFLINE check-in (detailed)

### 4.1 Service worker (Serwist `@serwist/next`)
Registered **only** in `(app)`. Precache shell + offline page. Runtime caching: shell/static/fonts `CacheFirst`; assigned-patient + today's queue `StaleWhileRevalidate`; selfies/report images not cached (queued); mutations never GET-cached (intercepted → Dexie). `manifest.ts`: name "TPM – Better Brain", `display:"standalone"`, theme `#2F7FF6`, maskable icons, portrait.

### 4.2 Dexie schema (IndexedDB)
```ts
db.version(1).stores({
  checkins: '++localId, sessionId, patientId, kind, syncState, createdAt, clientUuid',
  reports:  '++localId, sessionId, patientId, type, syncState, createdAt, clientUuid, linkedCheckinUuid',
  kpis:     '++localId, patientId, syncState, createdAt, clientUuid',
  cache:    'key, updatedAt'   // assigned patients + queue snapshot + selfie blobs
});
```
`QueuedCheckin` carries `clientUuid` (= server `check_ins.id` for idempotency), `kind ('check_in'|'check_out')`, `capturedAt` (device clock — the authoritative event time), `lat/lng/accuracy`, `distanceMeters`, `withinRadius`, `selfieBlobKey?`, `derivedStatus`, `syncState ('pending'|'syncing'|'synced'|'conflict'|'failed')`, `attempts`, `lastError?`.

### 4.3 Background sync + idempotency + conflict (resolves Critique-2 #10/#11)
- **Trigger:** Background Sync API (tag `tpm-sync`), fallback to `online`/`visibilitychange` + a `SyncProvider` interval. `/sync` shows live state via `useLiveQuery`.
- **Dependency-ordered drain (not just oldest-first):** the processor uploads each **check-in before any report that references its `clientUuid`** (`linkedCheckinUuid`). A report's `check_in_id` is set offline to the check-in's `clientUuid`; because `check_ins.id` IS that UUID, the FK + the "Assessment + Follow up require check-in" CHECK are satisfied once the check-in row exists. Use a deferrable FK as a safety net.
- **Idempotent writes via privileged RPC:** the sync processor calls a `SECURITY DEFINER` check-in RPC (service-role) that does `INSERT ... ON CONFLICT (id) DO NOTHING`. Replays are true no-ops. **The RLS insert policy is defense-in-depth only** — clients never UPDATE check-ins directly (employee UPDATE on check_ins is forbidden by RLS), so dedupe must be server-side, not a client upsert.
- **Conflict rules:** check-in event time = device `capturedAt` (immune to sync delay); server re-validates Haversine + late/early thresholds in `Asia/Bangkok` and **server wins** on status, surfacing any correction. If the linked session/course advanced server-side (e.g., course completed), mark `conflict` → review in `/sync` (never silently drop). Exponential backoff → `failed` with manual retry.

### 4.4 Geolocation + Haversine (≤1km)
`getCurrentPosition({enableHighAccuracy:true, maximumAge:0})`; `features/checkin/geo.ts` Haversine vs `patients.home_lat/lng`; `withinRadius = distance ≤ settings.geofence_radius_m (default 1000)`. Computed on-device (offline) and **re-verified server-side** on sync (anti-spoof). Poor accuracy → warn + require retry.

### 4.5 Camera / selfie
`<input type="file" accept="image/*" capture="user">`, canvas preview, downscale to Blob, hold in Dexie until online → upload to `selfies` bucket. **Selfie enforcement is settings-driven**: when ON, check-in is blocked without a selfie.

### 4.6 Timezone correctness (resolves Critique-2 #9)
`schedule_sessions.scheduled_start` is composed as `(scheduled_date + work_hour_slots.slot_start) AT TIME ZONE 'Asia/Bangkok'` → stored `timestamptz`. `is_late = capturedAt > scheduled_start + late_threshold`; `left_early = checkout.capturedAt < scheduled_end - early_threshold`. The nightly attendance sweep runs at Bangkok midnight.

### 4.7 Offline vs online-only
Offline (queued): check-in/out (GPS/clock/selfie), Follow up/Summary reports, Swallowing/Hand assessments, patient KPI, viewing cached assigned patients + queue. Online-only: public booking, Admin/Director monthly assignment + จัดเวรแทน/สลับเวร, approvals, audit log, settings, dashboards/Live Monitor, exports, question-bank editing, relatives portal.

---

## 5. Supabase Storage + Realtime + Edge Functions/cron

### 5.1 Storage buckets (all private except logo; access via RLS + short-TTL signed URLs)
| Bucket | Contents | Access |
|---|---|---|
| `selfies` | check-in selfies | insert/read own employee; staff read; path `{employee_id}/{session_id}/{uuid}.jpg` |
| `report-images` | daily-report images | insert: assigned employee; read: staff; path `{patient_id}/{report_id}/...` |
| `therapist-photos` | profile photos (relatives see) | Admin write; curated photo served via signed URL |
| `branding` | company logo | Director write; public read |
| `exports` | generated Excel/CSV | staff only, short-TTL signed URLs |
| `consents` | PDPA consent artifacts | server write only |
| `evidence` | correction attachments | requester + staff |

### 5.2 Realtime
Postgres Changes on `schedule_sessions`/`check_ins`/`bookings`/`correction_requests` → TanStack Query cache; RLS scopes each role. Admin + Director receive the same company-wide Live Monitor stream. No relative channels.

### 5.3 Edge Functions + cron (Supabase Scheduler / `pg_cron`, all `Asia/Bangkok`)
| Function | Schedule | Action |
|---|---|---|
| `relative-reminders` | daily early AM | notify relative **1 day before** each session; **once before course end** (when remaining crosses the threshold). Idempotent via `notifications.dedupe_key`. |
| `course-alerts` | on check-in (trigger) + daily sweep | alert at **session 9** (`used = base_sessions - 1`) and at **0 remaining**. |
| `attendance-sweep` | Bangkok midnight | sessions past `scheduled_end` with no check-in → `status='no_checkin'` (ไม่ได้เช็คอิน), `counts_as_training=false`. |
| `export-builder` | on-demand | heavy Excel generation off the request path → `exports` bucket. |
| `push-sender` | on event (DB trigger / queue) | send **Web Push (VAPID)** to staff/employee `push_subscriptions` for substitute needed/assigned, correction decisions, course alerts; prune 410-Gone endpoints. Relatives excluded (in_app/email/LINE). |

Functions use the service-role key (server env) and recompute course progress from `schedule_sessions` (authoritative). Cron invocation is guarded by `CRON_SECRET`.

---

## 6. Thai i18n + พ.ศ. + calendar + charts + export

- **i18n:** Thai-primary static dictionary `lib/i18n/th.ts` + thin `t()`. All status strings centralized (ทำนัดแล้ว/รอชำระเงิน/ยกเลิกนัด, สาย/ไม่ได้เช็คอิน/งด/ออกก่อนเวลา, จบเคส, ครบคอร์ส, active/hold/no_service). Terminology locked: **พนักงาน (employee) · Admin (admin) · Director (director)** — no owner/CEO/Supervisor/หัวหน้า. Attendance labels: **"สาย"** (late) · **"ไม่ได้เช็คอิน"** (no check-in) · **"งด"** (patient cancelled) · **"ออกก่อนเวลา"** (left early).
- **พ.ศ.:** store UTC `timestamptz`; display via `Intl.DateTimeFormat('th-TH-u-ca-buddhist', …)` wrapped in `formatThaiDate()/formatThaiDateTime()`. Never store BE. Dashboards/exports group by Bangkok-local periods (never raw BE year arithmetic).
- **Calendar:** FullCalendar (daygrid/timegrid/interaction), Thai locale, BE-formatted titles; month/week/time-grid for Admin/Director assignment + employee day/week/month + relatives read-only.
- **Charts:** Recharts — diagnosis pie (Stroke/Parkinson/Dementia/ALS/MS/Other), work-hours bar, course funnel (used vs remaining), late/early-rate trend. Themed to tokens, SSR-safe client wrapper.
- **Export:** SheetJS xlsx (multi-sheet: bookings, attendance, reports, KPI, work-hours, diagnosis stats) + CSV (UTF-8 BOM for Thai). Generated server-side → `exports` bucket signed URL; BE dates + Thai headers; every export audit-logged.

---

## 7. Environment variables + deployment

```bash
# Public (client-safe)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # publishable/anon only
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CHECKIN_RADIUS_M=1000       # default; settings overrides at runtime

# Server-only (NEVER NEXT_PUBLIC)
SUPABASE_SERVICE_ROLE_KEY=              # admin client; Server Actions/Edge Functions/relatives only
SUPABASE_JWT_SECRET=
DATABASE_URL=

# Edge/notifications
LINE_CHANNEL_ACCESS_TOKEN=             # v1 relative channel = in_app + (optional) LINE
RESEND_API_KEY=                        # optional email
CRON_SECRET=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=          # Web Push (client subscribe) — public
VAPID_PRIVATE_KEY=                     # Web Push (push-sender) — server-only
VAPID_SUBJECT=mailto:ops@betterbrain.example   # VAPID contact

# App config defaults
DEFAULT_LATE_THRESHOLD_MIN=15
DEFAULT_EARLY_THRESHOLD_MIN=15
SELFIE_ENFORCED_DEFAULT=true
APP_TZ=Asia/Bangkok
```

**Vercel:** Next.js 15 with `withSerwist`; ensure SW + manifest emitted; env scoped per environment; service-role key in server env only. **Supabase:** Postgres+Auth+Storage+Realtime in one region; apply `supabase/migrations`; enable `pg_cron`; Realtime publication on monitored tables (PostGIS NOT required — lat/lng numerics + app-side Haversine).

**Pre-launch:** Supabase advisors (security/perf); verify no service-role leak to client; Lighthouse PWA/CWV (LCP<2.5s); offline check-in E2E (airplane mode → reconnect → idempotent sync); audit coverage (login/check-in/edit/approval/password/export); the 4 RLS negative tests green.

---

## Traceability (load-bearing constraints)
- Attendance status on `schedule_sessions.status`; `check_ins` is evidence (incl. `is_late`, `is_early`). Device `capturedAt` decides late/early; server re-validates in `Asia/Bangkok`.
- `check_ins.id = clientUuid` + privileged `INSERT … ON CONFLICT DO NOTHING` → idempotent offline replays without violating RLS.
- Dependency-ordered sync (check-in before dependent report) satisfies the "require check-in" CHECK offline.
- Report vanish-on-save + assigned-only visibility (incl. **address visible** to assigned employee) are RLS predicates.
- Admin check-in edits gated on `correction_requests.status='approved'`; Director approves, Admin applies + confirms.
- Course progress recomputed from `schedule_sessions` (single source); alert at `used = base_sessions - 1`.
- Live Monitor identical for Admin + Director; left-early (ออกก่อนเวลา) is first-class status.
- **Substitution (จัดเวรแทน/สลับเวร):** stored as `schedule_sessions.coverage_status` + `substituted_from` + `substitution_reason` (standalone, not leave-driven; leave system deferred to a later unified HR module).

Source files consulted: `F:\tmp\docx_extract.txt` (form fields), `F:\SaaS\TPM\flow\ระบบเช็คชื่อพนักงาน1.pdf` (HR+supervisor shared dashboard, left-early, two-tier approval, employee day/week/month + own special cases), `F:\SaaS\TPM\flow\แก้ไข-เพิ่มเติม therapist mm_4 Jun 2569.pdf` (course rules, employee fields, therapist schedule, การวัดผล hub, relatives portal, status labels), `flow/1.jpg`+`2.jpg` (OOCA), `flow/S__362397734_0.jpg` (logo).
