# TPM — Phased Delivery Roadmap

> **Client review v3 (2026-06-14) — applied.** Leave system **removed** from scope (later HR module); **จัดเวรแทน/สลับเวร** folded into P4 (standalone); reports = **3** (Assessment / Follow up / Summary); **การวัดผล Director-only** + **FIM/MFS** (pending); relatives **phone-verify**; **access auto-revoke** on course completion; roles **Director/Admin/Employee**. **Synnis** = separate project. CLAUDE.md §13 is canonical.

Stack (locked): Next.js 15 (App Router, RSC + Server Actions, TS) on Vercel; Supabase (Postgres, Auth, RLS, Storage, Realtime, Edge Functions + cron); employee mobile-first installable PWA with offline check-in; native public booking; Thai UI / พ.ศ.; `Asia/Bangkok` business time.

Roles (3): employee, admin, director (2 superadmin accounts, hard-capped). Approval chain: employee submits → **director** approves → admin applies+confirms (corrections). Everything audit-logged.

**v1 INCLUDES:** relatives portal + notifications, employee KPI, dashboard + Excel/CSV export. **v1 EXCLUDES:** realtime team chat (the `ส่งข้อความ` affordance is hidden/stubbed, not left dead).

## Guiding principles
- Each phase is independently shippable and demoable.
- Dependencies flow forward; **RLS built from P0 and extended every phase** (vanish-on-save + assigned-only are DB-enforced, with **address visible** to the assigned employee).
- Two cross-cutting workstreams run every phase: **Testing** (≥80% coverage, CI-gated from P0) and **PDPA** (consent built early, audited at P11). The 4 critical RLS negative tests ship **with** their owning phase.
- **Beyond-brief items explicitly tagged post-v1** (do not crowd out v1 musts): PostGIS, audit partitioning, multi-channel notifications beyond in_app + LINE, data anonymization sweeps, granular underlying-disease taxonomy.

## "ทำ Demo ก่อน" — smallest demoable slice
P0 → P1(min) → P2(booking) → P4(calendar) → P5(check-in) **+ one thin Daily-report save (slice of P6)**. The added Daily-save step makes the demo prove the headline rule (จบเคส + **vanish-on-save**), not just check-in/sync. Concretely: login as 3 roles → admin creates ONE patient (intake jsonb) + places ONE session → employee on a phone sees the assigned patient (name + **address** + program) → checks in (GPS ≤1km + live clock + selfie, offline-queued, syncs on reconnect, Thai labels สาย/ไม่ได้เช็คอิน) → saves a Daily report → sees จบเคส and the report disappears from their view.

---

## Phase 0 — Foundation, Auth, RLS spine, Design tokens, PWA shell
**Deliverables:** Next.js 15 on Vercel; Supabase dev+prod (env-only secrets, service-role server-side); email/password auth + `user_role` JWT claim; **2 pre-seeded director accounts**; route/middleware role gates; `audit_logs` + `recordAudit()` (logs login); RLS default-deny + canonical policy template proven on one table; design tokens + Thai fonts; base UI kit (rounded-2xl card, button, status chip); PWA manifest + Serwist SW + install prompt + offline page; พ.ศ. + `Asia/Bangkok` date utils + Thai i18n scaffold; test harness (Vitest + Playwright) + CI coverage gate.
**Acceptance:** all 3 roles log in scoped correctly; **director cap (max 2, hard-capped) enforced and tested**; RLS default-deny verified (anon → 0 rows); installable PWA + offline fallback; login audit-logged; dates render พ.ศ. (2569); Thai UI in locked palette; CI green ≥80%.
**Risks:** iOS PWA (background sync/geo) — validate on real iPhone early; RLS leaks — policy + negative test before any table ships; Thai font CLS — preload critical weight, swap.

## Phase 1 — Master data (employees + employment fields, patients + intake, courses, slots, settings, consent)
**Deliverables:** employee profiles **with employee_code / department / position / employment_type (รายเดือน/พาร์ทไทม์) / license_no / photo** (case-handlers only); patient master + intake form (jsonb, schema-driven) with diagnosis_category + patient status + **address + training_program**; course catalog (10+1, 30) + course_status; work-hour slots bound per employee; settings (company name, logo, selfie toggle, late + early threshold, geofence radius); **versioned `consents` table + intake consent capture** (PDPA build, not just a checkbox); RLS per table (employee read-only own profile; **address visible** to assigned employee).
**Acceptance:** admin CRUD on employees/patients/courses/slots audited (before/after); employee sees only own profile; intake captures all fields + jsonb round-trip; settings persist + readable downstream; statuses on overview + detail; consent rows created + versioned.
**Risks:** jsonb schema drift — version from day one; upload size/format — validate at boundary.

## Phase 2 — Native public booking (+ admin manual entry)
**Deliverables:** public booking form → `bookings` (booked/awaiting_payment/cancelled) via `submit_public_booking` RPC (rate limit + honeypot + booking consent capture); **admin manual booking/appointment entry path** (`/staff/bookings` → ทำนัด) as an equal path; admin booking inbox (filter/status/convert).
**Acceptance:** anon submits a valid booking (and cannot read any); abusive submissions rejected; admin sees all, moves the 3 states, schedules an appointment, **and can create a booking manually**; status changes audited.
**Risks:** spam — load-test anti-abuse; duplicate patient — dedupe by national ID/phone.

## Phase 3 — Assessments (Swallowing & Hand) + post-treatment Score scaffold
**Deliverables:** Swallowing (#2) + Hand Function (#3) as schema-driven jsonb (full field sets incl. FOIS, Part 1/2 swallowing tests, pinch/grip Rt/Lt, sensory I/Imp/A/NT, perception, cognitive); renderer for checkbox grids, trial steppers, R/L matrices; post-treatment Score scaffold (used at No service).
**Scope note (resolves gating contradiction):** P3 ships the **admin/director back-office assessment entry** (which the brief permits without check-in) + the schema/renderer. The **employee assessment path is gated and lands in P5** once check-in exists. P3's demo is explicitly the staff entry path, not an ungated employee flow.
**Dependencies:** P1 (patients), P2 (appointments). Employee check-in gating wired in P5.
**Acceptance:** both forms capture every source field + jsonb round-trip; attach to patient/appointment/author; admin/director view; employee visibility follows RLS.
**Risks:** long forms on mobile — paginate/section with save; field fidelity — verify vs `docx_extract.txt`.

## Phase 4 — Monthly assignment calendar
**Deliverables:** admin month grid (BE) assign flow patient → employee → date/time across the month (hospital-queue); `schedule_sessions` + **`patient_assignments` upsert** (grants visibility); slot-conflict checks; employee day/week/month "my schedule" (own sessions only).
**Dependencies:** P1 (employees/courses/slots). (P3 not a hard precedence for a calendar demo — the demo spine P2→P4 ships a calendar that can schedule a meet/assessment appointment; clinical-flow precedence assessment→course is enforced in P7, documented here so the two claims do not conflict.)
**Acceptance:** admin schedules a full month; employee sees only own sessions across day/week/month; slot conflicts prevented; assignments audited; assignment creates the visibility grant.
**Risks:** calendar UX — admin desktop-first, employee mobile-first list/views.

## Phase 5 — Check-in / out + OFFLINE PWA (Demo climax)
**Deliverables:** check-in/out with Geolocation ≤1km, live clock, optional selfie (settings-driven); offline queue (Dexie) + Serwist background sync (idempotent via clientUuid; **dependency-ordered: check-in before dependent report**); attendance labels สาย / ไม่ได้เช็คอิน / งด / **ออกก่อนเวลา (left-early)**; check-in gating now enforced for Assessment + Daily; attendance status on `schedule_sessions`; `Asia/Bangkok` late/early/no-checkin math.
**Acceptance:** check-in only within 1km (else blocked with distance); **works offline, queues, syncs on reconnect with no data loss**; late → สาย; no check-in → ไม่ได้เช็คอิน (excluded from work hours); last-minute cancel → งด; early check-out → ออกก่อนเวลา; Assessment + Daily blocked without check-in; **check-out captured + tested** (work-hour math depends on it); E2E demo runs on a real phone.
**Risks:** iOS background sync — manual "sync now" fallback; GPS spoofing — accuracy threshold + server re-validate + flag jumps; clock tampering — server time on sync.

## Phase 6 — Reports (4 types) + report-disappears RLS + Patient KPI
**Deliverables:** Daily (#4, requires check-in), Monthly (#5, anytime, **with FOIS score selector**), Summary (#6, anytime → KPI trigger; **no invented fields** — KPI-only until client elicits the form), assessment finalize; on save → จบเคส + **report vanishes from employee view (RLS on `reports.status`)**; Patient KPI (FOIS L1–L7, Barthel 0–100, Function checklist ลุกนั่ง/ยืน/เดิน/กินได้/ถอดสายได้); auto work-hour calc from check-ins + slots.
**Acceptance:** Daily blocked without check-in; Monthly/Summary anytime; on save จบเคส shows and the completed report is **provably invisible to the employee at the DB layer** (negative test) and visible to admin/director; FOIS/Barthel/checklist recorded; work hours reconcile with check-in/out.
**Risks:** vanish rule is the highest-risk RLS policy — explicit negative test (employee queries completed report → 0 rows).

## Phase 7 — Course lifecycle (used/remaining, alerts, special cases)
**Deliverables:** used/remaining from `schedule_sessions` status; alert at **session 9** (`used = base_sessions - 1`) and at 0 remaining; ครบคอร์ส → Continue (resume) or No service (→ post-treatment Score); **special-case pay flag** (เคสพิเศษ — edit existing or new session + tick → **manual amount**, not holiday-only); course/case + patient status transitions; **enforces clinical precedence** (assessment + active course before sessions consume).
**Acceptance:** remaining reflects only valid check-ins; bonus consumed last; alerts fire at 9 + 0; completion offers Continue/No service; No service triggers post Score; **special-case pay flag** (edit existing OR new session + tick → manual `special_amount`, not holiday-only); statuses on list + detail.
**Risks:** off-by-one in bonus/remaining — exhaustive counting tests (validate session-9 vs base_sessions).

## Phase 8 — Correction requests + approval chain + audit
**Deliverables:** employee check-in/time correction forms; director approval queue; admin apply-after-approval for corrections (atomic RPC); full audit per step. **(Leave system removed in v3 — deferred to a later unified HR module.** **Substitution (จัดเวรแทน) folded into P4** via `schedule_sessions.coverage_status / substituted_from / substitution_reason`; admin reassigns conflict-free employees on the calendar.)
**Acceptance:** employee submits a correction; director approval queue works; **director can approve/reject**; **admin cannot edit a check-in until director approves**; every step audited.
**Risks:** approval→apply races — status checks + transactions; correction timing (stale data between submit and approve).

## Phase 8.5 — Employee KPI + การวัดผล hub + consent finalize
**Deliverables:** employee stress assessment + knowledge test + **year-versioned editable question bank** (`kpi_templates`, free-text question + answer slots); consolidated **การวัดผล hub** (own KPI entry + own stress/knowledge for employee; การวัดผลของทีม for staff) — promoted out of the dashboard phase so it is not compressed; **relative-portal consent** scaffolding for P9.
**Dependencies:** P6 (patient KPI), P1 (consents).
**Acceptance:** admin creates year-versioned questions (prior years immutable); employee self-assessment flow works; การวัดผล hub renders employee + patient KPI + diagnosis-stat sections; relative consent capturable.
**Risks:** version pinning — attempts pinned to their template version.

## Phase 9 — Relatives portal + reminders (cron)
**Deliverables:** tokenized read-only portal (server-rendered, service-role, token→patient; **not auth users**, requires active relative-portal consent): therapist brief profile + photo, ปฏิทินคิวฝึก, course count + bonus + remaining (from check-ins), training reports; reminders 1 day before each session + once before course end (Edge Function + cron, Bangkok, idempotent dedupe; v1 channels in_app + optional LINE).
**Acceptance:** relative sees correct therapist/calendar/counts/reports for **their patient only** (negative cross-patient test); reminders fire exactly once at the right time; cron idempotent.
**Risks:** PDPA scoping — negative test cross-patient; delivery reliability — log + safe retry.

## Phase 9.5 — Web Push (VAPID) + in-app notification center
**Deliverables:** `push_subscriptions` + PWA subscribe flow (permission UX); `push-sender` Edge Function (VAPID) with 410-Gone pruning; in-app notification center (bell + list + read state); wire events — substitute needed/assigned, correction decision, staff session-9 / 0-remaining. Relatives remain in_app/email/LINE (no push).
**Dependencies:** P8 (correction/substitute events), P0 (PWA service worker).
**Acceptance:** staff/employee receive push for substitute + correction events on a real device; permission denial degrades to in-app; relatives never receive push; dedupe holds.
**Risks:** iOS PWA push needs an installed PWA (test iOS 16.4+); VAPID key-rotation runbook.

## Phase 10 — Shared Live Monitor + dashboard + stats + Excel/CSV export
**Deliverables:** **shared Live Monitor identical for admin + director** (realtime working/late/**left-early**, four KPI tiles เคสทั้งหมด / เช็คอินแล้ว% / กำลังทำ / รออยู่ในวงรอบ, entry-exit graph); dashboard diagnosis stats (full ALS/MS names, which disease most), work hours, statuses, KPI rollups; Excel/CSV export (UTF-8 BOM, BE dates) RLS-respecting + audited; ตารางแพทย์ (therapist schedule: name/license/date/location).
**Acceptance:** Live Monitor realtime + identical for both staff roles; stats accurate; export valid (Thai encoding + BE dates); export staff-only + audited.
**Risks:** Thai CSV encoding — UTF-8 BOM, test Excel TH; heavy aggregation — indexes/pagination.

## Phase 11 — Hardening (PDPA, security, performance, E2E, release)
**Deliverables:** PDPA **verification** (consent already built P1/P2/P8.5; verify capture, access/erasure path, retention, encryption-at-rest); RLS least-privilege sweep (every table, negative tests); security review (public booking, uploads, service-role, geo/selfie data); audit coverage confirmation; PWA Lighthouse/CWV; offline E2E on real iOS+Android; full Playwright E2E; coverage ≥80%; cutover checklist + runbook + backups.
**Acceptance:** PDPA checklist satisfied; no cross-role/cross-patient access (negative tests); no CRITICAL/HIGH security findings; CWV met; offline check-in robust; E2E green; coverage ≥80%.

---

## Cross-cutting A — Testing (≥80%)
Unit: form-payload validation, FOIS/Barthel/work-hour/session-count math, พ.ศ. + TZ utils, Haversine ≤1km, late/early/skip labeling, KPI year-versioning. Integration: Server Actions, CRUD, RLS (positive AND negative per table), booking RPC, approval state machines, **substitute-candidate validation**, cron idempotency. E2E: demo spine first (login → assign → offline check-in → sync → Daily save → จบเคส/vanish), then relatives scoping, export, approval chain. **4 critical RLS negative tests ship with their phase:** assigned-only (incl. address visible) ; completed-report-invisible-to-employee ; admin-cannot-edit-check-in-pre-approval ; relative-sees-only-own-patient. CI blocks below 80%.

## Cross-cutting B — PDPA
Consent built P1 (intake) + P2 (booking) + P8.5 (relative portal) with the versioned `consents` table + withdrawal workflow; least-privilege RLS default-deny from P0; access logging (login, check-in, edits before/after, approvals, password changes, exports, PHI reads at app boundary); encryption at rest (confirm Storage); secrets env-only, service-role server-side only; data-subject access + erasure + retention (anonymization) defined P11; geo/selfie minimization (selfie optional per setting). P11 verifies, does not first-build, consent framework.

## Dependency flow
`P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P8.5 → P9 → P9.5 → P10 → P11`.
Demo-first: P0 → P1(min) → P2 → P4 → P5 + thin Daily-save.

Source files: `F:\tmp\docx_extract.txt`; `F:\SaaS\TPM\flow\*` (employee fields, shared dashboard, left-early, FOIS-on-monthly, two-tier approval, Summary-has-no-form, การวัดผล hub).
