# Environment Variables Reference

เอกสารนี้รวบรวมตัวแปร environment ที่ใช้ใน DJ System ทั้งฝั่ง Backend และ Frontend

หมายเหตุ: Runtime ปัจจุบันไม่ใช้ Supabase แล้ว ให้ใช้ PostgreSQL ผ่าน Backend API และ local storage เป็นค่าเริ่มต้น

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
| MAX_UPLOAD_SIZE_MB | 50 | Optional | ขนาดไฟล์สูงสุดต่อไฟล์สำหรับ `/api/storage/upload` |

## Backend: Job Chaining / Feature Flags

| Variable | Example | Required | Description |
|---|---|---|---|
| MAX_CHAIN_DEPTH | 3 | Optional | ความลึกสูงสุดของ chain |
| ENABLE_FULL_TRANSITIVE | true | Optional | เดิน chain แบบ transitive |
| PREVENT_SELF_CHAIN | true | Optional | ป้องกันงานชี้กลับตัวเอง |
| ENABLE_CYCLE_DETECTION | true | Optional | ตรวจจับวงจรใน chain |
| URGENT_SHIFT_DAYS | 2 | Optional | ค่า legacy; logic ใหม่ใช้ `min(active urgent jobs, 2)` และ delay ตามลำดับคิว |
| ENABLE_URGENT_RESCHEDULE | true | Optional | เปิดการ reschedule ตอน urgent |
| URGENT_IMPACT_TEST_EMAIL | chanetw@sena.co.th | Optional | ส่งสำเนา UAT ของ email แจ้งงานถูกเลื่อนจาก urgent |
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

## Local Docker Isolation

`docker-compose.yml` สำหรับ local development ตั้ง `name: dj-system-dev` เพื่อแยก Docker Compose project ออกจาก production stack ที่ใช้ `docker-compose.prod.yml`

ผลลัพธ์ที่คาดหวัง:

- Local PostgreSQL ใช้ container `dj-postgres` และ port `5433`
- Production PostgreSQL ใช้ container `dj-postgres-prod` และ port `5434`
- คำสั่ง local เช่น `docker compose up -d postgres` จะอยู่ใน project `dj-system-dev` และไม่ควร recreate/stop service ของ production

ข้อควรระวัง:

- งาน local ให้ใช้ `docker compose up -d postgres` หรือ `docker compose --profile app up -d`
- งาน production server ให้ใช้ `docker compose -f docker-compose.prod.yml ...` เท่านั้น
- ห้ามใช้คำสั่ง `docker compose down -v` กับ production โดยไม่ตั้งใจ เพราะจะลบ volume ข้อมูล

## Security Checklist

- ห้าม commit secret จริงลง Git
- ใช้ `.env.example` เป็นต้นแบบ
- แยกค่าระหว่าง local/staging/production ชัดเจน
- rotate JWT/SMTP/API secrets เป็นระยะ
