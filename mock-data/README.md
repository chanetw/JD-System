# Mock Data

โฟลเดอร์นี้เก็บข้อมูล Mock สำหรับใช้ในระหว่างพัฒนา Frontend

## ⚠️ กฎสำคัญ

> **ข้อมูล Mock ทั้งหมดต้องเก็บในโฟลเดอร์ `mock-data` เท่านั้น!**

## โครงสร้างไฟล์

```
mock-data/
├── index.js              # Export ข้อมูล Mock ทั้งหมด
├── users/
│   └── users.json        # ผู้ใช้งาน (6 คน) + Roles (4 บทบาท)
├── projects/
│   └── projects.json     # โครงการ (4 โครงการ) + BUDs + Tenants
├── jobs/
│   └── jobs.json         # Design Jobs (12 รายการ ครบทุกสถานะ)
├── admin/
│   └── admin.json        # Job Types (6) + Holidays (13) + Approval Flows
├── notifications/
│   └── notifications.json # แจ้งเตือน (8 รายการ)
├── approvals/
│   └── approvals.json    # การอนุมัติ + Activities + Comments
└── media/
    └── media.json        # ไฟล์ Media Portal (10 ไฟล์) + Stats
```

## การใช้งาน

```javascript
// Import ทั้งหมด
import { usersData, jobsData, notificationsData } from '@/mock-data';

// หรือ Import แยก
import usersData from '@/mock-data/users/users.json';
```

## สรุปข้อมูล Mock

| หมวดหมู่ | จำนวน |
|----------|-------|
| Users | 6 คน |
| Roles | 4 บทบาท |
| Projects | 4 โครงการ |
| BUDs | 2 หน่วยงาน |
| Job Types | 6 ประเภท |
| Holidays | 13 วัน |
| Design Jobs | 12 งาน |
| Notifications | 8 รายการ |
| Media Files | 10 ไฟล์ |

## สถานะงานใน Mock

- ✅ Draft: 1 งาน
- ✅ Scheduled: 1 งาน
- ✅ Pending Approval: 1 งาน
- ✅ Assigned: 1 งาน
- ✅ In Progress: 1 งาน
- ✅ Rework: 1 งาน
- ✅ Completed: 6 งาน
