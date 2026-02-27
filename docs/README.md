# 📚 DJ System Documentation

ยินดีต้อนรับสู่เอกสารประกอบระบบ DJ System - ระบบจัดการงาน Design Job

## 📁 โครงสร้างเอกสาร

### 📐 [architecture/](./architecture/)
เอกสารเกี่ยวกับโครงสร้างและสถาปัตยกรรมระบบ

- **CLAUDE.md** - คำแนะนำการพัฒนาสำหรับ Claude Code
- **DJ_SYSTEM_SUMMARY_TH.md** - ภาพรวมระบบและฟีเจอร์หลัก
- **system-overview.md** - ภาพรวมสถาปัตยกรรม (หากมี)

### 🛠️ [guides/](./guides/)
คู่มือการตั้งค่า การพัฒนา และการแพลตฟอร์ม

- **setup.md** - การติดตั้งและเริ่มต้นระบบ
- **development.md** - คำแนะนำการพัฒนา
- **deployment-guide.md** - การ deploy ไปยัง production

### 🔄 [workflows/](./workflows/)
เอกสารเกี่ยวกับ workflow และการไหลเวียนของงาน

- **JOB_WORKFLOW_DOCUMENTATION.md** - เอกสารการไหลของงาน (Job Status Flow)
- **TEST_APPROVAL_FLOW_2026_02_11.md** - การทดสอบเส้นทางการอนุมัติ
- **approval-flows.md** - เอกสารเกี่ยวกับการอนุมัติ (หากมี)

### 📖 [reference/](./reference/)
เอกสารอ้างอิง กรณีการใช้งาน และแนวทางการแก้ปัญหา

- **ACCEPTANCE_DATE_USE_CASES.md** - Use Cases สำหรับการเลือกวันส่งงาน
- **debug-user-scopes.md** - แนวทางการแก้ปัญหา User Scopes
- **verify_migration.md** - รายงานตรวจสอบการ migrate ฐานข้อมูล

### 📝 [sessions/](./sessions/)
สรุปการประชุม บันทึกเซสชั่น และแผนการทำงานถัดไป

- **SESSION_SUMMARY_2026_02_11.md** - สรุปเซสชั่น
- **NEXT_STEPS.md** - แผนการทำงานถัดไป

### 📋 [changelogs/](./changelogs/)
บันทึกการเปลี่ยนแปลง

- **CHANGELOG.md** - รายการเปลี่ยนแปลง (หากมี)

---

## 🚀 เริ่มต้นอย่างรวดเร็ว

### ต้องการติดตั้งระบบ?
👉 ดู [guides/setup.md](./guides/setup.md)

### ต้องการเข้าใจสถาปัตยกรรม?
👉 ดู [architecture/CLAUDE.md](./architecture/CLAUDE.md)

### ต้องการเข้าใจขั้นตอนการทำงาน?
👉 ดู [workflows/JOB_WORKFLOW_DOCUMENTATION.md](./workflows/JOB_WORKFLOW_DOCUMENTATION.md)

### เจอปัญหา?
👉 ดู [reference/debug-user-scopes.md](./reference/debug-user-scopes.md)

---

## 📊 ไฟล์เอกสารทั้งหมด

```
docs/
├── README.md (ไฟล์นี้)
├── architecture/
│   ├── CLAUDE.md
│   └── DJ_SYSTEM_SUMMARY_TH.md
├── guides/
│   ├── setup.md
│   ├── development.md
│   └── deployment-guide.md
├── workflows/
│   ├── JOB_WORKFLOW_DOCUMENTATION.md
│   └── TEST_APPROVAL_FLOW_2026_02_11.md
├── reference/
│   ├── ACCEPTANCE_DATE_USE_CASES.md
│   ├── debug-user-scopes.md
│   └── verify_migration.md
├── sessions/
│   ├── SESSION_SUMMARY_2026_02_11.md
│   └── NEXT_STEPS.md
└── changelogs/
    └── (changlog files)
```

---

**Last Updated:** 26 กุมภาพันธ์ 2026
