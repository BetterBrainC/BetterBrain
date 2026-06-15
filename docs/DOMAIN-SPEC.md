# TPM — Functional Specification (Source of Truth)

> **Client review v3 (2026-06-14, flow/3.pdf) — applied.** Roles = **Director / Admin / Employee** (was owner/hr); **ผู้รับบริการ** (not ผู้ป่วย); reports = **Assessment / Follow up (รายวัน) / Summary (รายเดือน)**; **leave system removed** → **จัดเวรแทน/สลับเวร** is standalone (admin reassigns a session to a conflict-free employee); **การวัดผล = Director-only** (+ **FIM/MFS** pending); relatives verify by **phone last-4** + **วิธีออกกำลังกาย**; course progress = **bar-only** with **access auto-revoke** on course completion. **Synnis** = separate project. CLAUDE.md §13 is canonical.

Platform: Next.js 15 + Supabase + employee PWA. UI Thai-primary; dates in พ.ศ.; all business-time math in `Asia/Bangkok`. Table/column/enum names match docs/DATA-MODEL.md exactly.

---

## 0. Global concepts

### 0.1 Roles & authority (exactly 3)
| Capability | employee (พนักงาน) | admin | director (2 accts, hard-capped) |
|---|---|---|---|
| Own profile | view/limited edit | all CRUD | all CRUD |
| See patients | assigned only (name+**address**+program) | all | all |
| Booking intake create | no | yes (public + manual) | yes |
| Assessments (write) | own assigned, **after check-in** | yes | yes |
| Monthly-calendar assignment | no | yes | yes |
| Check-in / out | yes (self) | no | no |
| Reports (write) | own assigned | yes | yes |
| See ALL reports | only own **drafts** | yes | yes |
| Patient KPI | own assigned | view | view |
| Own stress + knowledge | yes | manage bank | view all |
| Request correction | yes | no | no |
| Approve correction | no | no | **yes** |
| Apply check-in correction | no | **yes (after director approval)** | yes |
| Master data CRUD | no | full | full |
| Live Monitor / dashboard | no | **yes (identical to director)** | yes |
| Settings | read subset | read subset | full write |
| Audit log | no | **no** | yes (director-only) |

**Authority is enforced in RLS, not only UI.** "Report disappears after save" is an RLS predicate on `reports.status`.

### 0.2 Approval chain (canonical)
```
employee submits check-in/time correction
  → DIRECTOR approves  (rejected → back to employee, no change)
      • correction:  Admin applies the edit + confirms (Admin cannot edit before director approval)
  → every step audit-logged (who/what/when/before/after)
```
(The original two-tier "Supervisor first, HR final" is realized within the 3 locked roles as **director approves → admin applies+confirms**. Only `director`/`admin`/`employee` exist — no CEO/Supervisor/หัวหน้า role.)

### 0.3 Terminology (locked)
พนักงาน (not ทีมงาน) · top approver = director · "ไม่ได้เช็คอิน" (not "ไม่มา") · "จบเคส" on save · "สาย"/"งด"/"ครบคอร์ส"/"ออกก่อนเวลา".

### 0.4 Cross-cutting rules
Dates display พ.ศ. (store UTC). Long clinical forms are schema-driven `jsonb` + indexed columns. PDPA: consent at intake/booking; least-privilege RLS; access logging; service-role server-side only. Audit everything. Special cases (เคสพิเศษ) = extra-pay flag on a session (existing or new) + manual amount (not holiday-only).

---

## A. Public Booking Intake (+ Admin manual entry)

**Flow:** visitor opens native form (rate-limited, honeypot) → fills fields + PDPA consent → submit → `bookings` with status `booked` (or `awaiting_payment` if payment pending) → confirmation → appears in admin queue. **Admin can also create a booking/appointment directly from the back office (`/staff/bookings` → ทำนัด)** — this manual path is a required equivalent, not a fallback afterthought. Admin reviews → converts booking → patient (+intake) → cancels → `cancelled`.

**Fields:** ชื่อ-สกุล*, เบอร์โทร*, ช่องทางติดตาม (Facebook/Google/ป้ายคลินิก/มีคนแนะนำ), อาการเบื้องต้น, ผู้รับบริการคือ (self/relative)+relation, วันที่/เวลานัดสะดวก, พื้นที่/ที่อยู่, PDPA consent*.

**Rules:** a booking is not a patient; conversion creates patient + intake. Payment status drives `awaiting_payment` vs `booked`. Public cannot change status.

**Validations:** name/phone/consent required; phone regex; preferred date ≥ today; rate limit + honeypot.

**Edge cases:** duplicate phone within N days → flag (don't block); double-submit → idempotency dedupe; existing patient → admin links on conversion; cancelled re-open → new booking.

**Status machine:** `(new)→booked|awaiting_payment` (submit); `awaiting_payment→booked` (payment); `booked|awaiting_payment→cancelled` (admin/director/cron timeout); `booked→converted` (flag `converted=true`). Terminal: `cancelled`.

---

## B. Appointment + Assessment (Swallowing / Hand Function)

**Flow:** Admin converts booking → Appointment + Patient (intake = ใบประวัติการรักษา, captures PDPA consent + OT signature/ID). At appointment, employee **checks in** (assessment cannot be saved without it). Employee picks instrument (Swallowing OR Hand) → fills jsonb form → save → leaves employee view (RLS), visible to admin/director; FOIS seeds patient KPI baseline; "จบเคส" shown.

**Form 1 — ใบประวัติการรักษา (intake):** วันที่, BBC-CN; identity (ชื่อ-สกุล, อายุ, DOB, เลขบัตรประชาชน, สัญชาติ, เชื้อชาติ, สถานภาพ, เพศ); contact (ที่อยู่, โทรศัพท์); clinical history (U/D, แพ้ยา, past history, surgery history, chief complaint); emergency contact (name/relation/phone); referral source; OT signature + ID.

**Form 2 — Swallowing Assessment:** Name/Age/DOB; Diagnosis; Chief Complaint; Underlying (DM/Hypertension/Heart/Dyslipidemia/CKD/Rheumatoid/Gout/No); Mobility (Walk/Wheelchair/Walker-Stretcher-Cane); Fall risk; Fracture risk; Vital signs (BP/HR/RR/SpO2); Subjective & Objective; Physical exam; Swallowing Evaluation (Tracheostomy, Lips control, Cough reflex, Feeding by, Bite reflex, Tongue movement, Gag reflex, **FOIS**, Jaw control, Drooling, Swallow reflex); **Part 1 Indirect** (1.1 vigilant ≥10 min, 1.2 voluntary cough/throat clearing, 1.3 swallow saliva — all Yes → Part 2); **Part 2 Direct** (2.1 Semi-solid pudding ½ tsp trial 1st–5th; 2.2 Liquid water trial 3/5/10/20/50 ml; 2.3 Solid cracker trial 1st–5th); Result (safe to swallow, minimal aspiration risk); Recommendations; Remarks; ADL (Bed mobility/Locomotion/Eating/Bathing/Transfer/Toileting/Dressing/Hygiene-Grooming); Plan (LTG/STG/Re-assessment date/Treatment/Post-treatment); Therapist name + Date.

**Form 3 — Hand Function Assessment:** Name/Age/DOB; Diagnosis; Chief Complaint; Precaution (DM/Hypertension/Heart/N/A/Others); Mobility; Fall/Fracture risk; Operation-Lab-Xray; Subjective; Vital signs (BP/HR/RR/**Temp**); Physical exam (Consciousness: Alert/Stupor/Delirium/Semi-coma/Coma; ROM; Muscle tone/length/power); Pinch & Grip Strength (Date; Grip/Lateral pinch/3-point pinch/Tip pinch — Rt+Lt); Pad-to-Pad Pinch (Rt thumb with 2nd–5th; Lt thumb with 2nd–5th); Sensory (key I/Imp/A/NT; R/L: Stereognosis, Proprioception, Sharp/Dull, Light touch, Temperature); Perception (R/L: Visual field, Figure-ground, Body scheme, R/L discrimination, R/L neglect); Cognitive (Orientation Person/Place/Time; Follows commands One-step/Multi-step/Unable; Communication Verbal/Non-verbal/None; Attention; Memory short/long; Calculation); Swallowing Evaluation (same fields incl. FOIS); ADL; Plan; Therapist name + Date.

**Rules:** assessment requires a valid check-in (employee); admin/director may enter without check-in (back office). On save → invisible to employee, visible to admin/director; FOIS → KPI baseline.

**Validations:** identity + diagnosis + chief complaint + therapist name/date required; vitals numeric (warn out-of-range); FOIS ∈ L1..L7.

**Edge cases:** missing check-in → block ("ต้องเช็คอินก่อน"); offline draft autosave → queued (dependency-ordered after the check-in); re-assessment → new record (history immutable).

**Status machine:** `(new)→draft` (autosave); `draft→completed` (employee, check-in exists → vanish + จบเคส; admin/director without check-in); `completed→corrected` (admin/director edit, audited).

---

## C. Admin Monthly-Calendar Case Assignment

**Flow:** Admin opens the month grid (พ.ศ.) → select patient → select employee (their slots + conflicts shown) → place sessions on dates/times across the month (hospital-queue). Each placement creates a `schedule_sessions` row against the active course and **upserts a `patient_assignments` row** (granting employee visibility). Sessions feed employee day/week/month views, team calendar, and relatives' ปฏิทินคิวฝึก. Admin can drag/reschedule, mark a session as a special-case (เคสพิเศษ — extra pay, manual amount), or cancel.

**Rules:** sessions only against an active course with remaining sessions (or special-case override); slots bound per employee drive work-hour calc; plannable sessions bounded by course total minus used. **Patient must be `active`** (Hold → block with reason). **Substitution/shift-swap (จัดเวรแทน/สลับเวร):** Admin reassigns a session to a conflict-free employee via session edit (standalone, not leave-driven); sets `coverage_status` + `substituted_from` + `substitution_reason` on `schedule_sessions`.

**Validations:** no double-booking an employee in the same slot (block); no scheduling beyond course total+bonus (block; warn for bonus); patient home coords missing → block (GPS needs them).

**Edge cases:** reschedule across month boundary moves the session (counters unaffected — counted by check-in); bulk recurring weekly pattern generates N sessions respecting remaining.

---

## D. Check-in / Check-out (GPS 1km, late, no-checkin, skip, left-early, selfie, offline)

**Flow (happy path):** employee opens session → app gets Geolocation → distance to patient home → within **1 km** → check-in (realtime clock, GPS, optional selfie if enforced) → unlocks Assessment + Daily report → after treatment, **press the "เช็คเอาท์" button** (timestamp + GPS) → **the Daily report opens immediately** → save → KPI → work-hours computed → จบเคส.

**Offline (PWA):** check-in/out, selfie, report drafts queue in IndexedDB (Dexie); background sync flushes on reconnect; GPS + timestamp captured locally at action time; idempotent via `clientUuid`; dependency-ordered (check-in before dependent report); server keeps the earliest valid check-in per session.

**Labels/rules (`Asia/Bangkok`):** within 1 km on time → normal; after scheduled time + late-threshold → **"สาย"** (still counts); no check-in by day end → **"ไม่ได้เช็คอิน"** (not counted toward work hours; not a training session); patient last-minute cancel → **"งด"** (not a session that day; no course session consumed); check-out before scheduled_end − early-threshold → **"ออกก่อนเวลา"** (left-early flag, surfaced on Live Monitor). Course "used" derived from valid check-ins.

**Validations:** GPS denied → cannot check in (guidance; retry); distance > 1 km → block with distance shown; selfie required+missing → block; check-out before check-in → block; large device-clock drift → server flags for correction.

**Edge cases:** multiple sessions same day/patient → independent check-ins; app killed mid-flow → queued action resumes; wrong session → correction request; patient home moved → admin updates coords for future sessions; TZ stored UTC, displayed Bangkok + พ.ศ.

**Session status machine (on `schedule_sessions`):** `scheduled→in_progress` (check-in; sets `late` flag/status); `in_progress→completed` (check-out pressed → Daily report saved); `scheduled→skipped` (งด); `scheduled→no_checkin` (sweep); `scheduled→rescheduled` (admin moves); `scheduled→cancelled` (admin); any→`corrected` (approved correction applied → recompute). Left-early is a `check_ins.is_early` flag on a `completed`/`attended` session, not a separate session status.

---

## E. The Reports + Visibility Flip + จบเคส + Gating

**Report types** — v3 has **3** enum types: `assessment_swallow`/`assessment_hand` · **`followup`** · **`summary`** (the monthly-progress and close-out forms below both persist as `summary`):
1. **Follow up — บันทึกรายวัน** (`report_type=followup`) — **requires check-in**; opens automatically after check-out. Fields: Date, Time, Patient name, BP/HR/SpO2 **before** and **after**, Diagnosis, Problem list, Goal, Subject, Treatment, Post-treatment, Image, OT name.
2. **Summary — ความก้าวหน้ารายเดือน** (`report_type=summary`) — anytime. Fields: ช่วงเวลาการฟื้นฟู, patient name, age, การวินิจฉัยโรค, การวินิจฉัยทางกิจกรรมบำบัด, เป้าหมายปัจจุบัน, ความก้าวหน้า, เป้าหมายต่อไป, ลงชื่อ, **เลขที่ใบประกอบวิชาชีพ (from profile, not hand-typed)**, วันที่. **Includes a FOIS score selector** (monthly progress carries FOIS, per source).
3. **Summary — close-out / discharge (สรุปผลการฟื้นฟู)** — anytime; **same `report_type=summary`** as #2 (monthly progress + discharge share one enum type in v3). Designed to clinical best practice (client: "ออกแบบตามหลักที่ควรจะเป็น"): **Header** (patient name, age, diagnosis, OT diagnosis, rehab period start→end, total sessions completed, therapist + license auto from profile); **Reason for summary** (course complete / no service / continue); **Baseline → current outcomes** (FOIS baseline→current via the 7-level selector; Barthel baseline→current 0–100; Function checklist sit-to-stand/stand/walk/eat/tube-removal); **Treatment provided** (summary narrative); **Goals** (LTG/STG status: achieved / partial / not-met); **Overall progress/outcome**; **Recommendations / home program / follow-up**; **Caregiver education given**; **Next plan** (if Continue) or **discharge advice** (if No service); signature + BE date. On save → KPI evaluation (incl. FOIS) and → จบเคส. (Best-practice default; confirm exact fields with client.)
4. **Assessments** (Swallowing/Hand) — §B; **require check-in.**

Gating: **Assessment + Daily require check-in; Monthly + Summary do not** (enforced in Server Action + deferrable DB CHECK).

**Visibility flip (RLS):** draft → visible to author + admin/director; on `status='completed'` → RLS hides from employees (predicate `status='draft' AND author_id=auth.uid()`), admin/director retain read + edit (→ `corrected`, audited). Trigger forbids employee `completed→draft`.

**Validations:** required minimums (patient, date, OT name/signature; license# auto from profile for monthly); vitals numeric warnings; image type/size limits.

**Edge cases:** offline save → flip occurs only after server commit; employee re-open of saved report → not found (RLS) → "ส่งรายงานแล้ว ติดต่อ Admin"; duplicate daily same session → block/merge.

**Status machine:** `(new)→draft` → `completed` (flip + จบเคส; Summary → KPI/FOIS) → `corrected` (admin/director); `draft→discarded` (cancel). Terminal: `completed`/`corrected`/`discarded`.

---

## F. Course Lifecycle

**Types:** 10 (+1 free bonus); 30. `used` counted from valid check-ins (session status attended/late/completed); `งด`/`ไม่ได้เช็คอิน` never consume.

**Flow:** purchase → admin creates course (type/total/bonus/price/start), status `on_process` → assign sessions (§C) → each valid check-in increments used → **alert at session 9** (`used = base_sessions - 1`, i.e. 9 for a 10+1) → **alert at 0 remaining** → **"ครบคอร์ส"** → choose **Continue** (resume `on_process`) or **No service** (end → employee does post-treatment **Score** = Summary + KPI incl. FOIS → `no_service`).

**Rules:** bonus deliverable, consumed last; **special-case sessions** (`is_special_case`, extra-pay, set on an existing or new session — not holiday-only) carry a manual `special_amount` and, like any session, count toward the course only if a valid check-in occurs; status on overview list AND patient detail.

**Validations:** cannot exceed total+bonus (block); Continue requires new/extended sessions; No service warns if post Score not done.

**Edge cases:** a correction removing a check-in → recompute used/remaining (may re-open from ครบคอร์ส); patient Hold mid-course → freeze counters, block new sessions; refund/early termination → director closes to `no_service` with reason.

**Course/case status machine:** `(new)→on_process`; `on_process↔hold`; `on_process→course_complete (ครบคอร์ส)`; `course_complete→on_process` (Continue) | `course_complete→no_service` (No service, post-Score warn); `on_process|hold→no_service` (director early termination); `no_service→on_process` (re-purchase). Patient status mirrors: `active↔hold→no_service→active`.

---

## G. Patient KPI + Employee KPI (การวัดผล hub)

**Dedicated page (การวัดผล):** one hub combining employee KPI (own), patient KPI (own assigned), and diagnosis statistics — employee edits, director/admin view (matches source "หน้าหลักโชว์แยกออกเป็น 1 หน้า").

**Patient KPI (การวัดผลผู้รับบริการ):** FOIS (7 levels), Barthel Index (0–100), Function checklist (ลุกนั่ง=sit_to_stand / ยืน=stand / เดิน=walk / กินได้=eat / ถอดสายได้=tube_removal). Sub-headings: ความก้าวหน้ารายวัน and ความก้าวหน้ารายเดือน (the monthly one carries a FOIS score selector). Baseline at first assessment; progress at monthly + Summary; deltas drive outcome dashboards.

**FOIS 7 levels:** L1 nothing by mouth; L2 tube-fed + minimal oral trial; L3 oral soft/liquid + tube supplement; L4 oral single-texture soft; L5 oral needing mashing/chopping; L6 oral but avoid hard food; L7 normal oral intake.

**Employee KPI (การวัดผลพนักงาน):** stress assessment (แบบประเมินความเครียด) + knowledge test (แบบทดสอบความรู้). Director/admin creates **custom question + answer fields each year** (free-text) → `kpi_templates` is year-versioned; an employee has ≤1 active attempt per version; past versions immutable.

**KPI status machine (employee):** `assigned→in_progress→submitted→reviewed`; → `expired` (period closes).

---

## H. Substitution / Shift-Swap (จัดเวรแทน/สลับเวร)

**Scope:** v3 removes the leave request system (deferred to a later unified HR module). **Substitution is standalone**, initiated by admin reassigning a session to another employee for any reason (conflict, employee unavailability, patient/schedule change, etc.).

**Flow:** Admin selects a session on the monthly calendar → opens session edit → reassigns `employee_id` to a conflict-free candidate + records `substitution_reason` → saves → `schedule_sessions.substituted_from` stores the original employee, `coverage_status='substituted'`. The **new employee is notified** (Web Push + in-app, `substitute_assigned`) and the relative reminder reflects the new therapist. Audit logs the change (who/when/before/after).

**Rules:** **A candidate is an employee who** (a) has NO overlapping session in that time window on the same day, (b) is active. A session may be reassigned only to a candidate that passes (a)(b) **server-side**. Reassignment does not consume leave; it is a standalone schedule adjustment.

**Validations:** substitute candidate re-validated on save; no double-booking on the target employee for that slot.

**Edge cases:** reassign back to original employee → clears `substituted_from`; multiple reassignments on one session → audit tracks all; session completion unaffected by reassignments.

**Session substitution state:** `not_substituted` (original assign) | → `substituted` (reassigned to another employee, `substituted_from` set) | → `not_substituted` (reassigned back).

---

## I. Correction Requests + Approval Chain

**Flow:** employee submits correction on a check-in/time record (field, old, requested, reason, optional evidence) → director approves/rejects → on approval **admin applies** (admin cannot edit before approval) via the atomic `apply_checkin_correction` RPC → counters (work hours, course used/remaining) recompute → before/after audited at each step.

**Rules:** admin cannot edit check-in data without an approved correction (RLS + UI); one record/field set per correction; applying may change session/course state (→ `corrected`, recompute).

**Validations:** target exists + belongs to requester; requested value valid (time/GPS plausibility); reason required.

**Edge cases:** approved but not applied → stays `approved` with reminder to admin; conflicting corrections on the same record → second blocked until first resolved; `no_checkin→attended` → recompute work hours + course used.

**Status machine:** `(new)→pending→approved|rejected|cancelled`; `approved→applied` (admin) | `cancelled` (pre-apply). Terminal: applied/rejected/cancelled.

---

## J. Relatives Portal + Reminders

**Access:** tokenized link tied to one patient; relatives are **not** auth users in v1 — portal data is read server-side with the service-role key filtered by token→patient. Requires `consent_relative_portal` active. **Phone verification:** relatives verify by entering the **last 4 digits of the ผู้รับบริการ's phone number** before accessing the portal.

**Content:** brief therapist profile + photo; ปฏิทินคิวฝึก (training calendar); course count + bonus + remaining (from check-ins); training reports (curated, completed subset); **วิธีออกกำลังกาย** (home exercise guide/program); **selectable report visibility** (relatives can choose which completed reports to view).

**Reminders (Edge Functions + cron, Bangkok):** **1 day before each session**; **once before course end** (aligned with low-remaining). Idempotent via `notifications.dedupe_key`; v1 channels = in_app + optional LINE.

**Rules/edge cases:** read-only; no PHI beyond approved subset; rescheduled after reminder → send update; access revoked → portal + reminders stop; patient Hold → portal shows status, pauses session reminders.

---

## K. Dashboard + Live Monitor + Stats + Export

**Shared Live Monitor (admin + director identical, realtime):** four KPI tiles — **เคสทั้งหมด (total cases) / เช็คอินแล้ว + % / กำลังทำ (in-progress) / รออยู่ในวงรอบ (waiting in cycle)** — plus realtime working / late (สาย) / **left-early (ออกก่อนเวลา)** counts and an entry/exit graph. Subscribes to `schedule_sessions`/`check_ins` changes.

**Dashboard widgets:** active patients, sessions today, late/no-checkin/skipped/left-early counts; courses near completion (session-9, 0-remaining); work-hours per employee; outcome trends (FOIS/Barthel deltas); revenue incl. special-case amounts.

**Diagnosis breakdown:** Stroke / Parkinson / Dementia-Alzheimer / ALS / MS / Other — counts + % (which disease uses service most), time-range + per-employee filters. Display full English names.

**Export:** Excel/CSV of patients, attendance, sessions, check-ins, reports metadata, KPI, revenue. Server-side, RLS-respecting, audit-logged, PDPA-scoped; พ.ศ. dates + Thai headers; UTF-8 BOM for CSV; large exports streamed.

---

## L. Settings + Audit Log + Therapist Schedule

**Settings (director write; admin read subset):** company name; logo upload; **selfie-enforcement toggle**; **late-threshold minutes** (+ early-threshold, geofence radius); work-hour slot definitions; course defaults; reminder timing. Changes audit-logged.

**ตารางแพทย์ (Therapist schedule):** distinct screen listing per therapist: ชื่อ-สกุล, เลขที่ใบอนุญาต (license), วัน/เดือน/ปีที่นัด, สถานที่ (location) — a per-therapist roster derived from `schedule_sessions` + `profiles`, separate from the Admin assignment grid.

**Audit log (Director-only read, append-only, immutable):** viewable at `/staff/audit` (RLS Director-only). Log everything — login, check-in/out, edits, approvals (correction), password changes, exports, settings changes — who/what/when/before/after + IP/device. Searchable by actor/entity/action/date (พ.ศ.). Offline-synced check-ins logged with both action time + sync time. **Admin** does **not** read the audit log.

---

## M. Consolidated state-transition reference
- **Booking:** booked↔awaiting_payment→cancelled (+converted flag). (§A)
- **Patient:** active↔hold→no_service→active. (§F)
- **Course/case:** on_process↔hold→course_complete→{Continue→on_process | No service→no_service}; early no_service. (§F)
- **Session:** scheduled→in_progress→completed; or skipped/no_checkin/rescheduled/cancelled/corrected. (§D)
- **Report:** draft→completed(flip/จบเคส)→corrected; draft→discarded. (§E)
- **Assessment:** draft→completed(requires check-in for employee)→corrected. (§B)
- **Correction:** pending→approved|rejected|cancelled; approved→applied. (§I)
- **Substitution:** not_substituted | substituted (reassigned to another employee). (§H)
- **Employee KPI:** assigned→in_progress→submitted→reviewed; →expired. (§G)

## N. Compliance & enforcement (binding)
RLS enforces: employee-sees-only-assigned (incl. **address visible**); report vanish-on-save; relative-sees-one-patient-subset; admin-cannot-edit-check-in-before-approval; audit director-only. Check-in gating in Server Action + DB CHECK. Service-role server-side only. Audit append-only with before/after. Offline: action time + GPS captured at action time; server dedupes; sync time logged. Dates UTC stored, Bangkok + พ.ศ. displayed everywhere.

## O. Open questions (confirm; do not invent)
Resolved 2026-06-14: Summary report = best-practice fields (§E.3); check-out = manual button → opens Follow up report (§D); **leave system removed** → substitution is standalone admin-reassign (§H); roles = director/admin/employee (was owner/hr). Residual (minor, confirm later): Summary best-practice field list (§E.3).

Source: `F:\tmp\docx_extract.txt`; `F:\SaaS\TPM\flow\ระบบเช็คชื่อพนักงาน1.pdf` + `แก้ไข-เพิ่มเติม therapist mm_4 Jun 2569.pdf` (FOIS-on-monthly, employee fields, therapist schedule, การวัดผล hub, left-early, two-tier approval, address-visible, Summary-has-no-form).
