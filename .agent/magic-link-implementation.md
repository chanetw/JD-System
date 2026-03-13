# 🔐 Magic Link Authentication System

## Overview
ระบบ Magic Link ช่วยให้ผู้ใช้สามารถคลิกลิงก์จาก email แล้วเข้าสู่ระบบอัตโนมัติได้ทันที โดยไม่ต้องกรอก username/password

## Architecture

```
Email with Magic Link → Frontend (/auth/magic-link?token=xxx) 
  → Backend Verify Token → Auto Login → Redirect to Target Page
```

## Security Features

✅ **JWT-based tokens** with signature verification  
✅ **One-time use** - Token ถูกทำเครื่องหมายว่าใช้แล้วหลังจาก verify  
✅ **Expiry time** - Token หมดอายุใน 24 ชั่วโมง  
✅ **User validation** - ตรวจสอบว่า user ยังคง active  
✅ **Database tracking** - เก็บ log การใช้งาน token ทั้งหมด  

## Implementation Steps

### 1. Database Migration

เพิ่ม table `magic_link_tokens`:

```bash
cd backend
npx prisma migrate dev --name add_magic_link_tokens
```

### 2. Environment Variables

เพิ่มใน `.env`:

```env
MAGIC_LINK_SECRET=your-secret-key-here
# หรือจะใช้ JWT_SECRET เดิมก็ได้
```

### 3. Backend Usage

#### สร้าง Magic Link

```javascript
import MagicLinkService from '../services/magicLinkService.js';

const magicLinkService = new MagicLinkService();

// สร้าง magic link สำหรับ job action
const magicLink = await magicLinkService.createJobActionLink({
  userId: 123,
  jobId: 456,
  action: 'approve', // approve, reject, view, submit, draft, rebrief
  djId: 'DJ-260301-0001-01'
});

// ผลลัพธ์: http://localhost:5173/auth/magic-link?token=eyJhbGc...
```

#### สร้าง Magic Link แบบ Custom

```javascript
const magicLink = await magicLinkService.generateMagicLink({
  userId: 123,
  targetUrl: '/jobs/456?action=approve',
  action: 'approve',
  metadata: { jobId: 456, djId: 'DJ-260301-0001-01' }
});
```

### 4. แก้ไข Email Templates

**ก่อนหน้า (Direct Link):**
```html
<a href="http://localhost:5173/jobs/123">ดูรายละเอียดงาน</a>
```

**หลังแก้ไข (Magic Link):**
```javascript
// ใน notification code
const magicLink = await magicLinkService.createJobActionLink({
  userId: approverId,
  jobId: job.id,
  action: 'approve',
  djId: job.djId
});

// ใน email template
<a href="${magicLink}">อนุมัติงานทันที (ไม่ต้อง login)</a>
```

### 5. Frontend Route

เพิ่ม route ใน `App.jsx` หรือ router config:

```javascript
import MagicLinkAuth from './modules/core/auth/pages/MagicLinkAuth';

// ใน routes
{
  path: '/auth/magic-link',
  element: <MagicLinkAuth />
}
```

## API Endpoints

### POST /api/magic-link/verify

Verify magic link token และ auto-login

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "tenantId": 1,
    "roles": ["assignee"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "targetUrl": "/jobs/456?action=approve",
  "action": "approve",
  "metadata": {
    "jobId": 456,
    "djId": "DJ-260301-0001-01"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "TOKEN_EXPIRED",
  "message": "Magic link has expired"
}
```

**Error Codes:**
- `TOKEN_EXPIRED` - Token หมดอายุ
- `TOKEN_ALREADY_USED` - Token ถูกใช้ไปแล้ว
- `TOKEN_NOT_FOUND` - ไม่พบ token ในระบบ
- `INVALID_TOKEN` - Token ไม่ถูกต้อง
- `USER_NOT_FOUND` - ไม่พบ user
- `USER_INACTIVE` - User ถูกระงับ

### POST /api/magic-link/cleanup

ลบ tokens ที่หมดอายุ (สำหรับ cron job)

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 42 expired tokens"
}
```

## ตัวอย่างการใช้งานใน Email Notifications

### 1. งานรออนุมัติ (Pending Approval)

```javascript
// ใน jobs.js - สร้างงาน
const magicLink = await magicLinkService.createJobActionLink({
  userId: approverId,
  jobId: result.job.id,
  action: 'approve',
  djId: djId
});

await emailService.sendEmail(approver.email, 
  `📋 งานใหม่รออนุมัติ: ${djId}`,
  `<h2>งานใหม่รอการอนุมัติ</h2>
  <p><strong>งาน:</strong> ${djId} - ${subject}</p>
  <p><a href="${magicLink}">อนุมัติงานทันที</a></p>`
);
```

### 2. มอบหมายงาน (Job Assignment)

```javascript
const magicLink = await magicLinkService.createJobActionLink({
  userId: assigneeId,
  jobId: jobId,
  action: 'view',
  djId: job.djId
});

await emailService.sendEmail(assignee.email,
  `👤 คุณได้รับมอบหมายงาน: ${job.djId}`,
  `<h2>คุณได้รับมอบหมายงานใหม่</h2>
  <p><a href="${magicLink}">เริ่มทำงานทันที</a></p>`
);
```

### 3. Draft รอตรวจสอบ (Draft Review)

```javascript
const magicLink = await magicLinkService.createJobActionLink({
  userId: requesterId,
  jobId: jobId,
  action: 'draft',
  djId: job.djId
});

await emailService.sendEmail(requester.email,
  `📝 Draft งาน ${job.djId} ส่งมาแล้ว`,
  `<h2>Draft งานส่งมาแล้ว</h2>
  <p><a href="${magicLink}">ตรวจสอบ Draft ทันที</a></p>`
);
```

## User Experience Flow

1. **User รับ email** พร้อม magic link
2. **คลิก link** → เปิด browser ไปที่ `/auth/magic-link?token=xxx`
3. **Frontend verify token** กับ backend
4. **Backend ตรวจสอบ:**
   - Token signature ถูกต้องหรือไม่
   - Token หมดอายุหรือยัง
   - Token ถูกใช้ไปแล้วหรือยัง
   - User ยัง active หรือไม่
5. **Auto-login:** บันทึก token + user data ลง localStorage
6. **Redirect:** ไปยังหน้าที่ต้องการ (เช่น `/jobs/123?action=approve`)
7. **User ทำ action** ได้ทันที โดยไม่ต้อง login

## Best Practices

### ✅ DO

- ใช้ magic link สำหรับ action ที่ต้องการความสะดวก (approve, view, submit)
- ตั้ง expiry time ที่เหมาะสม (24 ชั่วโมง)
- Log การใช้งาน token เพื่อ audit trail
- ใช้ HTTPS ใน production
- ตรวจสอบ user status ก่อน auto-login

### ❌ DON'T

- ส่ง magic link ผ่าน channel ที่ไม่ปลอดภัย
- ใช้ token ซ้ำ (one-time use only)
- ตั้ง expiry time นานเกินไป
- ลืม cleanup expired tokens

## Cron Job Setup

เพิ่ม cron job สำหรับลบ tokens ที่หมดอายุ:

```javascript
// ใน cron service
import MagicLinkService from '../services/magicLinkService.js';

const magicLinkService = new MagicLinkService();

// รันทุกวันเวลา 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[Cron] Cleaning up expired magic link tokens...');
  const count = await magicLinkService.cleanupExpiredTokens();
  console.log(`[Cron] Cleaned up ${count} tokens`);
});
```

## Testing

### Test Magic Link Generation

```bash
curl -X POST http://localhost:3000/api/magic-link/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_HERE"}'
```

### Test Cleanup

```bash
curl -X POST http://localhost:3000/api/magic-link/cleanup
```

## Migration Checklist

- [ ] Run Prisma migration
- [ ] Add MAGIC_LINK_SECRET to .env
- [ ] Register magic-link routes in index.js
- [ ] Add frontend route for /auth/magic-link
- [ ] Update email templates to use magic links
- [ ] Test magic link flow
- [ ] Setup cron job for cleanup
- [ ] Monitor token usage in production

## Security Considerations

1. **Token Storage:** Tokens เก็บใน database พร้อม metadata
2. **One-time Use:** Token ถูก mark เป็น `used` หลังจาก verify สำเร็จ
3. **Expiry:** Token หมดอายุอัตโนมัติใน 24 ชั่วโมง
4. **User Validation:** ตรวจสอบ user status ทุกครั้งก่อน auto-login
5. **Audit Trail:** Log ทุก action ที่เกี่ยวข้องกับ magic link

## Monitoring

ควร monitor:
- จำนวน magic links ที่สร้างต่อวัน
- Success rate ของ verification
- จำนวน expired/used tokens
- Error rate (TOKEN_EXPIRED, TOKEN_ALREADY_USED, etc.)

---

**สร้างโดย:** DJ System Development Team  
**วันที่:** Mar 12, 2026  
**Version:** 1.0.0
