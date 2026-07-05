/**
 * Thai dictionary — the single place for user-facing strings/status labels.
 * Terminology (client 3.pdf 14/6): roles = Director / Admin / Employee,
 * ผู้รับบริการ (not ผู้ป่วย), "ไม่ได้เช็คอิน" (not "ไม่มา"), "จบเคส" on save.
 */

export const ROLE_LABEL = {
  employee: "พนักงาน",
  admin: "Admin",
  director: "Director",
} as const;

export const SESSION_STATUS_LABEL = {
  scheduled: "นัดไว้",
  in_progress: "กำลังทำ",
  attended: "เข้าฝึกแล้ว",
  late: "สาย",
  completed: "จบเคส",
  no_checkin: "ไม่ได้เช็คอิน",
  skipped: "งด",
  rescheduled: "เลื่อนนัด",
  cancelled: "ยกเลิก",
  corrected: "แก้ไขแล้ว",
} as const;

export const BOOKING_STATUS_LABEL = {
  booked: "ทำนัดแล้ว",
  awaiting_payment: "รอชำระเงิน",
  awaiting_appointment: "รอทำนัด",
  cancelled: "ยกเลิกนัด",
} as const;

export const PATIENT_STATUS_LABEL = {
  active: "กำลังให้บริการ",
  hold: "พักชั่วคราว (Hold)",
  no_service: "จบคอร์ส (No service)",
} as const;

export const COURSE_STATUS_LABEL = {
  on_process: "กำลังดำเนินการ",
  hold: "พักชั่วคราว",
  course_complete: "ครบคอร์ส",
  no_service: "ไม่ต่อคอร์ส",
} as const;

export const REQUEST_STATUS_LABEL = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  applied: "ดำเนินการแล้ว",
  cancelled: "ยกเลิก",
} as const;

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  login: "เข้าสู่ระบบ",
  logout: "ออกจากระบบ",
  create: "สร้าง",
  update: "แก้ไข",
  delete: "ลบ",
  check_in: "เช็คอิน",
  check_out: "เช็คเอาท์",
  approve: "อนุมัติ",
  reject: "ไม่อนุมัติ",
  apply_correction: "ดำเนินการแก้ไข",
  password_change: "เปลี่ยนรหัสผ่าน",
  export: "ส่งออกข้อมูล",
};

export const DIAGNOSIS_LABEL = {
  stroke: "Stroke",
  parkinson: "Parkinson",
  dementia_alzheimer: "Dementia / Alzheimer",
  als: "ALS",
  ms: "MS",
  other: "อื่นๆ",
} as const;

/** Functional Oral Intake Scale (FOIS) — 7 levels (client wording, 3.pdf p.8). */
export const FOIS_LABEL = {
  L1: "ระดับ 1 · ให้อาหารทางสายยาง ยังไม่อนุญาตให้รับประทานทางปาก",
  L2: "ระดับ 2 · ให้อาหารทางสายยาง แต่ทดลองกลืนน้ำข้นหนืด/อาหารปั่นครั้งละเล็กน้อย",
  L3: "ระดับ 3 · รับประทานอาหารปั่น/น้ำข้นหนืดสม่ำเสมอ แต่ยังเสริมสายยาง",
  L4: "ระดับ 4 · รับประทานอาหารปั่นละเอียดทั้งหมด ทางปาก 100%",
  L5: "ระดับ 5 · รับประทานอาหารบดหยาบ/สับละเอียด ต้องเตรียมพิเศษ",
  L6: "ระดับ 6 · รับประทานอาหารเป็นชิ้นเนื้อนุ่ม แต่เลี่ยงอาหารแข็ง/เหนียว/ร่วน",
  L7: "ระดับ 7 · รับประทานอาหารและน้ำได้เหมือนปกติ",
} as const;

/** Report types — 3 (client 3.pdf p.7/p.11): Assessment · Follow up · Summary. */
export const REPORT_LABEL = {
  assessment: "ประเมินแรกรับ (Assessment)",
  followup: "บันทึกรายวัน (Follow up)",
  summary: "ความก้าวหน้ารายเดือน (Summary report)",
} as const;

export const APP = {
  name: "TPM",
  org: "Better Brain Rehab at Home",
  tagline: "ระบบจัดการพนักงานและคอร์สกายภาพบำบัด",
} as const;
