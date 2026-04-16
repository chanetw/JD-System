# Environment Variables Reference

เอกสารนี้รวบรวมตัวแปร environment ที่ใช้ใน DJ System ทั้งฝั่ง Backend และ Frontend

Source of truth:
- [backend/api-server/.env.example](../../backend/api-server/.env.example)
- [backend/api-server/envprod.txt](../../backend/api-server/envprod.txt)
- [frontend/.env.local](../../frontend/.env.local)

## Backend: Core

| Variable | Example | Required | Description |
|---|---|---|---|
| NODE_ENV | development / production | Yes | ระบุ environment ของ server |
| PORT | 3000 | Yes | พอร์ตหลักของ API |
| FRONTEND_URL | http://localhost:5173 | Yes | ใช้กำหนด URL ฝั่ง frontend |
| ALLOWED_ORIGINS | http://localhost:5173,http://localhost:3000 | Yes | CORS allow list (comma-separated) |
| DATABASE_URL | postgresql://... | Yes | PostgreSQL connection string |
| JWT_SECRET | your-secret | Yes | key สำหรับ sign/verify JWT |

## Backend: Realtime / Email / Storage

| Variable | Example | Required | Description |
|---|---|---|---|
| SOCKET_PORT | 3000 | Optional | พอร์ต Socket.io (ส่วนใหญ่ใช้พอร์ตเดียวกับ API) |
| SOCKET_TRANSPORTS | websocket,polling | Optional | transport ที่อนุญาต |
| ENABLE_NOTIFICATIONS | true | Optional | เปิด/ปิดระบบแจ้งเตือน |
| ENABLE_EMAIL_NOTIFICATIONS | false | Optional | เปิด/ปิด email notifications |
| EMAIL_API_URL | http://localhost:3001 | Optional | endpoint ของ email API |
| EMAIL_API_KEY | change-me | Optional | API key สำหรับ email service |
| SMTP_HOST | smtp.example.com | Optional | SMTP host |
| SMTP_PORT | 587 | Optional | SMTP port |
| SMTP_USER | user@example.com | Optional | SMTP username |
| SMTP_PASS | password | Optional | SMTP password |
| SMTP_FROM | DJ System <noreply@example.com> | Optional | from address |
| STORAGE_PROVIDER | local | Optional | local หรือ provider อื่นตามการตั้งค่า |
| UPLOADS_DIR | /app/uploads | Optional | path เก็บไฟล์ |

## Backend: Job Chaining / Feature Flags

| Variable | Example | Required | Description |
|---|---|---|---|
| MAX_CHAIN_DEPTH | 3 | Optional | ความลึกสูงสุดของ chain |
| ENABLE_FULL_TRANSITIVE | true | Optional | เดิน chain แบบ transitive |
| PREVENT_SELF_CHAIN | true | Optional | ป้องกันงานชี้กลับตัวเอง |
| ENABLE_CYCLE_DETECTION | true | Optional | ตรวจจับวงจรใน chain |
| URGENT_SHIFT_DAYS | 2 | Optional | จำนวนวันที่เลื่อนงานเมื่อ urgent |
| ENABLE_URGENT_RESCHEDULE | true | Optional | เปิดการ reschedule ตอน urgent |
| ENABLE_CHAIN_NOTIFICATIONS | true | Optional | แจ้งเตือนเมื่อ chain เปลี่ยน |
| ENABLE_RATE_LIMITING | false / true | Optional | เปิด rate limiting |
| LOG_LEVEL | debug / info | Optional | ระดับ log |

## Frontend

| Variable | Example | Required | Description |
|---|---|---|---|
| VITE_API_URL | http://localhost:3000/api | Yes | base URL สำหรับเรียก API |
| VITE_FRONTEND_MODE | api_only | Optional | mode ฝั่ง UI |
| VITE_AUTH_MODE | jwt_only | Optional | auth mode ฝั่ง frontend |

## Production Notes

ค่าที่พบบ่อยใน production (อ้างอิงจาก `envprod.txt`):

- DATABASE_MODE=local
- STORAGE_PROVIDER=local
- AUTH_MODE=jwt_only
- ENABLE_RATE_LIMITING=true

## Security Checklist

- ห้าม commit secret จริงลง Git
- ใช้ `.env.example` เป็นต้นแบบ
- แยกค่าระหว่าง local/staging/production ชัดเจน
- rotate JWT/SMTP/API secrets เป็นระยะ
