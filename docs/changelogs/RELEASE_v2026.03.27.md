# Release v2026.03.27 — สรุปการแก้ไขและคู่มือ Deploy

> **วันที่:** 27 มีนาคม 2026  
> **Commit:** `d70d3cd` fix: v2026.03.27  
> **Docker Images:** `chanetw/dj-system-backend:v2026.03.27` / `chanetw/dj-system-frontend:v2026.03.27`  
> **Platforms:** linux/amd64 + linux/arm64  
> **ผลกระทบ Database:** ❌ ไม่มี (code-only release)

---

## 1. สรุปรายการแก้ไข

### 1.1 Storage Upload — ขยายขนาดและ MIME Types
- **อาการ:** อัพโหลดไฟล์บางประเภทไม่ได้ / ไฟล์ใหญ่เกินไม่ได้
- **แก้ไข:** ปรับ upload size limits และเพิ่ม MIME type validation
- **ไฟล์:** `backend/api-server/src/routes/storage.js`

### 1.2 Forgot Password — Cooldown + UX
- **อาการ:** ผู้ใช้กดลืมรหัสผ่านซ้ำได้ไม่จำกัด / ไม่มี feedback ชัดเจน
- **แก้ไข:**
  - เพิ่ม cooldown กันกดซ้ำ (backend)
  - Reset password ส่งกลับ temporary password (backend)
  - ปรับ UI ให้แสดง temp password ที่ได้รับ
- **ไฟล์:**
  - `backend/api-server/src/v2/index.js`
  - `frontend/src/modules/core/auth-v2/pages/ForgotPassword.tsx`
  - `frontend/src/modules/core/auth-v2/pages/ResetPassword.tsx`
  - `frontend/src/modules/core/auth-v2/pages/ForceChangePassword.tsx`
  - `frontend/src/modules/core/stores/authStoreV2.ts`
  - `frontend/src/modules/shared/services/modules/authServiceV2.ts`

### 1.3 User Management — Reset Password Modal
- **อาการ:** Admin reset password ให้ user → ไม่เห็น temporary password ที่สร้าง
- **แก้ไข:** เพิ่ม modal แสดง temporary password หลัง reset สำเร็จ
- **ไฟล์:** `frontend/src/modules/features/admin/pages/UserManagement.jsx`

### 1.4 Dashboard — ซ่อน Parent Jobs ใน Flat View
- **อาการ:** หน้า Dashboard flat view แสดง parent jobs ที่ไม่ควรเห็น (parent เป็นแค่ container ไม่ใช่งานจริง)
- **แก้ไข:**
  - Flat view กรอง `!job.isParent` ออก
  - Filter options (assignee, status) กรอง parent ออกเสมอ ทุก view mode
  - ลบ `showParent` state ที่ไม่ได้ใช้
- **ไฟล์:** `frontend/src/modules/features/dashboard/pages/Dashboard.jsx`

### 1.5 CreateJobPage — Due Date อัตโนมัติเมื่อเปลี่ยน Job Types
- **อาการ:** เลือก job type แล้วเปลี่ยน/ลบ → due date ไม่อัพเดตตาม SLA ใหม่
- **แก้ไข:**
  - เพิ่ม helper functions: `formatDateForInput`, `isNonWorkingDay`, `getCriticalPathSla`, `getEffectiveSla`, `getRecommendedDueDate`
  - สร้าง `jobTypeSelectionSignature` จาก selectedJobTypes → ใช้เป็น key ใน useEffect auto-reset due date
  - ลบ stale dueDate state ที่ซ้ำซ้อน
  - Normalize `predecessorIndex` หลังลบ job type ออก (ป้องกัน chain index เพี้ยน)
- **ไฟล์:** `frontend/src/modules/features/job-request/pages/CreateJobPage.jsx`

### 1.6 Admin Service — nextJobTypeId + Cache
- **อาการ:** Job type chaining (nextJobTypeId) ไม่ทำงาน / cache ไม่ invalidate หลังแก้ไข
- **แก้ไข:** เพิ่ม nextJobTypeId support, แก้ cache invalidation, ลบ duplicate SLA logic
- **ไฟล์:** `frontend/src/modules/shared/services/modules/adminService.js`

### 1.7 Nginx — index.html No-Cache Headers
- **อาการ:** Deploy frontend ใหม่แล้ว browser ยังเห็น version เก่า
- **แก้ไข:** เพิ่ม `no-store, no-cache, must-revalidate` headers สำหรับ index.html
- **ไฟล์:** `frontend/nginx.conf`

---

## 2. ตารางสรุป

| # | ปัญหา | ประเภท | ไฟล์หลัก | DB Impact |
|---|--------|--------|----------|-----------|
| 1.1 | Storage upload limits | Backend | `storage.js` | ❌ |
| 1.2 | Forgot/Reset password UX | Full-stack | `v2/index.js`, auth pages | ❌ |
| 1.3 | Reset password modal | Frontend | `UserManagement.jsx` | ❌ |
| 1.4 | Dashboard parent filter | Frontend | `Dashboard.jsx` | ❌ |
| 1.5 | Due date auto-recalc | Frontend | `CreateJobPage.jsx` | ❌ |
| 1.6 | Job type chain + cache | Frontend | `adminService.js` | ❌ |
| 1.7 | index.html cache | Frontend | `nginx.conf` | ❌ |

**ผลกระทบ Database: ไม่มี** — ทุกการแก้ไขเป็น code-only, ไม่มี migration ใหม่

---

## 3. Docker Images ที่ Push ขึ้น Docker Hub

| Image | Tags | Platforms | Digest |
|-------|------|-----------|--------|
| `chanetw/dj-system-backend` | `latest`, `v2026.03.27` | linux/amd64, linux/arm64 | `sha256:7e29a05b5192...` |
| `chanetw/dj-system-frontend` | `latest`, `v2026.03.27` | linux/amd64, linux/arm64 | `sha256:9e7bef174f9b...` |

---

## 4. คู่มือ Deploy

> 📖 ดูคู่มือฉบับเต็มได้ที่ **[docs/DOCKER_HUB_DEPLOY.md](../DOCKER_HUB_DEPLOY.md)**

### สรุปย่อ (3 คำสั่ง)

```bash
# Option A: Script อัตโนมัติ (แนะนำ)
./scripts/deploy-hub.sh
```

```bash
# Option B: Manual
docker compose -f docker-compose.prod.yml pull backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
docker compose -f docker-compose.prod.yml ps
```

> ⚠️ **`--no-deps`** = postgres container ไม่ถูกแตะ  
> ⚠️ **`--force-recreate`** = บังคับสร้าง container ใหม่แม้ tag เป็น `latest`

### วิธีที่ 1: ใช้ Deploy Script (แนะนำ)

```bash
# SSH เข้า server
ssh user@your-server

# ไปที่ project directory
cd /path/to/dj-system

# ให้สิทธิ์รันสคริปต์ (ครั้งแรกเท่านั้น)
chmod +x scripts/deploy-hub.sh

# รัน deploy
./scripts/deploy-hub.sh
```

**สคริปต์จะทำให้อัตโนมัติ:**
1. ✅ ตรวจสอบไฟล์ที่จำเป็น
2. ✅ แสดงสถานะ containers ปัจจุบัน
3. ✅ Pull images ใหม่ (เฉพาะ backend + frontend)
4. ✅ Recreate containers (postgres ไม่ถูกแตะ)
5. ✅ รอ health check (timeout 90 วินาที)
6. ✅ ตรวจ health/version/frontend endpoints
7. ✅ แสดง backend startup logs

### วิธีที่ 2: รันคำสั่งเอง (Manual)

#### ขั้นตอนที่ 1: SSH เข้า Server
```bash
ssh user@your-server
cd /path/to/dj-system
```

#### ขั้นตอนที่ 2: ตรวจสถานะก่อน Deploy
```bash
# ดู containers ปัจจุบัน
docker compose -f docker-compose.prod.yml ps

# ตรวจว่า postgres healthy
docker inspect --format='{{.State.Health.Status}}' dj-postgres-prod
# ต้องได้: healthy
```

#### ขั้นตอนที่ 3: Pull Images ใหม่
```bash
# pull เฉพาะ backend + frontend (ไม่แตะ postgres)
docker compose -f docker-compose.prod.yml pull backend frontend
```

**สิ่งที่เกิดขึ้น:**
- Docker จะดาวน์โหลด image ใหม่จาก Docker Hub
- เลือก platform ที่ตรงกับ server อัตโนมัติ (amd64 หรือ arm64)
- Postgres image จะ **ไม่ถูก pull**

#### ขั้นตอนที่ 4: Recreate Containers
```bash
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

**Flags สำคัญ:**
| Flag | ทำอะไร | ทำไมต้องใช้ |
|------|--------|------------|
| `-d` | รันเบื้องหลัง | ไม่ block terminal |
| `--no-deps` | ไม่แตะ dependencies (postgres) | **ป้องกัน DB container restart** |
| `--force-recreate` | สร้าง container ใหม่แม้ image tag เดิม | เพราะใช้ `:latest` tag |
| `backend frontend` | ระบุ services | **ไม่รวม postgres** |

**สิ่งที่เกิดขึ้นอัตโนมัติเมื่อ backend เริ่ม:**
1. `docker-entrypoint.sh` รัน `prisma migrate deploy`
   - ถ้า migrations applied แล้ว → **ข้ามไป (no-op)**
   - ถ้ามี pending migrations → apply อัตโนมัติ
2. ตรวจ `RUN_SEED` env → **ไม่ได้ตั้ง** → ข้ามไป
3. ตรวจ `SEED_ADMIN` env → **ไม่ได้ตั้ง** → ข้ามไป
4. เริ่ม Node.js server บน port 3000
5. เริ่ม cron services (rejection auto-close, job reminder, file cleanup)

#### ขั้นตอนที่ 5: ตรวจสถานะหลัง Deploy
```bash
# ดู container status — ทุก service ต้อง "Up" + "healthy"
docker compose -f docker-compose.prod.yml ps
```

**ผลที่คาดหวัง:**
```
NAME                STATUS              PORTS
dj-postgres-prod    Up X hours (healthy) 0.0.0.0:5434->5432/tcp
dj-backend-prod     Up X seconds (healthy) 0.0.0.0:3000->3000/tcp
dj-frontend-prod    Up X seconds         0.0.0.0:80->80/tcp
```

#### ขั้นตอนที่ 6: Health Check
```bash
# Backend health
curl -s http://localhost:3000/health | python3 -m json.tool
# ต้องได้: {"status": "ok", ...}

# API version
curl -s http://localhost/api/version
# ต้องได้: {"version":"1.0.0"}

# Frontend (ผ่าน nginx)
curl -sI http://localhost | head -3
# ต้องได้: HTTP/1.1 200 OK
```

#### ขั้นตอนที่ 7: ตรวจ Logs
```bash
# Backend startup logs
docker logs dj-backend-prod --tail 30

# ตรวจสิ่งที่ต้องเห็น:
#   "DJ System Backend - Starting..."
#   "Running Prisma migrate deploy..."
#   "No pending migrations" หรือ "applied successfully"
#   "Starting Node.js server..."
#   "Server running on port 3000"

# ตรวจว่าไม่มี error
docker logs dj-backend-prod --tail 100 2>&1 | grep -iE "error|fail|crash"
# ต้องไม่พบอะไร (หรือมีแค่ warning ที่ไม่สำคัญ)

# ตรวจ Socket.io
docker logs dj-backend-prod 2>&1 | grep -i "socket"
# ต้องเห็น: Socket.io initialized
```

#### ขั้นตอนที่ 8: Functional Test (Manual)
- [ ] เปิด browser → เข้าหน้า login → login สำเร็จ
- [ ] ตรวจ Dashboard → Flat view ไม่แสดง parent jobs
- [ ] สร้างงานทดสอบ → due date คำนวณตาม SLA ถูกต้อง
- [ ] เปลี่ยน job type → due date อัพเดตอัตโนมัติ
- [ ] ทดสอบ Forgot Password → เห็น cooldown ถ้ากดซ้ำ
- [ ] Admin → Reset Password → เห็น temp password ใน modal
- [ ] อัพโหลดไฟล์ → ตรวจ MIME type validation

---

## 5. วิธี Rollback (ถ้ามีปัญหา)

### 5.1 Rollback ด้วย Date Tag
```bash
# หยุด containers ที่มีปัญหา
docker compose -f docker-compose.prod.yml stop backend frontend

# แก้ docker-compose.prod.yml → เปลี่ยน image tag
# จาก:
#   image: chanetw/dj-system-backend:latest
# เป็น:
#   image: chanetw/dj-system-backend:<previous-tag>
# ทำเหมือนกันกับ frontend

# pull + recreate ด้วย image เดิม
docker compose -f docker-compose.prod.yml pull backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

### 5.2 Rollback ด้วย Image Digest
```bash
# ดู image history
docker images chanetw/dj-system-backend --digests --format "table {{.Tag}}\t{{.Digest}}\t{{.CreatedAt}}"

# pull ด้วย specific digest
docker pull chanetw/dj-system-backend@sha256:<previous-digest>
docker tag chanetw/dj-system-backend@sha256:<previous-digest> chanetw/dj-system-backend:latest

# recreate
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

### 5.3 Rollback จาก Git Commit
```bash
# บน Mac (build machine)
git log --oneline -10
git checkout <previous-commit>

# rebuild + push
docker buildx build --platform linux/amd64,linux/arm64 --push \
  -t chanetw/dj-system-backend:rollback \
  -f backend/api-server/Dockerfile ./backend

# บน server
# แก้ docker-compose.prod.yml → image: chanetw/dj-system-backend:rollback
docker compose -f docker-compose.prod.yml pull backend
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend
```

---

## 6. สิ่งที่ไม่ถูกแตะ (Safety Confirmation)

| ส่วนประกอบ | สถานะ | รายละเอียด |
|-----------|--------|------------|
| PostgreSQL container | ❌ ไม่แตะ | `--no-deps` flag ป้องกัน restart |
| Database volume (`dj-data-prod`) | ❌ ไม่แตะ | Docker volume persist แม้ recreate container |
| Database schema | ❌ ไม่มี migration ใหม่ | `prisma migrate deploy` = no-op |
| Database data | ❌ ไม่แตะ | ไม่มี seed หรือ data manipulation |
| Upload files (`dj-files-prod`) | ❌ ไม่แตะ | Volume persist ข้าม recreate |
| `.env.production` | ❌ ไม่แก้ | ใช้ config เดิมทั้งหมด |

---

## 7. Known Issues & Gotchas

| # | ปัญหาที่อาจเจอ | วิธีแก้ |
|---|----------------|--------|
| 1 | Backend health check timeout | ตรวจ logs: `docker logs dj-backend-prod --tail 50` — อาจเป็น DB connection issue |
| 2 | Frontend แสดง version เก่า | กด Ctrl+Shift+R (hard refresh) — nginx ส่ง no-cache แล้วแต่ browser อาจ cache อยู่ |
| 3 | Socket.io ไม่เชื่อมต่อ | ตรวจว่า nginx proxy WebSocket headers ถูก — `docker logs dj-frontend-prod` |
| 4 | `prisma migrate deploy` error | non-critical — entrypoint จะ continue ถึงแม้ migration fail, ตรวจ logs |
| 5 | Image pull ช้ามาก | ใช้ `docker compose pull --parallel` หรือตรวจ internet connection |

---

## 8. ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| `docker-compose.prod.yml` | Production orchestration (3 services) |
| `backend/api-server/Dockerfile` | Backend image build |
| `frontend/Dockerfile` | Frontend multi-stage build (node → nginx) |
| `backend/api-server/docker-entrypoint.sh` | Startup: migrate → seed → start |
| `frontend/nginx.conf` | Reverse proxy + caching rules |
| `scripts/deploy-hub.sh` | **ใหม่** — Automated deploy from Docker Hub |
| `backend/prisma/schema.prisma` | Database schema + Prisma config |
