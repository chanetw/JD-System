# แผนการย้ายระบบ Docker + Database + Local Storage

## สถาปัตยกรรมเป้าหมาย

```
[ผู้ใช้งาน] → [Nginx] → /          → Frontend (React)
                       → /api/*     → Backend (Node.js:3000)
                       → /uploads/* → ไฟล์จาก Docker Volume
[Backend] ↔ [PostgreSQL Container]
[Backend] ↔ [Volume: dj-files] (/app/uploads/)
```

---

## 📂 โครงสร้างโฟลเดอร์ไฟล์ (Local Storage)

```
/app/uploads/                         ← Docker Volume: dj-files
  ├── tenant_1/
  │   ├── job_1/                       ← ไฟล์แนบ Brief (ตาม Job ID)
  │   │   ├── 1710000000_brief.pdf
  │   │   └── 1710000001_logo.png
  │   ├── drafts/
  │   │   └── job_1/                   ← ไฟล์ Draft ที่ Assignee อัปโหลด
  │   │       └── 1710000002_draft_v1.psd
  │   ├── deliverables/
  │   │   └── job_1/                   ← ไฟล์ Final หลังอนุมัติ
  │   └── media/
  │       └── job_1/                   ← ไฟล์ Media Portal (หลังงานเสร็จ)
  └── thumbnails/
      └── tenant_1/                    ← รูป Thumbnail (สร้างอัตโนมัติ 400x300px)
          └── thumb_1710000002.jpg
```

### ไฟล์ Draft ทำงานอย่างไร?

| ขั้นตอน | สิ่งที่เกิดขึ้น | DB |
|--------|--------------|-----|
| Assignee upload draft | บันทึกไฟล์ใน `/uploads/tenant_{id}/drafts/job_{id}/` | `MediaFile.filePath` |
| Submit draft | ไม่ copy ไฟล์, แค่เปลี่ยน status | `Job.status = 'pending_approval'` |
| Approver อนุมัติ | ไม่ y้ายไฟล์ | `Job.status = 'completed'` |
| **หลัง 30 วัน** | **Cron ลบไฟล์ + record ออก** | `MediaFile` deleted |

---

## ⏰ ระบบลบไฟล์อัตโนมัติหลัง 30 วัน

### หลักการทำงาน
- ทำงานคล้าย [rejectionAutoCloseCron.js](file:///Users/chanetw/Documents/DJ-System/backend/api-server/src/services/rejectionAutoCloseCron.js) ที่มีอยู่แล้ว
- ทำงานทุกคืน เวลา 02:00 น.
- **เงื่อนไขลบ:** งานสถานะ `completed` หรือ `closed` และ `completedAt` เกิน 30 วัน
- **ประเภทไฟล์ที่ลบ:** draft files, brief attachments, thumbnails ของงานนั้น
- **ไม่ลบ:** media files ใน Media Portal (เป็น deliverable สำคัญ)

### [NEW] ไฟล์ที่ต้องสร้าง: `fileCleanupCron.js`

```javascript
// ตัวอย่าง logic (ไม่ใช่โค้ดสมบูรณ์)
class FileCleanupCron {
  async processExpiredJobs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // ค้นหางานที่เสร็จเกิน 30 วัน
    const expiredJobs = await prisma.job.findMany({
      where: {
        status: { in: ['completed', 'closed'] },
        completedAt: { lte: cutoffDate }
      },
      include: {
        mediaFiles: {
          where: { fileType: { not: 'link' } } // ไม่ลบ external links
        }
      }
    });

    for (const job of expiredJobs) {
      for (const file of job.mediaFiles) {
        // ลบไฟล์จาก disk
        await storageService.deleteFile(file.filePath);
        // ลบ record จาก DB
        await prisma.mediaFile.delete({ where: { id: file.id } });
      }
      // Log การลบ
      await prisma.jobActivity.create({ ... });
    }
  }
}
```

### ไฟล์ที่ต้องแก้ไข:

| ไฟล์ | งาน |
|------|-----|
| **[NEW]** `src/services/fileCleanupCron.js` | สร้าง Cron Service ใหม่ |
| [src/index.js](file:///Users/chanetw/Documents/DJ-System/backend/api-server/src/index.js) | เพิ่ม `startFileCleanupCron()` ตอน startup |
| [backend/api-server/.env](file:///Users/chanetw/Documents/DJ-System/backend/api-server/.env) | เพิ่ม `FILE_RETENTION_DAYS=30` |

---

## 📋 แผนการดำเนินงาน (5 ขั้นตอน)

### ขั้นที่ 1 — ตั้งค่า Database บน Docker (Local Dev)

**งาน:**
- [MODIFY] [docker-compose.yml](file:///Users/chanetw/Documents/DJ-System/docker-compose.yml) — เพิ่ม healthcheck
- [NEW] `database/init/01_extensions.sql` — RLS extensions
- [NEW] `.env.local.example` — template ENV

```bash
# รันบนเครื่อง dev
docker compose up -d postgres
cd backend && npx prisma migrate deploy
npm run dev  # backend
```

**ENV:**
```
DATABASE_MODE=local
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system
STORAGE_PROVIDER=local
VITE_FRONTEND_MODE=api_only
```

---

### ขั้นที่ 2 — Export ข้อมูลจาก Supabase → Docker

```bash
# Export จาก Supabase
pg_dump "postgresql://...supabase.com.../postgres" \
  --no-owner --no-acl -f backup_supabase.sql

# Import เข้า Docker
docker exec -i dj-postgres psql -U postgres -d dj_system < backup_supabase.sql
```

> [!WARNING]
> ถ้ายังใช้ Supabase Storage สำหรับไฟล์เดิม → ต้องรัน script download ไฟล์จาก Supabase แล้ว copy ไปไว้ใน Docker Volume

---

### ขั้นที่ 3 — แก้ไข Backend (ลบ Supabase Direct Calls)

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| [routes/users.js](file:///Users/chanetw/Documents/DJ-System/backend/api-server/src/routes/users.js) | `/registrations/:id/approve` + `/registrations/pending` → ใช้ Prisma แทน Supabase client |
| [prisma/schema.prisma](file:///Users/chanetw/Documents/DJ-System/backend/prisma/schema.prisma) | ตรวจสอบ/เพิ่ม model `UserRegistrationRequest` |
| **[NEW]** `services/fileCleanupCron.js` | Auto-delete ไฟล์หลัง 30 วัน |
| [src/index.js](file:///Users/chanetw/Documents/DJ-System/backend/api-server/src/index.js) | เพิ่ม `fileCleanupCron.start()` |

---

### ขั้นที่ 4 — แก้ไข Frontend (สลับ API Mode)

**เปลี่ยน ENV:**
```
VITE_FRONTEND_MODE=api_only
VITE_API_URL=https://yourdomain.com
```

ตรวจสอบ service files ที่ต้องมี `api_only` branch ครบ:
- [fileUploadService.js](file:///Users/chanetw/Documents/DJ-System/frontend/src/modules/shared/services/modules/fileUploadService.js) (มีบางส่วนแล้ว)
- [authStore.js](file:///Users/chanetw/Documents/DJ-System/frontend/src/modules/core/stores/authStore.js), [jobService.js](file:///Users/chanetw/Documents/DJ-System/frontend/src/modules/shared/services/modules/jobService.js), [adminService.js](file:///Users/chanetw/Documents/DJ-System/frontend/src/modules/shared/services/modules/adminService.js) ฯลฯ

---

### ขั้นที่ 5 — Dockerize + Deploy Server

#### [NEW] `frontend/Dockerfile`
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ARG VITE_FRONTEND_MODE=api_only
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

#### [NEW] `nginx.conf`
```nginx
location /api/ { proxy_pass http://backend:3000; }
location /socket.io/ { proxy_pass http://backend:3000; }
location /uploads/ { alias /app/uploads/; }
```

#### [MODIFY] [docker-compose.prod.yml](file:///Users/chanetw/Documents/DJ-System/docker-compose.prod.yml)
```yaml
volumes:
  dj-data-prod:    # PostgreSQL data
  dj-files:        # ไฟล์ทั้งหมด (shared: backend + nginx)

backend:
  volumes:
    - dj-files:/app/uploads      # read-write

frontend:
  volumes:
    - dj-files:/app/uploads:ro   # read-only (serve ผ่าน nginx)
```

---

## 🖥️ สิ่งที่ต้องทำบน Server

### ข้อกำหนดขั้นต่ำ

| ทรัพยากร | ขั้นต่ำ | แนะนำ |
|---------|--------|-------|
| CPU | 2 Core | 4 Core |
| RAM | 4 GB | 8 GB |
| Disk | 50 GB | 100+ GB |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### ขั้นตอน Setup Server

```bash
# 1. ติดตั้ง Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Clone repo
git clone https://github.com/chanetw/JD-System.git && cd JD-System

# 3. ตั้งค่า ENV
cp backend/api-server/.env.production.example backend/api-server/.env.production
nano backend/api-server/.env.production   # แก้: PASSWORD, DOMAIN, JWT_SECRET

# 4. Deploy
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
```

---

## ✅ ตาราง ENV สรุป

| ENV | Supabase (Cloud) | Self-hosted (Docker) |
|-----|-----------------|---------------------|
| `DATABASE_MODE` | `supabase` | `local` |
| `DATABASE_URL` | `postgresql://...supabase.com...` | `postgresql://postgres:pw@postgres:5432/dj_system` |
| `STORAGE_PROVIDER` | `supabase` | `local` |
| `UPLOADS_DIR` | (ไม่ใช้) | `/app/uploads` |
| `FILE_RETENTION_DAYS` | (ไม่ใช้) | `30` |
| `VITE_FRONTEND_MODE` | `supabase` | `api_only` |
| `SUPABASE_URL` | ต้องมี | ไม่ต้องตั้ง |
| `SUPABASE_SERVICE_ROLE_KEY` | ต้องมี | ไม่ต้องตั้ง |
| `VITE_SUPABASE_URL` | ต้องมี | ไม่ต้องตั้ง |
