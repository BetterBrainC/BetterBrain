# UI Redesign Plan — adopting old-build UI into the new TPM

> **Source of truth for the UI-adoption work.** Derived from a 13-surface cross-reference of the mature old build
> (`F:\SaaS\Therapist Practice Management\src`, "OLD") against the current new build (`f:\SaaS\TPM`, "NEW").
> Scope is **only surfaces the NEW system already has** — features the new system lacks are listed in §6 and must NOT be ported.
>
> **Status (2026-06-15):** ✅ **IMPLEMENTED.** All four phases (P1–P4, incl. P4.6 multiple-choice knowledge test with server-side scoring) are built, browser-tested, and verified against the DB. Treat the checklists below as a record of completed work, not pending tasks.
>
> **Post-plan additions (gap fixes found during full-flow testing + a multi-agent review):**
> 1. **Patient edit + status transitions** — `updatePatient`/`setPatientStatus`/`setCourseStatus`, `PatientAdminControls` on the detail page, `/staff/patients/[id]/edit`.
> 2. **Opaque registration links** — `registration_links` table (migration `0006`), random token (not the HN), 14-day expiry, `createRegistrationLink` + token-based `submitRegistration`.
> 3. **Self-service password reset** — `/forgot` + `/reset` + login link.
> 4. **Audit-log viewer** — `/staff/audit` (Director-only), `getAuditLogs`, sidebar nav item.
> 5. **Hardening** — `is_enabled` enforced at login + on the read path (force sign-out) + check-in/follow-up actions; booking consent client-required; check-out requires a prior check-in.

---

## 0. How to use this document

- Work is grouped into **4 phases** (§2). Each phase is a self-contained checklist you can trigger independently.
- Every item in §3 carries: **OLD source → NEW target**, what to adopt, why, **effort**, **priority**, and **dependencies** (query/action/migration that are *not* pure UI).
- Before porting any component, read §5 (porting playbook) — the dominant cost is **design-token remapping** (Tailwind v4 arbitrary vars → NEW v3 semantic utilities), not rewriting logic.
- §6 = the explicit "do NOT bring" list. §7 = consolidated new actions / query extensions / migrations.

---

## 1. Scope & guardrails

**Adopt only for surfaces NEW has:** public booking + register intake, login, employee PWA (home/schedule/session+check-in/reports/measurement/account/corrections/notifications), staff shell (dashboard/bookings/assign-calendar/approvals/patients/employees/reports/measurement/settings/notifications), relatives portal, UI primitives.

**Do not regress where NEW is already better:**
- Bottom-nav + light/OOCA visual language + design tokens — keep.
- Status legend on the calendar (labelled, not colour-only) — keep.
- Logo **file upload** in settings (OLD was URL-only) — keep.
- `is_special_case` ✨ accent + teal "today" — keep.

**Brand rules that override any ported styling (CLAUDE.md §2, §10):**
- ONE blue pill CTA per surface; ONE orange `--accent` per screen — do not port OLD gradient/heavy-shadow CTAs or rainbow stat tiles.
- Light-only — strip all dark-mode/theme coupling from ported components.
- Thai-only — strip `next-intl`; use `lib/date/buddhist.ts` + inline Thai.
- Terminology: **ผู้รับบริการ** (not ผู้ป่วย); roles **Director / Admin / พนักงาน**; `is_enabled` (not `is_active`); substitution (จัดเวรแทน/สลับเวร) is standalone (not leave-driven).
- Employee sees course progress as **bar only, no numbers**; numeric is staff/director-only.

---

## 2. Execution phases (trigger one at a time)

### Phase 1 — Foundational gaps & spec bug (low effort, highest leverage) ✅ do first
- [ ] **P1.1** `ThaiDateInput` primitive → replace raw `<input type=date>` in intake-form, assign-modal, scheduling-calendar date jump, patient detail, report date fields *(spec bug: พ.ศ.)*
- [ ] **P1.2** `Skeleton` primitive + `loading.tsx` per route group (employee + staff)
- [ ] **P1.3** Error boundary primitive + `error.tsx` per group + `app/global-error.tsx`
- [ ] **P1.4** Online/Offline + sync indicator (mount in employee layout) — UI ports; pending-count/drain logic is net-new
- [ ] **P1.5** Notification **mark-read + "อ่านทั้งหมด"** (optimistic) — *bell currently counts unread but can never clear it* ⭐
- [ ] **P1.6** Animated `Sheet` (enter/exit transition + close button + Esc hint) — upgrade existing `components/ui/sheet.tsx`
- [ ] **P1.7** `EmptyState` primitive (from `PlaceholderPage`) → replace 9+ bare-text empty states (OOCA "illustration-led" rule)

### Phase 2 — Clinical-tool depth (data mostly already in DB)
- [ ] **P2.1** `VisitDetailModal` content — make calendar session chips clickable → detail sheet (address/Maps/timeline)
- [ ] **P2.2** FOIS level-picker grid 1–7 (replace the long `<select>`)
- [ ] **P2.3** Check-in: confirm-before-GPS sheet + typed Thai geolocation errors + distance/accuracy read-back + selfie/evidence display
- [ ] **P2.4** Report photo/evidence upload + report **draft autosave**
- [ ] **P2.5** Approval card before/after **diff** + icon + per-action spinner
- [ ] **P2.6** Dashboard recharts trend chart (add `recharts` dep) + Live Monitor swimlanes + realtime + live clock

### Phase 3 — Close real user dead-ends (needs new actions/queries)
- [ ] **P3.1** Employee EDIT + enable/disable + admin reset-password (`updateEmployee`, `resetPassword` actions)
- [ ] **P3.2** Employee correction **history** list (`getMyCorrections`) — currently submit-only
- [ ] **P3.3** Bookings: filter chips + search; cancel-with-reason; confirm-before-convert
- [ ] **P3.4** Patient detail: header card + 3-up summary stats + quick-action cluster + session timeline
- [ ] **P3.5** Relatives portal: course progress bar + stat tiles + month calendar + staff share-link modal + **move phone verify to server-side** (security)

### Phase 4 — Polish (do opportunistically)
- [ ] **P4.1** `DateTime24Input` (24h Bangkok) for assign-modal
- [ ] **P4.2** Date-range CSV export route (attendance + GPS distance + lateness)
- [ ] **P4.3** Self-edit name/phone in Account (`updateMyProfile`)
- [ ] **P4.4** Report form micro-UX: pill-toggle CheckRow, Rt/Lt paired inputs, treatment chips, vitals fieldset
- [ ] **P4.5** `useOptimistic` as a cross-cutting pattern on frequent actions (approve/reject, self-edit, mark-read)
- [ ] **P4.6** *(needs data-model change, defer)* Knowledge test → multiple-choice + answer key + pass/fail (server-side scoring)

---

## 3. Detailed item specs

> Legend: **E** = effort (low/med/high), **P** = priority. "deps" lists non-UI work that must accompany the port.

### Phase 1

**P1.1 — ThaiDateInput** · E low · P **high**
- OLD: `src/components/forms/ThaiDateInput.tsx` (พ.ศ. label overlaid on native date; webkit picker-indicator arbitrary variant)
- NEW target: new `components/ui/thai-date-input.tsx` → used by `components/forms/intake-form.tsx`, `components/staff/assign-modal.tsx`, `components/staff/scheduling-calendar.tsx` (date jump), `app/(staff)/staff/patients/[id]`, report date fields
- Why: NEW uses raw `<input type=date>` in 5+ places; on Windows/en-US it renders Gregorian MM/DD/YYYY — violates the locked พ.ศ. rule. One component fixes all.
- deps: none. Use `lib/date/buddhist.ts` for display; store ISO `YYYY-MM-DD`.

**P1.2 — Skeleton + loading.tsx** · E low · P **high**
- OLD: `src/components/layout/Skeleton.tsx`, OLD `loading.tsx` patterns
- NEW target: `components/ui/skeleton.tsx` + `app/(employee)/app/loading.tsx`, `app/(staff)/staff/loading.tsx` (+ key dynamic subroutes)
- Why: no loading state anywhere → blank screen on PWA during server fetch. `animate-pulse` is core Tailwind v3 (no plugin needed).

**P1.3 — Error boundary + error.tsx** · E low · P **high**
- OLD: `src/components/layout/ErrorBoundary.tsx`
- NEW target: `components/ui/error-fallback.tsx` + `error.tsx` per route group + `app/global-error.tsx`
- Why: raw unhandled errors, no recover path. Route OLD `console.error` through the project logger (no-console rule).

**P1.4 — Online/Offline + sync indicator** · E med · P **high**
- OLD: `src/components/layout/OnlineBadge.tsx`, `OfflineSync.tsx`, `src/hooks/useOnline.ts`
- NEW target: `components/offline/*`, mounted in `app/(employee)/app/layout.tsx`; wire to `lib/sync` drain + `lib/db` (Dexie)
- Why: PWA offline value-prop is invisible — Dexie exists but no UI signals queued/synced check-ins. **Badge UI ports; pendingCount + drain logic is net-new** (`lib/sync` is currently empty).

**P1.5 — Notification mark-read (optimistic)** ⭐ · E low–med · P **high**
- OLD: `src/components/layout/NotificationBell.tsx` (lines ~130–144: `markRead` optimistic + `markAllRead` + `router.refresh`)
- NEW target: `components/shell/notification-bell.tsx` + `components/shell/notification-list.tsx`
- Why: NEW bell counts unread from `read_at` but has **no action to mark read** → badge sticks forever, opening doesn't clear it. The mark-read mechanism is feature-agnostic (drop OLD `KIND_META`/per-kind icons; leave system is removed in v3).
- deps: new actions `markNotificationRead(id)`, `markAllNotificationsRead()` (RLS: `recipient_profile_id = auth.uid()` — policy already exists).

**P1.6 — Animated Sheet** · E med · P **high**
- OLD: `src/components/calendar/VisitDetailModal.tsx` keyframes + `MoreMenuSheet.tsx` slide (note: inline `<style>` keyframes, **not** the `tailwindcss-animate` plugin)
- NEW target: upgrade `components/ui/sheet.tsx` (enter/exit transition, explicit close button, Esc-to-close already present — add hint)
- Why: every modal in the PWA pops instantly. Don't add the plugin; reuse inline keyframes or `transition`/`animate-in` equivalents in v3.

**P1.7 — EmptyState primitive** · E low · P med
- OLD: `src/components/domain/PlaceholderPage.tsx` (dashed-border card + centered icon + Thai title/desc, ~25 lines)
- NEW target: new `components/ui/empty-state.tsx` → notification-list, approvals empty, patients-table empty, bookings empty, relatives report placeholder, etc.
- Why: NEW has bare-text empty states in 9+ spots, violating OOCA "illustration-led empty states" (CLAUDE.md §2). One primitive (swap icon per use) = consistent + DRY. Build this *before* per-page empty-state work.

### Phase 2

**P2.1 — VisitDetailModal content** · E med · P **high**
- OLD: `src/components/calendar/VisitDetailModal.tsx`
- NEW target: `components/staff/scheduling-calendar.tsx` — make `SessionChip` a `<button>` opening `components/ui/sheet.tsx` with detail
- Why: sessions aren't clickable; only a native `title` tooltip. Also add a day-cell "+" affordance to open AssignModal pre-filled with the date.
- deps: extend `getCalendarSessions()` to return address/program/assignees/check-in+out times.

**P2.2 — FOIS level-picker grid** · E med · P **high**
- OLD: `src/components/domain/FoisMeasurementCard.tsx`
- NEW target: `components/employee/measurement-form.tsx` (replace FOIS `<select>`)
- Why: a 7-option dropdown of long sentences is hard to tap on mobile; FOIS is a clinical scale that reads better as a 1–7 grid with level descriptions. Optional: FOIS trend mini-bar + history (reads existing `kpi_evaluations`, no schema change).

**P2.3 — Check-in UX** · E med · P **high**
- OLD: `src/components/domain/CheckInButton.tsx` (CheckActionConfirmModal), `src/lib/geo/geolocation.ts` (typed errors + accuracy), `EvidenceList.tsx`, `MakeSpecialButton.tsx`
- NEW target: `components/checkin/check-in-panel.tsx`; helpers into `lib/geo/`
- Why: NEW fires `getCurrentPosition` instantly on tap (no confirm), shows raw English geolocation errors, and never displays selfie/distance/accuracy — though `check_ins.selfie_url`/`distance_m`/`accuracy` + `settings.selfie_enforced` are all populated. Add: (1) confirm sheet, (2) Thai typed errors, (3) post-action timeline read-back (นัด→เช็คอิน N ม.→เช็คเอาท์), (4) selfie/evidence display, (5) เคสพิเศษ toggle (drop the OLD reassign part).
- deps: `getSessionDetail` to include the check_ins row; selfie capture itself is net-new.

**P2.4 — Report photo upload + draft autosave** · E med · P **high**
- OLD: `src/components/domain/ReportPhotoUpload.tsx`, `EvidenceList.tsx`, `ReportEditor.tsx`/`MonthlyReportEditor.tsx` (autosave)
- NEW target: `components/reports/report-photo-upload.tsx` → `report-shell.tsx` + `daily-report-sheet.tsx`
- Why: clinical reports can't attach photos (biggest reports gap), and a dropped connection at the patient's home loses the whole form. `reports` already has `draft` status + jsonb payload.
- deps: action `saveReportDraft` (RLS predicate `status='draft' AND author_id=auth.uid()`); attachments storage bucket + RLS + `signEvidenceUrl`.

**P2.5 — Approval before/after diff** · E med · P **high**
- OLD: `src/components/domain/ApprovalCard.tsx`
- NEW target: `components/staff/approvals-client.tsx`
- Why: reviewers approve "blind" — `correction_requests.requested_changes` exists in DB but `getCorrections()` drops it. Add diff + icon tile + per-action spinner.
- deps: extend `getCorrections()` to select `requested_changes` + `before_snapshot` + `created_at`. Check if a `comment`/`decision_note` column exists before wiring reviewer notes.

**P2.6 — Dashboard charts + Live Monitor** · E med–high · P **high**
- OLD: `src/components/domain/AdminCharts.tsx` (recharts ComposedChart), `app/(hr)/monitor/page.tsx` (buildLane/LaneCard), `MonitorRealtimeRefresh.tsx`, `LiveClock.tsx`
- NEW target: `components/staff/dashboard-charts.tsx` ('use client' island, dynamic import), `components/staff/live-monitor.tsx`
- Why: dashboard has no trend; "Live Monitor" is a static name+badge list, not live.
- deps: **add `recharts` to package.json** (verified absent); extend `getDashboard()` for a daily series + grouped sessions; add Supabase realtime (`postgres_changes`) subscription + `setInterval` tick. Tone down OLD ping/LED animation to flat OOCA.

### Phase 3

**P3.1 — Employee edit / disable / reset-password** · E high · P **high**
- OLD: `src/components/domain/EmployeeForm.tsx` (edit mode), `ResetPasswordButton.tsx`
- NEW target: `app/(staff)/staff/employees/[id]` (currently read-only)
- Why: no way to edit an employee, disable, or reset password. Also add list-row avatar + `is_enabled` status pill + header counts.
- deps: actions `updateEmployee`, `resetPassword` (service-role server-side, re-check role + `is_enabled()`, consistent with force-sign-out); extend `getEmployees()` to return `is_enabled`. Avatar upload blocked on `profiles.avatar_url` migration — use gradient-initial fallback meanwhile.

**P3.2 — Correction history** · E med · P **high**
- OLD: `src/app/(employee)/requests/page.tsx`, `RequestRowCard.tsx`
- NEW target: `app/(employee)/app/corrections/page.tsx` + new `components/employee/correction-history.tsx`
- Why: employee submits a correction then can't see its status (dead-end).
- deps: `getMyCorrections()` query (RLS: `employee_id = auth.uid()`).

**P3.3 — Bookings triage + lifecycle** · E low–med · P **high**
- OLD: `src/app/appointments/page.tsx` (filter chips + search), `AppointmentStatusControls.tsx` (cancel), `AppointmentConvertForm.tsx` (confirm)
- NEW target: `app/(staff)/staff/bookings/page.tsx`, `components/staff/convert-booking-button.tsx`, new `components/staff/cancel-booking-control.tsx`
- Why: no filter/search to triage; convert is one-click with no confirm; can't cancel a booking.
- deps: `cancelBooking(id, reason)` action; GET search param wiring; status-count badges from `getBookings()`.

**P3.4 — Patient detail enrichment** · E med · P **high**
- OLD: `src/app/(hr)/settings/patients/[id]/page.tsx` header
- NEW target: `app/(staff)/staff/patients/[id]/page.tsx`
- Why: detail is flat with no actions. Add header card + 3-up summary stats + quick-action cluster (จองนัด/แก้ไข/แชร์ portal) + session timeline (upcoming/past).
- deps: extend `getPatientDetail()` to include `schedule_sessions`.

**P3.5 — Relatives portal** · E med · P **high**
- OLD: `src/components/domain/PortalView.tsx` (course section + care-team), `PortalCalendar.tsx`, `SharePortalButton.tsx`
- NEW target: `app/(relatives)/r/[token]/page.tsx`, new `components/relatives/portal-calendar.tsx`, staff-side share modal on patient detail
- Why: course data shows as raw numbers (no bar); card titled "ปฏิทินคิวฝึก" renders a 5-row list; staff can't share the portal link.
- deps: extend `getRelativePortal()` to return all sessions + status + care-team (avatar/position). **Security: move phone last-4 verification to server-side** (currently compared client-side against a value sent to the browser). Gate polish: Enter-to-submit + spinner + error banner.

### Phase 4 (polish — see §2 checklist; specs abbreviated)
- **P4.1** `DateTime24Input` (OLD `src/components/forms/DateTime24Input.tsx`) → assign-modal (avoids AM/PM on Windows; replaces 4 hardcoded SLOTS). E low.
- **P4.2** Date-range CSV export route (OLD `ExportRangeForm.tsx` + `app/admin/export/*.csv/route.ts`) → `app/(staff)/.../export/[kind].csv/route.ts` (attendance/GPS/lateness). E med.
- **P4.3** Account self-edit name/phone (OLD `ProfileIdentityCard.tsx` `useOptimistic`) → `updateMyProfile` (restricted columns). E low.
- **P4.4** Report micro-UX: pill-toggle `CheckRow`, Rt/Lt paired inputs, treatment chips, vitals `fieldset/legend`. E low.
- **P4.5** `useOptimistic` cross-cutting (verified 0 uses in NEW) on approve/reject, self-edit, mark-read. E low per site.
- **P4.6** *(deferred — data-model change)* Knowledge test multiple-choice + answer key + server-side pass/fail (OLD `KnowledgeTestForm.tsx`). E high.

---

## 4. Quick-reference adoption matrix

| # | Item | OLD source | NEW target | E | P | Phase |
|---|------|-----------|-----------|---|---|-------|
| 1 | ThaiDateInput | forms/ThaiDateInput | ui/thai-date-input | low | high | 1 |
| 2 | Skeleton + loading | layout/Skeleton | ui/skeleton + loading.tsx | low | high | 1 |
| 3 | Error boundary | layout/ErrorBoundary | ui/error-fallback + error.tsx | low | high | 1 |
| 4 | Online/offline + sync | layout/OnlineBadge+OfflineSync | components/offline/* | med | high | 1 |
| 5 | Notification mark-read | layout/NotificationBell | shell/notification-bell | low–med | high | 1 |
| 6 | Animated Sheet | calendar/VisitDetailModal kf | ui/sheet | med | high | 1 |
| 7 | EmptyState primitive | domain/PlaceholderPage | ui/empty-state | low | med | 1 |
| 8 | VisitDetailModal | calendar/VisitDetailModal | staff/scheduling-calendar | med | high | 2 |
| 9 | FOIS grid | domain/FoisMeasurementCard | employee/measurement-form | med | high | 2 |
| 10 | Check-in confirm + GPS errors | domain/CheckInButton + lib/geo | checkin/check-in-panel | med | high | 2 |
| 11 | Report photo + draft autosave | domain/ReportPhotoUpload + ReportEditor | reports/* | med | high | 2 |
| 12 | Approval diff | domain/ApprovalCard | staff/approvals-client | med | high | 2 |
| 13 | Charts + Live Monitor | domain/AdminCharts + monitor/page | staff/dashboard-charts + live-monitor | med–high | high | 2 |
| 14 | Employee edit/disable/reset-pw | domain/EmployeeForm + ResetPasswordButton | staff/employees/[id] | high | high | 3 |
| 15 | Correction history | requests/page + RequestRowCard | employee/corrections | med | high | 3 |
| 16 | Bookings filter/cancel/convert | appointments/page + AppointmentStatusControls | staff/bookings | low–med | high | 3 |
| 17 | Patient detail header | settings/patients/[id] | staff/patients/[id] | med | high | 3 |
| 18 | Relatives portal bar/calendar/share | domain/PortalView + PortalCalendar | relatives/* | med | high | 3 |
| 19 | DateTime24Input | forms/DateTime24Input | ui/datetime24-input | low | med | 4 |
| 20 | Date-range CSV export | domain/ExportRangeForm + export routes | staff export route | med | med | 4 |
| 21 | Account self-edit | domain/ProfileIdentityCard | (employee)/account | low | med | 4 |
| 22 | Report micro-UX | domain/ReportEditor + CheckRow | reports/clinical-forms | low | med | 4 |
| 23 | useOptimistic pattern | NotificationBell/ApprovalCard | (cross-cutting) | low | med | 4 |
| 24 | Knowledge MC + scoring | domain/KnowledgeTestForm | measurement-form/editor | high | low | 4 (deferred) |

---

## 5. Porting playbook (read before any port)

### 5.1 Design-token remap (the main cost of every port)
OLD writes arbitrary classes over raw vars; NEW exposes semantic utilities via `tailwind.config.ts` + `app/globals.css`. Re-express with NEW primitives (`Card`/`Badge`/`Button`/`Field`/`Sheet`/`DataTable`) — **do not copy OLD class soup.**

| OLD | NEW |
|-----|-----|
| `--line` | `border` |
| `--surface-2`, `--surface-sunk` | `surface-sunken` |
| `--ink` | `text` / `ink` |
| `--ink-soft` | `text-muted` |
| `--ink-mute` | `text-faint` |
| `--primary-soft`, `--primary-tint` | `surface-tint` |
| `--danger-soft` | `danger-bg` / `text-danger-fg` |
| `--radius`, `--radius-sm` | `rounded-lg` / `rounded-md` |
| `--radius-lg` | `rounded-2xl` |
| diagnosis colours | `--dx-stroke/parkinson/dementia/als/ms/other` |

### 5.2 Stack differences
- **Tailwind v4 → v3:** OLD uses v4 arbitrary vars + px font sizes. Good news: OLD animation/modal keyframes are inline `<style>` (no `tailwindcss-animate` dependency); `animate-pulse`/`animate-spin` are core v3; arbitrary variants (`[&::-webkit-calendar-picker-indicator]`) compile in v3. **No new Tailwind plugin needed.**
- **Dark mode:** NEW is light-only — drop every `data-theme`/`colorScheme`/`ThemeToggle` that rides along (esp. profile, settings, primitives).
- **next-intl:** strip `usePortalT`/`PORTAL_MONTHS`/`PortalLangProvider` — inline Thai + `lib/date/buddhist.ts`.
- **Recharts:** NOT in `package.json` (verified). Add `recharts` before P2.6; keep in a `'use client'` island + dynamic import (~100kb).
- **Next 16 (OLD) vs 15 (NEW) / React 19:** both React-19 era — `useOptimistic`/`useActionState`/`useTransition` port directly; verify `useOptimistic` before relying on it (fallback = plain pending state). `redirect()` in server actions throws `NEXT_REDIRECT` — let success redirects propagate but render real errors.

### 5.3 Security / RLS (not pure UI — must hold)
- Draft report rows must satisfy `status='draft' AND author_id=auth.uid()`.
- `resetPassword`/`updateEmployee` — re-check role + `is_enabled()`, service-role server-side only, consistent with force-sign-out.
- Relatives portal phone verify → **move to server-side**.
- `no-console`: route OLD `console.error`/empty catches through the project logger.
- `raw <img>` → `next/image`.

---

## 6. Out of scope — do NOT port (NEW lacks the feature)

- **Dark mode / theme switching** (`ThemeProvider`/`ThemeScript`/`ThemeToggle`).
- **Leave system** (removed in v3; leave_requests, BalanceTile, leave-type chips, leave-conflicts banner, leave.csv deferred to a later unified HR module).
- **Supervisor role / team views** (not in v3 scope; team-calendar/measurements/stress, two-stage supervisor approval routing, supervisor-scoped realtime, "หัวหน้างาน" field).
- **Broadcast / ประกาศ.**
- **Multi-assignee / co-assign / workload** (`AssignMenu`, multi-employee picker, coassign).
- **Course-package & program CRUD** (settings/course-packages/*, settings/programs/*, `CoursePackageForm`, `ProgramForm`, segmented `CourseProgressBar`, `MonthlyReportPicker`/`SummaryReportPicker`).
- **Stress-template builder with scored bands** (`StressTemplateForm`/`Actions`) — NEW director editor manages a flat knowledge-question list only.
- **House abstraction + GPS coords on patient** (`HouseForm`, `HouseDiagnosisPanel`).
- **Patient pipeline lifecycle stages** (`PatientPipelineCard`).
- **Assessment queue + visit-creation-on-convert** (`AssignAssessmentForm`, convert pre-scheduling employee picker).
- **Old shell architecture** (`AppShell`/`AppScrollReset` fixed-h-dvh inner-scroll; `ServiceWorkerRegister` — Serwist auto-registers).
- **NotificationBell `KIND_META`** (leave/broadcast/supervisor kinds removed in v3) — port only the kind-agnostic mark-read.
- **Fields with no NEW column:** department, work_start/end, hire_date, license_type/expiry (roles in v3 are exactly director/admin/employee, no role selector in forms), OLD SettingsForm extras (smart_alert_minutes, overdue_minutes, special_rate_multiplier, stress_assessment_*).
- **next-intl / language toggle / PortalLangProvider.**

---

## 7. Consolidated non-UI work (must accompany the ports)

**New server actions:**
`markNotificationRead`, `markAllNotificationsRead`, `saveReportDraft`, `updateEmployee`, `resetPassword`, `updateMyProfile`, `cancelBooking`, `setSessionSpecial`, `signEvidenceUrl`, `getMyCorrections`, `subscribePortalPushAction` *(P9.5 roadmap only)*.

**Query extensions (lib/data/queries.ts):**
- `getCalendarSessions` → + address/program/assignees/check-in+out
- `getCorrections` → + requested_changes/before_snapshot/created_at
- `getSessionDetail` → + check_ins row
- `getPatientDetail` → + schedule_sessions
- `getDashboard` → + daily series + grouped sessions
- `getRelativePortal` → + all sessions+status + care-team
- `getEmployees` → + is_enabled
- `getBookings` → + status counts

**Migrations / infra:**
- `profiles.avatar_url` (for avatar upload)
- bookings columns if richer create is wanted (scheduled_at/caregiver/address/notes)
- attachments storage bucket + RLS (report photos/evidence) — mirror the `branding` bucket pattern
- possibly a `correction_requests` comment column (verify first)
- `recharts` dependency
- relatives-scoped push table *(P9.5 only)*

**Server-side moves / security:**
- relatives portal phone verification → server action
- evidence URLs → signed via service role

---

## 8. Sequencing notes
- Phase 1 is pure additive/foundational and unblocks everything else — do it as one batch.
- Within Phase 2/3, an item is "UI-ready" only after its query extension lands; pair each UI PR with its query/action (see §7).
- `recharts` + realtime (P2.6) and migrations (P3.1 avatar, P2.4 attachments) are the only items needing dependency/infra changes — schedule those deliberately.
- Re-verify each "currently missing" claim at implement-time (codebase moves); the high-confidence verified gaps are: no loading/error states, no `useOptimistic`, no `markRead` action, `recharts` absent, relatives verify client-side.
