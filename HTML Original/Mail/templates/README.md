# DJ System Email Templates

## 📧 รายการ Email Templates ทั้งหมด

### 1. Base Template
- **ไฟล์**: `base-template.html`
- **คำอธิบาย**: Template พื้นฐานสำหรับทุก email พร้อม DJ System branding

### 2. Job Assigned (งานมอบหมาย)
- **ไฟล์**: `job-assigned.html`
- **Trigger**: งานได้รับการอนุมัติและมอบหมายให้ assignee
- **Recipient**: Assignee
- **Variables**: `{{ASSIGNEE_NAME}}`, `{{JOB_ID}}`, `{{JOB_SUBJECT}}`, `{{REQUESTER_NAME}}`, `{{DEADLINE}}`, `{{JOB_TYPE}}`, `{{JOB_URL}}`

### 3. Urgent Job Approved (งานด่วนได้รับอนุมัติ)
- **ไฟล์**: `urgent-job-approved.html`
- **Trigger**: งานด่วนได้รับการอนุมัติ
- **Recipient**: Assignee
- **Variables**: `{{ASSIGNEE_NAME}}`, `{{JOB_ID}}`, `{{JOB_SUBJECT}}`, `{{REQUESTER_NAME}}`, `{{DEADLINE}}`, `{{JOB_TYPE}}`, `{{JOB_URL}}`

### 4. Urgent Job Impact (งานถูกเลื่อนจากงานด่วน)
- **ไฟล์**: `urgent-job-impact.html`
- **Trigger**: งานถูกเลื่อนเนื่องจากงานด่วน
- **Recipient**: Requester
- **Variables**: `{{REQUESTER_NAME}}`, `{{JOB_ID}}`, `{{JOB_SUBJECT}}`, `{{ASSIGNEE_NAME}}`, `{{OLD_DEADLINE}}`, `{{NEW_DEADLINE}}`, `{{SHIFT_DAYS}}`, `{{URGENT_JOB_ID}}`, `{{JOB_URL}}`

### 5. Job Rejection (งานถูกยกเลิก/ปฏิเสธ)
- **ไฟล์**: `job-rejection.html`
- **Trigger**: งานถูกยกเลิก/ปฏิเสธ
- **Recipient**: Requester
- **Variables**: `{{REQUESTER_NAME}}`, `{{JOB_ID}}`, `{{JOB_SUBJECT}}`, `{{APPROVER_NAME}}`, `{{REJECTED_DATE}}`, `{{REJECTION_REASON}}`, `{{JOB_URL}}`

### 6. Job Approval Request (คำขออนุมัติงาน)
- **ไฟล์**: `job-approval-request.html`
- **Trigger**: งานต้องการการอนุมัติ
- **Recipient**: Approver
- **Variables**: `{{APPROVER_NAME}}`, `{{JOB_ID}}`, `{{JOB_SUBJECT}}`, `{{REQUESTER_NAME}}`, `{{DEADLINE}}`, `{{JOB_TYPE}}`, `{{PRIORITY}}`, `{{APPROVE_URL}}`, `{{REJECT_URL}}`, `{{JOB_URL}}`

### 7. Job Approved (งานได้รับการอนุมัติ)
- **ไฟล์**: `job-approved.html`
- **Trigger**: งานได้รับการอนุมัติ
- **Recipient**: Requester
- **Variables**: `{{REQUESTER_NAME}}`, `{{JOB_ID}}`, `{{JOB_SUBJECT}}`, `{{APPROVER_NAME}}`, `{{ASSIGNEE_NAME}}`, `{{DEADLINE}}`, `{{JOB_URL}}`

### 8. Job Deadline Reminder (แจ้งเตือน Deadline)
- **ไฟล์**: `job-deadline-reminder.html`
- **Trigger**: งานใกล้ถึง deadline
- **Recipient**: Assignee
- **Variables**: `{{ASSIGNEE_NAME}}`, `{{JOB_ID}}`, `{{JOB_SUBJECT}}`, `{{REQUESTER_NAME}}`, `{{JOB_TYPE}}`, `{{DEADLINE}}`, `{{DAYS_REMAINING}}`, `{{JOB_URL}}`

### 9-14. Templates ที่เหลือ
- `job-status-changed.html` - เปลี่ยนสถานะงาน
- `comment-notification.html` - ความคิดเห็นใหม่
- `additional-info-request.html` - ขอข้อมูลเพิ่มเติม
- `draft-submitted.html` - ส่ง Draft
- `user-created.html` - สร้างผู้ใช้ใหม่
- `registration-approved.html` - อนุมัติการลงทะเบียน (ใช้ template เดิมที่มีอยู่แล้ว)
- `password-reset.html` - รีเซ็ตรหัสผ่าน (ใช้ template เดิมที่มีอยู่แล้ว)

## 🎨 การใช้งาน

### ใน Backend (emailService.js)
```javascript
// ตัวอย่างการใช้งาน
const fs = require('fs');
const path = require('path');

// อ่าน template
const templatePath = path.join(__dirname, '../../../HTML Original/Mail/templates/job-assigned.html');
let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

// Replace variables
htmlTemplate = htmlTemplate
  .replace(/{{ASSIGNEE_NAME}}/g, assigneeName)
  .replace(/{{JOB_ID}}/g, jobId)
  .replace(/{{JOB_SUBJECT}}/g, jobSubject)
  .replace(/{{REQUESTER_NAME}}/g, requesterName)
  .replace(/{{DEADLINE}}/g, deadline)
  .replace(/{{JOB_TYPE}}/g, jobType)
  .replace(/{{JOB_URL}}/g, jobUrl);

// ส่ง email
await emailService.sendEmail(to, subject, htmlTemplate);
```

## 🔐 Security Features

### Token URLs
ทุก URL ใน email templates จะมี encrypted token สำหรับความปลอดภัย:
```
https://app.djsystem.com/jobs/123?token={encrypted_token}
```

Token มีอายุ **48 ชั่วโมง** (2 วัน)

## 🎨 Brand Colors

- **Primary**: #e11d48 (Rose)
- **Secondary**: #4f46e5 (Indigo)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Amber)
- **Danger**: #ef4444 (Red)

## 📱 Responsive Design

ทุก template รองรับ:
- Desktop email clients
- Mobile devices
- Dark mode (บางส่วน)

## ⚠️ หมายเหตุ

1. CSS properties `mso-table-lspace` และ `mso-table-rspace` เป็นสำหรับ Microsoft Outlook โดยเฉพาะ
2. ใช้ inline CSS เพื่อความเข้ากันได้กับ email clients ต่างๆ
3. Logo จะถูกเพิ่มในอนาคต (ตอนนี้ใช้ text placeholder)
