# Business Logic Rules

## SLA Calculation (การคำนวณวันกำหนดส่ง)
ระบบต้องคำนวณ Service Level Agreement (SLA) โดยมีความถูกต้องแม่นยำตามเงื่อนไขธุรกิจดังนี้:

1.  **Workdays Only:** นับเฉพาะวันทำการ (จันทร์ - ศุกร์) เท่านั้น
2.  **Exclude Holidays:** ห้ามรวมวันหยุดนักขัตฤกษ์ โดยให้อ้างอิงข้อมูลจากไฟล์ `holidays.json`
3.  **Cut-off Time:** หากส่งงานหลังเวลาที่กำหนด (เช่น 17:00 น.) ให้เริ่มนับ SLA ในวันทำการถัดไป

## Implementation Detail
- เมื่อมีการคำนวณวัน Due Date ต้องใช้ Function กลางที่รองรับ Logic ข้างต้นเสมอ (ห้ามใช้ `Date.addDays` แบบปกติ)
- ข้อมูลวันหยุดต้อง Update ได้ (ผ่านไฟล์ Json หรือ Database) ไม่ Hardcode ใน Source Code

> **Example:**
> SLA = 3 วัน
> - ส่งงานวันศุกร์ -> Due Date คือ พุธหน้า (เสาร์-อาทิตย์ หยุด)
> - ถัาวันจันทร์เป็นวันหยุดนักขัตฤกษ์ -> Due Date เลื่อนเป็น พฤหัสบดี
