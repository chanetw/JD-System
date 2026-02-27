## แก้ไขระบบ Job Rejection Feature

### ปัญหาที่พบ
1. **Backend**: API `GET /api/jobs/:id` ไม่ได้ query ข้อมูลจากตาราง `rejection_requests` ทำให้ Frontend ไม่ได้ข้อมูล `rejectionRequest`
2. **Frontend**: เรียก API endpoints ผิด path ทำให้ Approve/Deny ไม่ทำงาน (404)
3. **Display Logic**: Alert Box แสดงเฉพาะ status `assignee_rejected` แต่ระบบใหม่ใช้ `pending_rejection` ทำให้ไม่แสดงผล
4. **Modal Mismatch**: ปุ่ม "ปฏิเสธงาน" ของ Assignee ไปเรียก Modal เก่าที่ใช้ logic ระบบเก่า

### การแก้ไขที่ดำเนินการ

#### Backend (`routes/jobs.js`)
- เพิ่ม `include: { rejectionRequests: { where: { status: 'pending' }, ... } }` ใน Prisma query
- Map `rejectionRequests[0]` เข้าไปใน `transformed.rejectionRequest`
- ส่งข้อมูล rejection request กลับมาให้ Frontend ได้ใช้งาน

#### Frontend (`pages/JobDetail.jsx`)
- แก้ API endpoints ให้ตรงกับ backend path: `/jobs/rejection-requests/...`
- เปลี่ยนเงื่อนไขแสดง Alert Box ให้ครอบคลุม `pending_rejection` ด้วย
- เปลี่ยนปุ่ม "ปฏิเสธงาน" ให้เปิด `RejectionRequestModal` ตัวใหม่
- เพิ่ม fallback แสดงเหตุผลจาก `rejectionRequest.reason` ก่อน `rejectionComment`

#### Frontend (`components/RejectionApprovalCard.jsx`)
- เพิ่ม fallback `ไม่ระบุเหตุผล` ป้องกันกรณีไม่มี reason

### ผลลัพธ์
- ✅ Assignee สามารถขอปฏิเสธงานพร้อมเหตุผลได้
- ✅ Approver เห็น Card รออนุมัติพร้อมเหตุผลที่ Assignee ระบุ
- ✅ Approver สามารถ Approve/Deny ได้ (API 404 หายไป)
- ✅ ทุกฝ่ายเห็นเหตุผลการปฏิเสธอย่างถูกต้อง
- ✅ รองรับทั้งระบบเก่าและใหม่ (backward compatible)

### หมายเหตุ
ระบบใหม่จะใช้ workflow:
1. Assignee กด "ปฏิเสธงาน" → เปิด `RejectionRequestModal`
2. กรอกเหตุผล → API `POST /jobs/:id/request-rejection`
3. สถานะงานเปลี่ยนเป็น `pending_rejection`
4. Approver เห็น `RejectionApprovalCard` พร้อมเหตุผล
5. Approver อนุมัติ/ไม่อนุมัติ → API `POST /jobs/rejection-requests/:id/approve|deny`
6. สถานะงานเปลี่ยนเป็น `rejected_by_assignee` หรือ `in_progress`
