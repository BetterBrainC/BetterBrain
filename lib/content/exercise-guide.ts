/**
 * Home-exercise guide shown in the relatives portal ("วิธีออกกำลังกาย").
 *
 * Editable by the Director via `settings.extra.exercise_guide` (an array of
 * `{ title, detail }`); this curated list is the fallback when none is set, so
 * the section always shows real, useful content. Swallowing-rehab focused to
 * match Better Brain Rehab at Home.
 */
export interface ExerciseGuideItem {
  title: string;
  detail: string;
}

export const DEFAULT_EXERCISE_GUIDE: ExerciseGuideItem[] = [
  {
    title: "บริหารริมฝีปากและแก้ม",
    detail:
      "ห่อปากทำเสียง 'อู' ค้าง 5 วินาที สลับยิงฟันทำเสียง 'อี' ทำ 10 ครั้ง · ทำให้กล้ามเนื้อรอบปากแข็งแรง ช่วยกักอาหารไม่ให้ไหลออก",
  },
  {
    title: "บริหารลิ้น",
    detail:
      "แลบลิ้นตรง–ขึ้น–ลง–ซ้าย–ขวา ค้างทิศละ 3 วินาที และดันลิ้นกับไม้กดลิ้น/ช้อน ทำ 10 ครั้ง · เพิ่มแรงดันอาหารไปคอ",
  },
  {
    title: "ฝึกกลืนแบบออกแรง (Effortful swallow)",
    detail:
      "กลืนน้ำลายโดยเกร็งคอและบีบกล้ามเนื้อคอให้แรงกว่าปกติ ทำ 5–10 ครั้ง · ช่วยกวาดอาหารตกค้างในลำคอ",
  },
  {
    title: "ท่ายกศีรษะ (Shaker exercise)",
    detail:
      "นอนหงายราบ ยกศีรษะมองปลายเท้าโดยไม่ยกไหล่ ค้าง 10 วินาที พัก 10 วินาที ทำ 3 รอบ · เสริมกล้ามเนื้อเปิดหลอดอาหาร (ปรึกษานักบำบัดก่อนหากมีปัญหาคอ/หลัง)",
  },
  {
    title: "ออกเสียงยืดยาว",
    detail:
      "หายใจเข้าเต็มที่แล้วออกเสียง 'อา' ให้ยาวและดังสม่ำเสมอ 5 ครั้ง · ฝึกการปิดของกล่องเสียงเพื่อกันสำลัก",
  },
  {
    title: "ข้อควรระวังเรื่องการกิน",
    detail:
      "นั่งตัวตรง 90 องศาขณะกินและหลังกินอย่างน้อย 30 นาที · กินคำเล็ก ช้า ๆ · ปรับความข้นอาหารตามที่นักบำบัดแนะนำ · หยุดทันทีหากไอ/สำลักบ่อย แล้วแจ้งทีมผู้ดูแล",
  },
];
