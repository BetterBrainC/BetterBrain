-- ── Unify the booking pipeline into patients (ผู้รับบริการ) ─────────────────
-- Client v3 flow: the "การทำนัด" page and the "ผู้รับบริการ" page are two views
-- of the SAME recipient record, split only by an appointment/booking status.
--   • bookings page  → recipients not yet booked (รอชำระเงิน / รอทำนัด / ยกเลิกนัด)
--   • patients page  → recipients that are booked (ทำนัดแล้ว)
-- The separate `bookings` table is retired (kept in place, no longer written to).

-- New pipeline state: รอทำนัด (awaiting_appointment). Safe to run inside the
-- migration transaction: the new value is only used at runtime, never in DDL
-- below (the column default 'booked' is a pre-existing value).
alter type booking_status add value if not exists 'awaiting_appointment';

-- Appointment/booking status lives on the recipient now. Existing recipients are
-- already confirmed → default 'booked' so they keep showing on the patients page.
alter table public.patients
  add column if not exists appointment_status booking_status not null default 'booked';

create index if not exists idx_patients_appointment_status
  on public.patients(appointment_status);

-- Carry forward existing, not-yet-converted booking leads so the current
-- "การทำนัด" list survives the switch. Converted bookings (patient_id set)
-- already have a patients row, so they are skipped.
insert into public.patients (full_name, phone, address, referral_source, appointment_status, consent_intake, created_by, created_at)
select b.full_name, b.phone, b.area, 'booking', b.status, false, b.created_by, b.created_at
from public.bookings b
where b.patient_id is null;
