/**
 * Appointment time slots offered across the scheduling UI (assign, reschedule,
 * intake first-assessment). One-hour visits starting every 30 minutes from
 * 08:00 to 18:00 including the midday slots (11:30 / 12:00 restored per client
 * review 22 ก.ค. 2569). Stored/parsed as "HH:MM-HH:MM" (Asia/Bangkok) by
 * createAssignment.
 */
export const APPOINTMENT_SLOTS = [
  "08:00-09:00",
  "08:30-09:30",
  "09:00-10:00",
  "09:30-10:30",
  "10:00-11:00",
  "10:30-11:30",
  "11:00-12:00",
  "11:30-12:30",
  "12:00-13:00",
  "12:30-13:30",
  "13:00-14:00",
  "13:30-14:30",
  "14:00-15:00",
  "14:30-15:30",
  "15:00-16:00",
  "15:30-16:30",
  "16:00-17:00",
  "16:30-17:30",
  "17:00-18:00",
] as const;
