# TPM — Design System

> **Client review v3 (2026-06-14) — applied.** Labels: **ผู้รับบริการ** (not ผู้ป่วย); roles **Director / Admin / พนักงาน**; reports **Assessment / Follow up / Summary**; employee course progress = **bar-only**; relatives **phone-verify** gate + **วิธีออกกำลังกาย**. Background blue tone + blue/teal buttons (current). **Synnis** brand (green theme) = separate project.

**Better Brain Rehab at Home** | In-home swallowing & neuro rehab back-office.
**Direction:** OOCA-inspired — clean, light, high-whitespace, `rounded-2xl` cards, one confident blue CTA per surface, teal active-nav accent. Brand: navy headings, sky-blue secondary, orange as the single sparing accent (mirrors the lone orange epiglottis in the logo).

Verified against ground truth: `flow/S__362397734_0.jpg` (logo: navy head outline + sky-blue swallow pathway + single orange epiglottis + silver gradient wordmark) and `flow/1.jpg`/`flow/2.jpg` (OOCA: white canvas, `#EAF2FF` soft-blue card, single blue pill CTA "ค้นหาผู้ให้คำปรึกษา", **teal active bottom-nav item "การนัดหมาย"** vs gray siblings, sun+cloud illustration empty state, large whitespace).

---

## 1. Design tokens — `:root`
```css
:root {
  /* BRAND (hex locked by brief + verified logo) */
  --bb-navy:#1B3A6B; --bb-navy-700:#16315A; --bb-navy-900:#0F2645;
  --primary:#2F7FF6; --primary-600:#1F6BE0; --primary-700:#1857BE; --primary-300:#8FBDFB;
  --sky:#4AA3E0; --sky-600:#3990D0;
  --teal:#14B8A6; --teal-600:#0E9E8E;           /* ACTIVE NAV accent only */
  --accent:#F5A623; --accent-600:#DB8E10; --accent-700:#B5740B;  /* orange — sparing */
  --silver:#9AA7B8;

  /* SURFACES & NEUTRALS */
  --bg:#F7FAFC; --surface:#FFFFFF; --surface-tint:#EAF2FF; --surface-tint-2:#F0F6FF;
  --surface-sunken:#EEF3F8; --overlay:rgba(15,38,69,.48);
  --text:#1F2A37; --text-muted:#6B7280; --text-faint:#9AA7B8;
  --text-on-fill:#FFFFFF; --text-on-accent:#3A2A05;
  --border:#E3E9F0; --border-strong:#CBD5E1; --border-focus:#2F7FF6;

  /* STATUS triplets (-fg on -bg ≥ 4.5:1; -solid = dot/rail) */
  --status-late-fg:#B5740B;       --status-late-bg:#FEF1DC;       --status-late-solid:#F5A623;     /* สาย */
  --status-nocheckin-fg:#B42318;  --status-nocheckin-bg:#FEECEB;  --status-nocheckin-solid:#E5544B;/* ไม่ได้เช็คอิน */
  --status-skipped-fg:#5B647A;    --status-skipped-bg:#EEF1F6;    --status-skipped-solid:#94A0B5;  /* งด */
  --status-early-fg:#1857BE;      --status-early-bg:#EAF2FF;      --status-early-solid:#2F7FF6;    /* ออกก่อนเวลา */
  --status-completed-fg:#0E7C6B;  --status-completed-bg:#DDF4EF;  --status-completed-solid:#14B8A6;/* จบเคส */
  --status-hold-fg:#8A5A00;       --status-hold-bg:#FBEFD2;       --status-hold-solid:#E0A330;     /* Hold */
  --status-noservice-fg:#475467;  --status-noservice-bg:#E7EBF1;  --status-noservice-solid:#697586;/* No service */

  --success-fg:#0E7C6B; --success-bg:#DDF4EF; --warning-fg:#B5740B; --warning-bg:#FEF1DC;
  --danger-fg:#B42318; --danger-bg:#FEECEB; --info-fg:#1857BE; --info-bg:#EAF2FF;
  --booking-booked-fg:#1857BE; --booking-booked-bg:#EAF2FF;       /* ทำนัดแล้ว */
  --booking-awaitpay-fg:#B5740B; --booking-awaitpay-bg:#FEF1DC;   /* รอชำระเงิน */
  --booking-cancel-fg:#B42318; --booking-cancel-bg:#FEECEB;       /* ยกเลิกนัด */
  --dx-stroke:#2F7FF6; --dx-parkinson:#14B8A6; --dx-dementia:#7C6CF0;
  --dx-als:#4AA3E0; --dx-ms:#E08A2B; --dx-other:#94A0B5;

  /* SPACING (4px base) */
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;
  --space-8:32px;--space-10:40px;--space-12:48px;--space-16:64px;--space-20:80px;
  --gutter-page:clamp(16px,4vw,32px); --gutter-section:clamp(24px,5vw,48px);
  --card-pad:20px; --touch-min:48px;

  /* RADIUS (rounded-2xl feel) */
  --radius-xs:6px;--radius-sm:10px;--radius-md:14px;--radius-lg:20px;--radius-xl:28px;--radius-pill:999px;

  /* TYPOGRAPHY (Thai-first) */
  --font-sans:"Prompt","Noto Sans Thai","LINE Seed Sans TH",-apple-system,"Segoe UI",system-ui,sans-serif;
  --font-display:"Prompt","Noto Sans Thai",sans-serif;
  --font-num:"Prompt","Inter",system-ui,sans-serif;
  --text-2xs:11px;--lh-2xs:16px; --text-xs:12px;--lh-xs:18px; --text-sm:14px;--lh-sm:22px;
  --text-base:16px;--lh-base:26px; --text-lg:18px;--lh-lg:28px; --text-xl:22px;--lh-xl:32px;
  --text-2xl:28px;--lh-2xl:38px; --text-3xl:clamp(30px,4vw,40px); --text-stat:clamp(34px,6vw,52px);
  --weight-regular:400;--weight-medium:500;--weight-semibold:600;--weight-bold:700;
  --tracking-tight:-0.01em; --tracking-wide:0.04em;  /* wide = Latin only */

  /* SHADOWS (soft, navy-tinted) */
  --shadow-xs:0 1px 2px rgba(27,58,107,.06);
  --shadow-sm:0 2px 8px rgba(27,58,107,.06),0 1px 2px rgba(27,58,107,.04);
  --shadow-md:0 8px 24px rgba(27,58,107,.08),0 2px 6px rgba(27,58,107,.05);
  --shadow-lg:0 16px 40px rgba(27,58,107,.12),0 4px 12px rgba(27,58,107,.06);
  --shadow-pop:0 24px 64px rgba(15,38,69,.18);
  --shadow-focus:0 0 0 3px rgba(47,127,246,.35); --shadow-primary:0 6px 16px rgba(47,127,246,.28);

  /* MOTION */
  --dur-instant:80ms;--dur-fast:140ms;--dur-normal:220ms;--dur-slow:360ms;--dur-cele:520ms;
  --ease-standard:cubic-bezier(0.2,0,0,1); --ease-out-expo:cubic-bezier(0.16,1,0.3,1);
  --ease-spring:cubic-bezier(0.34,1.56,0.64,1);

  /* LAYERING + CHROME */
  --z-sticky:100;--z-bottomnav:200;--z-fab:250;--z-drawer:300;--z-overlay:400;--z-modal:500;--z-toast:600;
  --bottomnav-h:64px;--header-h:56px;--sidebar-w:264px;--content-max:1240px;
}
@media (prefers-reduced-motion: reduce){
  :root{--dur-instant:0ms;--dur-fast:0ms;--dur-normal:0ms;--dur-slow:0ms;--dur-cele:0ms;}
}
```

**Status rationale (color encodes business consequence):** สาย = orange (the one earned accent — most common actionable anomaly); ไม่ได้เช็คอิน = red (financial weight, excluded from work hours); งด = slate (a non-event, must read calm); ออกก่อนเวลา = blue (informational, surfaced on Live Monitor); จบเคส/completed = teal (brand positive, echoing nav + completion).

---

## 2. Typography — Thai pairing
**Google Sarabun** (looped/มีหัว Thai-first humanist sans; used for both UI/body and display/headings — client-requested for readability, replaces the earlier loopless Prompt). One family keeps Thai labels + Latin clinical abbreviations (BP, HR, SpO2, FOIS, DM, HT, U/D, ADL) and numerals consistent. Fallback ladder: Noto Sans Thai Looped → Noto Sans Thai → LINE Seed Sans TH → system Thai. Loaded via `next/font` (self-hosted woff2 at build), subset thai+latin, weights 300–700, `font-display:swap`.

| Role | Family/Weight | Size/LH |
|---|---|---|
| Page title (พ.ศ. dates) | Prompt 700 | 2xl |
| Section heading | Prompt 600 | xl |
| Card title | sans 600 | lg |
| Body (PWA min 16px) | sans 400 | base |
| Form labels / secondary | sans 500 | sm (muted) |
| Table cell | sans 400 | sm (tabular nums) |
| Big KPI number | num 700 | stat (tabular-nums) |
| Caption / audit meta | sans 400 | xs/2xs (faint) |
| Latin ALL-CAPS micro-label | sans 600 | 2xs (wide; Latin only) |

Thai rules: never `letter-spacing` Thai runs (breaks tone-mark stacking); taller leading than Latin; render BE years as formatted strings.

---

## 3. Component inventory
Every interactive element ≥48px on PWA, ≥40px on dense desktop tables.

- **Buttons:** Primary pill (`--primary`, `--radius-pill`, `--shadow-primary`, 52px PWA / 44px desktop — one per surface); Secondary (surface + border, navy text); Tonal (`--surface-tint` + `--primary-700`); Ghost/text; Destructive (tonal danger; solid red only in confirm modal); Icon button (silver→primary); FAB ("+ บันทึก / check-in", 56px). States: default/hover/active/focus-visible (`--shadow-focus`)/disabled/loading/**offline-queued**.
- **Cards (rounded-2xl):** Base (`--surface`,`--radius-lg`,`--shadow-sm`); Info/hero (`--surface-tint`,`--radius-xl`, illustration slot); Patient card (left status rail, navy name, dx chip, course-progress mini-bar, status badge, **address + training-program line for employees**); Stat card. One elevation tier per region.
- **Status badges:** pill, leading dot (`--status-*-solid`), `--status-*-bg`/`-fg`, always paired with the Thai word (never color-only): สาย / ไม่ได้เช็คอิน / งด / ออกก่อนเวลา / จบเคส / Hold / No service + booking states.
- **Calendar cells:** Staff (Admin/Director) monthly assignment day cell (≥88×96px, BE day number, stacked assignment chips with patient+time+employee avatar; today = tint + primary ring; special-case (เคสพิเศษ) = orange corner flag; drag-target = dashed primary). Employee day/week/month views (time-slot column + patient card; status rail color; done rows fade). Relatives = read-only month, interaction disabled.
- **Check-in button (signature component) state machine:** idle "เช็คอินเข้างาน" → locating → in-range (teal ✓ "อยู่ในระยะ") → out-of-range (orange tonal "อยู่นอกระยะ 1 กม. (ห่าง 1.4 กม.)" + "ขอแก้ไขเช็คอิน") → late (สาย preview) → selfie-required (camera sheet) → submitting → success (spring pop) → **offline-queued ("บันทึกแล้ว • จะส่งเมื่อมีสัญญาณ", striped warning rail until sync)**. Live distance + map mini-preview with 1 km radius. Check-out mirrors it (button "เช็คเอาท์") and **on success immediately opens the Daily report bottom sheet**; shows an "ออกก่อนเวลา" warning if early.
- **Report form fields (schema-driven jsonb):** text/textarea (48px, label above, helper/error below); vital-sign group (unit chips mmHg/bpm/%/°C; before/after paired columns for Daily); checkbox/radio sets (Underlying, Mobility, Consciousness); trial steppers (Direct Test 2.1/2.2/2.3 segmented chips 1st–5th, 3/5/10/20/50 ml, with stop/continue gates); sensory/perception R/L matrix with I/Imp/A/NT segmented selector; **FOIS 7-level selector** (also on the Monthly report); signature pad + license (auto from profile) + BE date; **check-in gate banner** ("ต้องเช็คอินก่อนจึงจะบันทึกได้") on Assessment+Daily only; autosave/offline draft chip.
- **Data tables (staff):** sticky header (`--surface-sunken`), 48px rows, subtle zebra, right-aligned tabular numerals, sticky first column, hover tint, inline badges, overflow row actions, toolbar (search + filter chips: status/dx/employee/month-พ.ศ. + Export). Empty/loading(skeleton)/error states; density toggle.
- **Stat cards (Live Monitor):** the four required tiles — เคสทั้งหมด / เช็คอินแล้ว+% / กำลังทำ / รออยู่ในวงรอบ — plus working/late/left-early counts + entry-exit sparkline. Big tabular number, delta chip (teal/red), accent orange only on alert cards (คอร์สใกล้หมด).
- **Bottom nav (employee PWA):** 5 items, idle silver + faint label, **active = teal icon+label + 3px teal top-bar** (OOCA behavior), center = check-in/บันทึก. Items: หน้าหลัก · ตารางงาน · เช็คอิน · การวัดผล · บัญชี.
- **Modals & sheets:** desktop centered (`--radius-xl`,`--shadow-pop`); PWA bottom sheet (drag handle, full-height for long forms); focus-trapped. Used for: confirm งด, **substitute picker (จัดเวรแทน)**, correction, ครบคอร์ส choice (Continue/No service), selfie capture, approval review.
- **Approval cards (Director; Admin follow-up):** requester + request-type chip (แก้ไขเช็คอิน) + BE timestamp; **before→after diff block** (old struck, new highlighted); footer อนุมัติ (teal) / ไม่อนุมัติ (destructive tonal) + required reject reason. After Director approves a correction → transforms to "รอ Admin ดำเนินการแก้ไข" in Admin's queue with an audit link. Every action stamps the audit log.

---

## 4. Key screen layouts

**Employee PWA (≤480px):**
- **Home:** greeting + BE date + small mascot; hero tint card (today's status "วันนี้มี 4 คิว · เช็คอินแล้ว 1"); next-session card with prominent check-in; quick tiles (คิววันนี้/รายงานค้าง); KPI nudge ("ยังไม่ทำแบบประเมินความเครียดปีนี้"); illustration empty state + single blue pill.
- **Schedule:** day/week/month switcher (BE) — all three views required; time-slot list; done sessions fade; งด = slate badge no CTA; own เคสพิเศษ (extra-pay) sessions visible (self only).
- **Patient detail:** header card with name, age, dx chip, **status badge**, **address + training program** (employee needs them), course progress bar (used/remaining/bonus, alert at 9/0). Tabs: ข้อมูล / ประเมิน / รายงาน / KPI. Completed reports gone from view → "ส่งรายงานแล้ว" placeholder.
- **Check-in / Report / Measurement** per §3 components; การวัดผล hub combines own patient-KPI entry + own stress/knowledge.

**Staff (Admin + Director, shared sidebar):**
- **Live Monitor (shared, identical):** four KPI tiles + realtime working/late/left-early + entry-exit graph (subscribes to schedule_sessions/check_ins).
- **Monthly assignment calendar (core):** patient picker rail → select employee (slots + conflicts) → drop sessions across the month (hospital-queue); any session can be flagged special-case (เคสพิเศษ — manual amount).
- **Booking intake / Admin manual entry:** native form + status pipeline (ทำนัดแล้ว/รอชำระเงิน/ยกเลิกนัด); convert booking → appointment → assessment.
- **Patient CRUD / employees** (with employee_code/department/position/employment_type/license) / **therapist schedule (ตารางแพทย์: name/license/date/location)** / **การวัดผลของทีม** / reports (Admin sees completed) / exports. Admin check-in editing locked until Director-approved correction (visible disabled-with-reason).
- **Director-only:** approvals (corrections with before→after diffs), audit log, settings, users (Director cap 2).

**Relatives portal (warmest tone):** single calm column; therapist brief card (photo+name+role); ปฏิทินคิวฝึก read-only (BE); course summary tint card (total + bonus + remaining as a progress ring); training reports list; reminder note (1-day-before, course-ending). Largest type (elderly readers).

---

## 5. Accessibility (WCAG 2.2 AA)
Contrast verified: body `#1F2A37` on white ≈13.6:1; `--text-muted` ≈5.0:1; `--text-faint` only ≥18.66px/bold or non-essential; `--primary` text fails normal → fills/large-bold only (white on primary ≈4.9:1 passes); orange never as text on white (use `--accent-700` ≈4.6:1; orange fill uses dark text); each `--status-*-fg` on its `-bg` ≥4.5:1; focus ring ≥3:1. **Never color-only (1.4.1):** every status = Thai word + dot/icon; charts use labels/patterns. Touch targets ≥48px PWA (bottom-nav 64px, check-in 52px). Visible `:focus-visible`; sticky chrome doesn't obscure focus (scroll-padding for header + bottom-nav); skip link; modal focus trap+restore. Forms: `<label for>`, `aria-describedby`, `aria-invalid`, errors in text; no timeout losing unsaved report (autosave). Admin drag-to-assign has a non-drag fallback (assign button + cell picker). `prefers-reduced-motion` zeroes durations; จบเคส celebration degrades to instant ✓. 200% text resize; `lang="th"`; offline/queued announced via `aria-live="polite"`.

---

## 6. Anti-template guidance (TPM-specific)
1. **Lead with the queue, not a table** — the employee's reality is a timeline of home visits; primary surface is a day/week/month time-slot view with status rails + live check-in, plus the OOCA hero-card-with-one-blue-pill signature.
2. **Orange is sacred** — `--accent` only for the single most actionable anomaly per screen (สาย, course-ending). Two oranges = a bug.
3. **Status as identity** — สาย/ไม่ได้เช็คอิน/งด/ออกก่อนเวลา/จบเคส/Hold/No service drive rails, fades, sort order, with emotional tuning (skipped = calm slate; no-checkin = financial red).
4. **Clinical depth ≠ noise** — long Swallowing/Hand forms render as guided, gated, sectioned flows (Indirect→Direct steppers, FOIS L1–L7 picker, R/L sensory matrix), bespoke to the source forms.
5. **พ.ศ. everywhere, Thai-first copy** (พนักงาน, จบเคส, ไม่ได้เช็คอิน) — unmistakably local.
6. **The "จบเคส" moment is designed** — short spring on save (reduced-motion safe), then the report vanishes (RLS) — an intentional, unusual UX rule.
7. **Three role-shaped homes, one system** — Employee = mobile timeline; Admin+Director = shared Live Monitor + monthly assignment calendar (hospital-queue metaphor); Director adds approvals-with-before/after-diffs; Relatives = warmest reassurance portal.
8. **Soft, blue-tinted depth** — navy-tinted gentle shadows, large radii, breathing room; tints carry hierarchy instead of heavy borders; one elevation tier per region.

Source grounding: form fields `F:\tmp\docx_extract.txt`; palette/feel verified in `flow/1.jpg`+`flow/2.jpg` (OOCA) and `flow/S__362397734_0.jpg` (logo: navy + sky-blue swallow pathway + single orange epiglottis + silver wordmark).
