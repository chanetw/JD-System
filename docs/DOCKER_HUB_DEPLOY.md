# คู่มือ Deploy — Docker Hub (Code-Only)

> **วิธี:** Pull images จาก Docker Hub → Recreate containers → Verify  
> **ใช้เมื่อ:** มีการ push images ใหม่ขึ้น `chanetw/dj-system-*` และต้องการ deploy บน server  
> **ข้อกำหนด:** ไม่มีการเปลี่ยน database schema (ไม่มี migration ใหม่)  
> **Script อัตโนมัติ:** [`scripts/deploy-hub.sh`](../scripts/deploy-hub.sh)

---

## ข้อกำหนดเบื้องต้น (Prerequisites)

| รายการ | ตรวจสอบ |
|--------|---------|
| Docker Engine + Docker Compose ติดตั้งบน server | `docker compose version` |
| ไฟล์ `docker-compose.prod.yml` อยู่บน server | `ls docker-compose.prod.yml` |
| ไฟล์ `backend/api-server/.env.production` มีครบ | `cat backend/api-server/.env.production` |
| PostgreSQL container `dj-postgres-prod` healthy | `docker inspect --format='{{.State.Health.Status}}' dj-postgres-prod` |
| Server เข้าถึง Docker Hub ได้ | `docker pull hello-world` |

---

## วิธีที่ 1 — Script อัตโนมัติ (แนะนำ)

```bash
# SSH เข้า production server
ssh user@your-server

# ไปที่ project directory
cd /path/to/dj-system

# ครั้งแรก: ให้สิทธิ์รัน
chmod +x scripts/deploy-hub.sh

# Deploy
./scripts/deploy-hub.sh
```

**Script ทำอะไรบ้าง:**
1. ตรวจสอบ `docker-compose.prod.yml` และ Docker Compose พร้อม
2. แสดงสถานะ containers ก่อน deploy
3. Pull images ใหม่ (เฉพาะ `backend` + `frontend` — ไม่แตะ `postgres`)
4. Recreate containers ด้วย `--no-deps --force-recreate`
5. รอ backend health check (timeout 90 วินาที)
6. ตรวจ `/health`, `/api/version`, frontend HTTP 200
7. แสดง backend startup logs 10 บรรทัดสุดท้าย
8. แสดงสรุปและ checklist manual test

---

## วิธีที่ 2 — Manual (3 คำสั่ง)

```bash
# 1. Pull images ใหม่
docker compose -f docker-compose.prod.yml pull backend frontend

# 2. Recreate containers
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend

# 3. ตรวจสถานะ
docker compose -f docker-compose.prod.yml ps
```

---

## รายละเอียดแต่ละขั้นตอน (Manual แบบละเอียด)

### ขั้นตอนที่ 1 — SSH + ตรวจสถานะก่อน

```bash
ssh user@your-server
cd /path/to/dj-system

# ดู containers ปัจจุบัน
docker compose -f docker-compose.prod.yml ps

# ตรวจ postgres
docker inspect --format='{{.State.Health.Status}}' dj-postgres-prod
# ต้องได้: healthy
```

### ขั้นตอนที่ 2 — Pull Images

```bash
docker compose -f docker-compose.prod.yml pull backend frontend
```

- ดาวน์โหลด image ใหม่จาก `chanetw/dj-system-backend:latest` และ `chanetw/dj-system-frontend:latest`
- Docker เลือก platform อัตโนมัติ (amd64 หรือ arm64 ตาม server)
- **`postgres` image ไม่ถูก pull**

### ขั้นตอนที่ 3 — Recreate Containers

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

| Flag | หน้าที่ |
|------|--------|
| `-d` | รัน background (detached) |
| `--no-deps` | **ไม่แตะ postgres** แม้ backend depends_on postgres |
| `--force-recreate` | สร้าง container ใหม่แม้ image tag ยังเป็น `latest` |
| `backend frontend` | ระบุเฉพาะ 2 services นี้ |

**สิ่งที่เกิดขึ้นอัตโนมัติเมื่อ backend เริ่ม (`docker-entrypoint.sh`):**

```
1. prisma migrate deploy   → no-op (migrations applied แล้ว)
2. ตรวจ RUN_SEED=true     → ไม่ตั้ง → ข้ามไป
3. ตรวจ SEED_ADMIN=true   → ไม่ตั้ง → ข้ามไป
4. exec node src/index.js → เริ่ม Express + Socket.io
5. เริ่ม cron services     → rejectionAutoClose, jobReminder, fileCleanup
```

### ขั้นตอนที่ 4 — ตรวจสถานะ Containers

```bash
docker compose -f docker-compose.prod.yml ps
```

**ผลที่คาดหวัง:**
```
NAME                STATUS                   PORTS
dj-postgres-prod    Up X hours (healthy)     0.0.0.0:5434->5432/tcp
dj-backend-prod     Up X seconds (healthy)   0.0.0.0:3000->3000/tcp
dj-frontend-prod    Up X seconds             0.0.0.0:80->80/tcp
```

> ถ้า backend ยัง `(health: starting)` รอ ~30 วินาทีแล้ว `ps` ใหม่

### ขั้นตอนที่ 5 — Health Check Endpoints

```bash
# Backend health
curl -s http://localhost:3000/health
# ต้องได้: {"status":"ok", ...}

# API version (ผ่าน nginx)
curl -s http://localhost/api/version
# ต้องได้: {"version":"1.0.0"}

# Frontend
curl -sI http://localhost | head -2
# ต้องได้: HTTP/1.1 200 OK
```

### ขั้นตอนที่ 6 — ตรวจ Logs

```bash
# Startup logs
docker logs dj-backend-prod --tail 30

# สิ่งที่ต้องเห็น:
#   ✅ "DJ System Backend - Starting..."
#   ✅ "Running Prisma migrate deploy..."
#   ✅ "No pending migrations" หรือ "Migrations applied"
#   ✅ "Starting Node.js server..."
#   ✅ "Server running on port 3000"

# ตรวจ error
docker logs dj-backend-prod 2>&1 | grep -iE "error|fail|crash" | grep -v "⚠️"
# ต้องไม่มี critical errors

# ตรวจ Socket.io
docker logs dj-backend-prod 2>&1 | grep -i "socket"
```

### ขั้นตอนที่ 7 — Functional Test (Checklist)

- [ ] เปิด browser → login ด้วย user ที่มีอยู่
- [ ] Dashboard → Flat view → ไม่แสดง parent jobs
- [ ] สร้างงานใหม่ → เลือก job type → due date คำนวณให้อัตโนมัติ
- [ ] เปลี่ยน job type → due date อัพเดตทันที
- [ ] Admin → User Management → Reset Password → เห็น temp password
- [ ] กด Forgot Password 2 ครั้งติด → เห็น cooldown message
- [ ] อัพโหลดไฟล์ → ตรวจ MIME type validation ทำงาน

---

## Rollback

### Option A — Rollback ด้วย Date Tag (เร็วที่สุด)

```bash
# หยุด
docker compose -f docker-compose.prod.yml stop backend frontend

# เปลี่ยน image tag ใน docker-compose.prod.yml
# image: chanetw/dj-system-backend:v2026.03.20   ← tag ก่อนหน้า
# image: chanetw/dj-system-frontend:v2026.03.20  ← tag ก่อนหน้า

# Deploy version เดิม
docker compose -f docker-compose.prod.yml pull backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

### Option B — Rollback ด้วย Image Digest

```bash
# ดู digest ที่มี
docker images chanetw/dj-system-backend --digests

# Retag ด้วย digest เดิม
docker pull chanetw/dj-system-backend@sha256:<previous-digest>
docker tag  chanetw/dj-system-backend@sha256:<previous-digest> chanetw/dj-system-backend:latest

docker pull chanetw/dj-system-frontend@sha256:<previous-digest>
docker tag  chanetw/dj-system-frontend@sha256:<previous-digest> chanetw/dj-system-frontend:latest

# Recreate
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

### Option C — Rebuild จาก Git Commit แล้ว Push ใหม่

```bash
# บน Mac (build machine)
git log --oneline -10
git checkout <previous-commit>

docker buildx build --platform linux/amd64,linux/arm64 --push \
  -t chanetw/dj-system-backend:rollback \
  -f backend/api-server/Dockerfile ./backend

docker buildx build --platform linux/amd64,linux/arm64 --push \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_FRONTEND_MODE=api_only \
  --build-arg VITE_AUTH_MODE=jwt_only \
  -t chanetw/dj-system-frontend:rollback \
  -f frontend/Dockerfile ./frontend

# บน server: เปลี่ยน tag เป็น rollback แล้ว pull + recreate
```

---

## Safety Confirmation — สิ่งที่ไม่ถูกแตะ

| ส่วนประกอบ | สถานะ | เหตุผล |
|-----------|--------|-------|
| PostgreSQL container | ✅ ปลอดภัย | `--no-deps` ป้องกัน restart |
| Database volume `dj-data-prod` | ✅ ปลอดภัย | Volumes persist ข้าม container recreate |
| Database schema | ✅ ปลอดภัย | `prisma migrate deploy` = idempotent |
| Database data / records | ✅ ปลอดภัย | ไม่มี seed หรือ data change |
| Upload files `dj-files-prod` | ✅ ปลอดภัย | Volume สอง containers share อยู่แล้ว |
| `.env.production` | ✅ ปลอดภัย | ไม่มีการแก้ไข config |

---

## Known Issues & Troubleshooting

| อาการ | สาเหตุ | วิธีแก้ |
|-------|--------|--------|
| Backend health: `starting` นาน | Node.js cold start + Prisma migrate | รอ 30-60 วินาที |
| Backend health: `unhealthy` | DB connection fail หรือ crash | `docker logs dj-backend-prod --tail 50` |
| Frontend แสดง version เก่า | Browser cache | Ctrl+Shift+R (hard refresh) |
| Socket.io ไม่เชื่อมต่อ | nginx WebSocket proxy header | `docker logs dj-frontend-prod` |
| `prisma migrate deploy` fail | ไม่ใช่ critical — entrypoint continue | ดู logs แต่ server ยังรันได้ |
| `docker compose pull` ช้า | Network หรือ image ใหญ่ | ใช้ `docker compose pull --parallel backend frontend` |
| Port 80 ถูกใช้อยู่ | Service อื่น | `lsof -i :80` ตรวจก่อน |

---

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | Production orchestration (postgres + backend + frontend) |
| [`backend/api-server/Dockerfile`](../backend/api-server/Dockerfile) | Backend image — Node.js + Prisma path workaround |
| [`frontend/Dockerfile`](../frontend/Dockerfile) | Frontend — multi-stage build (node → nginx) |
| [`backend/api-server/docker-entrypoint.sh`](../backend/api-server/docker-entrypoint.sh) | Startup: migrate → optional seed → start server |
| [`frontend/nginx.conf`](../frontend/nginx.conf) | Reverse proxy `/api` → backend, SPA fallback, cache headers |
| [`scripts/deploy-hub.sh`](../scripts/deploy-hub.sh) | Script deploy อัตโนมัติ (pull + recreate + healthcheck) |
| [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) | binaryTargets: native + arm64 + amd64 |

---

## วิธี Build & Push Images ใหม่ (บน Mac)

ทุกครั้งที่แก้ code และต้องการ release บน server:

```bash
cd /path/to/DJ-System

# 1. Commit code
git add -A && git commit -m "fix: <description>"

# 2. Setup buildx (ครั้งแรกเท่านั้น)
docker buildx create --use --name dj-multiplatform 2>/dev/null || docker buildx use dj-multiplatform
docker buildx inspect --bootstrap

# 3. Build & Push Backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  -t chanetw/dj-system-backend:latest \
  -t chanetw/dj-system-backend:<DATE_TAG> \
  -f backend/api-server/Dockerfile \
  ./backend

# 4. Build & Push Frontend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_FRONTEND_MODE=api_only \
  --build-arg VITE_AUTH_MODE=jwt_only \
  -t chanetw/dj-system-frontend:latest \
  -t chanetw/dj-system-frontend:<DATE_TAG> \
  -f frontend/Dockerfile \
  ./frontend

# 5. Verify
docker buildx imagetools inspect chanetw/dj-system-backend:<DATE_TAG> | grep Platform
docker buildx imagetools inspect chanetw/dj-system-frontend:<DATE_TAG> | grep Platform

# 6. Deploy บน server (ด้วย script หรือ manual ตามด้านบน)
```

> **หมายเหตุ:** `<DATE_TAG>` เช่น `v2026.03.27` — ใช้ format `vYYYY.MM.DD`  
> ทั้งผลการ build backend + frontend ใช้เวลาประมาณ 10-15 นาที (multi-platform)
