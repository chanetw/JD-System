# 📝 ฟีเจอร์ใหม่: Draft Submit & Rebrief

## 🎯 ภาพรวม
พัฒนาฟีเจอร์เพิ่มเติมสำหรับการส่งงานและการปฏิเสธงาน โดยเพิ่มความสามารถในการส่ง Draft ให้ตรวจสอบก่อนส่งงานจริง และการขอข้อมูลเพิ่มเติมจากผู้สั่งงานโดยไม่ต้องเปิดงานใหม่

---

## 🚀 ฟีเจอร์ที่เพิ่ม

### 1. Draft Submit (ส่ง Draft ให้ตรวจ)
- **ผู้ใช้งาน:** Assignee (ผู้รับงาน)
- **การทำงาน:** 
  - กดปุ่ม "📝 ส่ง Draft ให้ตรวจ"
  - แนบลิงก์ draft (ไม่บังคับ) + หมายเหตุ
  - สถานะงานเปลี่ยนเป็น `draft_review`
- **การแจ้งเตือน:** 
  - แจ้ง Requester และ Approver ทุกคนใน flow
  - ส่ง email พร้อมลิงก์ draft
- **ประโยชน์:** ลดความเสี่ยงการทำงานผิดทิศทาง ให้ Requester ตรวจสอบก่อนส่งงานจริง

### 2. Rebrief (ขอข้อมูลเพิ่มเติม)
- **ผู้ใช้งาน:** Assignee → Requester → Assignee
- **การทำงาน:**
  1. **Assignee ขอ Rebrief:** กด "🔄 ขอ Rebrief" → ระบุเหตุผล → status = `pending_rebrief`
  2. **Requester ตอบ:** เห็นปุ่ม "📤 ส่งข้อมูลเพิ่มเติม" → เพิ่มข้อมูล/brief → status = `rebrief_submitted`
  3. **Assignee ตัดสินใจ:** เห็น 3 ปุ่ม:
     - **รับงาน** → คำนวณ SLA ใหม่ (dueDate = now + slaDays) → status = `in_progress`
     - **Rebrief อีก** → วนกลับขั้นตอน 1
     - **ปฏิเสธงาน** → ไป flow ปฏิเสธปกติ
- **ประโยชน์:** ไม่ต้องปิดงานและเปิดงานใหม่ ประหยัดเวลาและรักษาประวัติงาน

---

## 📊 การเปลี่ยนแปลงระบบ

### Database Schema
เพิ่ม 7 fields ใหม่ในตาราง `jobs`:
```sql
-- Draft Fields
draft_files JSONB DEFAULT '[]'           -- ไฟล์/ลิงก์ draft
draft_submitted_at TIMESTAMPTZ           -- วันที่ส่ง draft ล่าสุด
draft_count INTEGER DEFAULT 0            -- นับรอบ draft

-- Rebrief Fields
rebrief_reason TEXT                      -- เหตุผลที่ขอ rebrief
rebrief_count INTEGER DEFAULT 0         -- นับรอบ rebrief
rebrief_at TIMESTAMPTZ                   -- วันที่ขอ rebrief
rebrief_response TEXT                    -- คำตอบจาก Requester
```

### Backend API Routes
เพิ่ม 4 endpoints ใหม่:
1. `POST /api/jobs/:id/submit-draft` - ส่ง draft ให้ตรวจ
2. `POST /api/jobs/:id/rebrief` - ขอข้อมูลเพิ่มเติม
3. `POST /api/jobs/:id/submit-rebrief` - ส่งข้อมูลเพิ่มเติม
4. `POST /api/jobs/:id/accept-rebrief` - รับงานหลัง rebrief

### Frontend Components
- **JobActionPanel:** เพิ่มปุ่ม Draft/Rebrief + panel สำหรับ Requester
- **JobDetail:** เพิ่ม 3 modals และ handlers ครบถ้วน

---

## 🔄 Flow การทำงาน

### Draft Flow
```
Assignee → ส่ง Draft → Requester + Approvers ตรวจสอบ → Comment/Feedback → 
Assignee แก้ไข → ส่ง Draft ใหม่ (ได้หลายรอบ) → พอใจ → ส่งงานจริง
```

### Rebrief Flow
```
Assignee → ขอ Rebrief → Requester เพิ่มข้อมูล → Assignee เห็น 3 ตัวเลือก:
├── รับงาน → คำนวณ SLA ใหม่ → ทำงานต่อ
├── Rebrief ซ้ำ → วนกลับขั้นแรก
└── ปฏิเสธ → ปิดงาน
```

---

## 🎯 ประโยชน์ของฟีเจอร์

### สำหรับ Assignee
- ส่ง draft ให้ตรวจก่อน ลดความเสี่ยงทำงานผิด
- ขอข้อมูลเพิ่มได้โดยไม่ต้องเปิดงานใหม่
- ประหยัดเวลาในการทำงานซ้ำ

### สำหรับ Requester
- ตรวจสอบ draft ก่อนส่งงานจริง
- แก้ไขข้อมูลได้ทันทีเมื่อ Assignee ขอ
- ไม่ต้องสร้างงานใหม่ถ้าข้อมูลไม่ครบ

### สำหรับระบบ
- ลดปัญหางานที่ต้องทำซ้ำ
- รักษาประวัติการสื่อสารไว้ในงานเดิม
- คำนวณ SLA ใหม่อัตโนมัติเมื่อรับงานหลัง rebrief

---

## 📋 การติดตั้งและใช้งาน

### 1. Database Migration
รัน SQL script ใน Supabase:
```sql
-- ดูไฟล์: backend/supabase-migration-draft-rebrief.sql
```

### 2. Restart Backend
```bash
cd backend && npm run dev
```

### 3. ทดสอบฟีเจอร์
- ทดสอบส่ง draft และตรวจสอบ notification
- ทดสอบ rebrief flow ครบทั้ง 3 ขั้นตอน
- ตรวจสอบคำนวณ SLA ใหม่

---

## 🔧 Technical Details

- **Status ใหม่:** `draft_review`, `pending_rebrief`, `rebrief_submitted`
- **SLA Calculation:** ใช้ `date-fns` (`addBusinessDays`) นับเฉพาะวันทำการ
- **Notification:** ใช้ pattern เดียวกับระบบเดิม (in-app + email)
- **Activity Log:** บันทึกทุก action เพื่อ audit trail
- **Rebrief Loop:** รองรับการ rebrief ซ้ำได้หลายรอบ

---

## ✨ สรุป

ฟีเจอร์ Draft Submit & Rebrief ช่วยเพิ่มประสิทธิภาพการทำงาน:
- **ลดความเสี่ยง** ด้วยการตรวจสอบ draft ก่อนส่งงาน
- **ประหยัดเวลา** ด้วยการ rebrief โดยไม่ต้องเปิดงานใหม่
- **รักษาประวัติ** การสื่อสารไว้ในงานเดิม
- **อัตโนมัติ** การคำนวณ SLA ใหม่เมื่อรับงาน

พร้อมใช้งานแล้ว! 🚀
