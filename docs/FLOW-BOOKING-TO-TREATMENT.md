# Flow: Booking → Assessment → Treatment

ไดอะแกรมนี้แสดง lifecycle ตั้งแต่ลูกค้าสนใจจนถึงการรักษารายเดือน

## ภาพรวม

```mermaid
flowchart TD
    A1([ลูกค้ากรอกฟอร์ม\n/booking public]) --> B
    A2([Admin สร้างการจอง\nNewBookingModal]) --> B

    B[(bookings\nstatus: booked / awaiting_payment)]

    B --> C{Admin\nดำเนินการ}

    C -->|convertBookingToPatient| D
    C -->|สร้าง patient โดยตรง\n/staff/patients/new| D

    D[(patients\nชื่อ + เบอร์ขั้นต่ำ)]

    D --> E{กรอก intake}
    E -->|Admin กรอกเอง| F
    E -->|ส่ง registration link\nให้ญาติกรอก 14 วัน| F

    F[(patients\nข้อมูลครบ: ที่อยู่, ประวัติโรค,\nโปรแกรมฝึก, ผู้ติดต่อฉุกเฉิน)]

    F --> G[/staff/assign\nAssignModal\nkind = assessment]

    G -->|createAssignment| H
    G -->|upsert| I

    H[(schedule_sessions\nkind: assessment\nstatus: scheduled)]
    I[(patient_assignments\nพนักงาน → patient\nRLS access)]

    H --> J[Employee App\n/app/schedule]
    I --> J

    J --> K{Check-in\nGPS ≤ 1 km}
    K -->|ผ่าน| L[ทำ Assessment\nSwallowing / Hand Function]
    K -->|ไม่ผ่าน / ไม่ได้เช็คอิน| M([status: no_checkin\nไม่นับ session])

    L --> N[บันทึก Assessment Report\nreport_type: assessment_swallow\n           assessment_hand]

    N --> O{ลูกค้าตัดสินใจ}
    O -->|ซื้อคอร์ส| P[Admin สร้าง course\n10+1 / 30 sessions]
    O -->|ไม่ซื้อ| Q([จบ — ไม่มี course]  )

    P --> R[assign treatment sessions\nรายเดือน /staff/assign\nkind = treatment]
    R --> S[วงรอบการรักษา\ncheck-in → Follow up report\nจนครบคอร์ส → Summary report]
```

---

## ตารางเปรียบเทียบ: Assessment vs Treatment Session

| | Assessment | Treatment |
|--|--|--|
| `kind` | `assessment` | `treatment` |
| ต้อง check-in | ✅ | ✅ |
| Report type | `assessment_swallow` หรือ `assessment_hand` | `followup` (รายวัน) + `summary` (รายเดือน) |
| นับ session ใน course | ❌ | ✅ |
| ทำได้กี่ครั้ง | ครั้งเดียว (per assessment type) | ตามจำนวน course |
| เปิด Follow up หลัง check-out | ❌ | ✅ ทันที |

---

## ตารางเปรียบเทียบ: 2 ทางเข้าสู่ patients

| | เพิ่มโดยตรง (/patients/new) | แปลงจาก Booking |
|--|--|--|
| มี `bookings` row | ❌ | ✅ |
| `referral_source` | ไม่ set | `'booking'` |
| ข้อมูลแรก | เต็มฟอร์ม (Admin กรอก) | ชื่อ+เบอร์ (intake ยังไม่ครบ) |
| ใช้เมื่อ | walk-in / referral โดยตรง | ผ่านขั้นตอนสนใจ → นัด |

---

## จุดที่ยังต้องพัฒนา

| # | ปัญหา | ไฟล์ | สถานะ |
|---|-------|------|--------|
| 1 | `createAssignment` ไม่ส่ง push notification แจ้งพนักงาน | `actions/scheduling.ts:131` | ⚠️ ยังไม่มี |
| 2 | AssignModal label assessment ระบุแค่ "Hand Function" — ไม่รองรับ Swallowing | `components/staff/assign-modal.tsx:100` | ⚠️ ต้องแยก 2 option |
| 3 | ไม่มี guard ป้องกัน assign assessment ก่อน intake ครบ | `actions/scheduling.ts` | ⚠️ optional |
