# TEST REJECT ALL CASES (2026-05-10)

เอกสารนี้รวม Test Case สำหรับ Flow ปฏิเสธงานทั้งหมด โดยตั้งชื่อเคสขึ้นต้นด้วย `Test Reject` ตามคำขอ

## Scope
- Assignee Reject (ทุกสถานะ Active)
- Approver Confirm/Deny หลัง Assignee Reject
- Timeout 1 วันทำการ (Auto-approve คำขอปฏิเสธ -> งานเป็น rejected)
- Error Popup ที่ต้องสื่อสารสาเหตุ + วิธีแก้

## Test Data Set (แนะนำ)
- Tenant มีวันหยุดอย่างน้อย 1 วัน (เพื่อทดสอบ working-day)
- ผู้ใช้ 4 บทบาท: Admin, Approver, Requester, Assignee
- งานตัวอย่างอย่างน้อย 1 งานต่อสถานะ Active
- งานตัวอย่าง 1 งานที่อยู่สถานะ terminal

## Terminal Status (ต้องกด Reject ไม่ได้)
- completed
- closed
- rejected
- rejected_by_assignee
- cancelled
- partially_completed

## Test Cases

### A) Assignee Reject Permissions
1. Test Reject 01 - Assignee Reject จากสถานะ draft
- Steps: เปิดงานสถานะ draft -> กดปฏิเสธ -> ใส่เหตุผล -> ยืนยัน
- Expected: สำเร็จ, งานเป็น assignee_rejected

2. Test Reject 02 - Assignee Reject จากสถานะ scheduled
- Expected: สำเร็จ, งานเป็น assignee_rejected

3. Test Reject 03 - Assignee Reject จากสถานะ submitted
- Expected: สำเร็จ, งานเป็น assignee_rejected

4. Test Reject 04 - Assignee Reject จากสถานะ pending_approval
- Expected: สำเร็จ, งานเป็น assignee_rejected

5. Test Reject 05 - Assignee Reject จากสถานะ pending_level_1
- Expected: สำเร็จ, งานเป็น assignee_rejected

6. Test Reject 06 - Assignee Reject จากสถานะ pending_level_2
- Expected: สำเร็จ, งานเป็น assignee_rejected

7. Test Reject 07 - Assignee Reject จากสถานะ pending_level_3
- Expected: สำเร็จ, งานเป็น assignee_rejected

8. Test Reject 08 - Assignee Reject จากสถานะ approved
- Expected: สำเร็จ, งานเป็น assignee_rejected

9. Test Reject 09 - Assignee Reject จากสถานะ assigned
- Expected: สำเร็จ, งานเป็น assignee_rejected

10. Test Reject 10 - Assignee Reject จากสถานะ in_progress
- Expected: สำเร็จ, งานเป็น assignee_rejected

11. Test Reject 11 - Assignee Reject จากสถานะ pending_dependency
- Expected: สำเร็จ, งานเป็น assignee_rejected

12. Test Reject 12 - Assignee Reject จากสถานะ rework
- Expected: สำเร็จ, งานเป็น assignee_rejected

13. Test Reject 13 - Assignee Reject จากสถานะ correction
- Expected: สำเร็จ, งานเป็น assignee_rejected

14. Test Reject 14 - Assignee Reject จากสถานะ returned
- Expected: สำเร็จ, งานเป็น assignee_rejected

15. Test Reject 15 - Assignee Reject จากสถานะ draft_review
- Expected: สำเร็จ, งานเป็น assignee_rejected

16. Test Reject 16 - Assignee Reject จากสถานะ pending_rebrief
- Expected: สำเร็จ, งานเป็น assignee_rejected

17. Test Reject 17 - Assignee Reject จากสถานะ rebrief_submitted
- Expected: สำเร็จ, งานเป็น assignee_rejected

### B) Assignee Reject Negative Cases
18. Test Reject 18 - Assignee Reject โดยผู้ใช้ที่ไม่ใช่ assignee
- Steps: Login คนอื่นที่ไม่ใช่ assignee -> กด Reject
- Expected: 403 NOT_ASSIGNEE, popup แจ้งไม่มีสิทธิ์ + แนวทางแก้

19. Test Reject 19 - Assignee Reject โดยไม่ใส่เหตุผล
- Expected: 400 COMMENT_REQUIRED, popup แจ้งกรอกเหตุผล

20. Test Reject 20 - Assignee Reject บน terminal status
- Expected: 409 INVALID_STATUS, popup แจ้งสถานะไม่รองรับ + ให้รีเฟรช

### C) Approver Decision after Assignee Reject
21. Test Reject 21 - Approver Confirm Assignee Rejection
- Steps: งานอยู่ assignee_rejected -> Approver กดยืนยันปฏิเสธ
- Expected: สำเร็จ, งานเป็น rejected, มี activity log, requester ได้ notification

22. Test Reject 22 - Approver Deny Assignee Rejection
- Steps: งานอยู่ assignee_rejected -> Approver กดไม่อนุมัติคำขอ
- Expected: สำเร็จ, งานกลับ in_progress, SLA dueDate ถูก extend ตามช่วง pause (วันทำการ)

23. Test Reject 23 - Confirm ซ้ำหลังมีคนกดไปแล้ว (race)
- Steps: เปิด 2 browser พร้อมกัน -> กดยืนยันเกือบพร้อมกัน
- Expected: คนแรกสำเร็จ, คนที่สองได้ 409 ALREADY_PROCESSED/INVALID_STATUS พร้อม popup สาเหตุชัดเจน

24. Test Reject 24 - Deny ซ้ำหลังมีคนกดไปแล้ว (race)
- Expected: คนแรกสำเร็จ, คนที่สองได้ 409 พร้อมข้อความ actionable

### D) Timeout Auto Decision (1 Working Day)
25. Test Reject 25 - Timeout ครบ 1 วันทำการ -> Auto-approve คำขอปฏิเสธ
- Setup: งานอยู่ assignee_rejected, ไม่มี action จาก approver
- Expected: cron ทำงาน -> งานเป็น rejected อัตโนมัติ
- Verify: มี activity/action `auto_closed_rejection_timeout` และ notification ถึง requester

26. Test Reject 26 - Timeout ยังไม่ครบ 1 วันทำการ -> ยังไม่ auto
- Expected: งานยังคง assignee_rejected

27. Test Reject 27 - Timeout ข้ามวันหยุด/เสาร์อาทิตย์
- Setup: reject ก่อนวันหยุดยาว
- Expected: นับเฉพาะวันทำการ, auto action ต้องเกิดหลังครบ 1 วันทำการจริง

### E) Error Popup UX (ต้องชัดเจน)
28. Test Reject 28 - Popup INVALID_STATUS
- Expected popup ต้องมี:
  - สาเหตุ: สถานะงานเปลี่ยนแล้ว
  - วิธีแก้: รีเฟรชและตรวจสถานะล่าสุด
  - ทางออก: ติดต่อแอดมินพร้อม DJ-ID ถ้ายังผิด

29. Test Reject 29 - Popup ALREADY_PROCESSED
- Expected popup ต้องมี:
  - สาเหตุ: มีคนดำเนินการแล้ว
  - วิธีแก้: ไปดูประวัติอนุมัติ/รีเฟรช

30. Test Reject 30 - Popup COMMENT_REQUIRED
- Expected popup ต้องมี: กรอกเหตุผลก่อนยืนยัน

31. Test Reject 31 - Popup NOT_ASSIGNEE/FORBIDDEN
- Expected popup ต้องมี: ไม่มีสิทธิ์ + ใครควรเป็นผู้ดำเนินการแทน

32. Test Reject 32 - Popup 500/Network
- Expected popup ต้องมี:
  - สาเหตุ: ระบบขัดข้องชั่วคราว
  - วิธีแก้: ลองใหม่ใน 1-2 นาที
  - ทางออก: ติดต่อแอดมินพร้อมเวลาและ DJ-ID

## Execution Checklist
- [ ] ผ่านครบ Test Reject 01-32
- [ ] ไม่มี popup ดิบแบบ "Request failed with status code 409"
- [ ] สถานะปลายทางตรงตามแต่ละเคส
- [ ] notification/activity ถูกบันทึกครบ
- [ ] SLA behavior ถูกต้องในเคส Deny และ Timeout ข้ามวันหยุด

## Suggested Smoke API Endpoints
- POST /api/jobs/:id/reject-by-assignee
- POST /api/jobs/:id/confirm-assignee-rejection
- POST /api/jobs/:id/deny-assignee-rejection
- POST /api/jobs/:id/reject
