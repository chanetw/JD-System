# DJ System Docker Handoff (DevOps)

เอกสาร handoff สำหรับ build, push, deploy, verify และ rollback ระบบ DJ บน production ด้วย Docker Compose โดยยึดหลัก immutable image tags ไม่ใช้ `latest` เป็นค่าหลักในการขึ้น prod

---

## 0) Release ล่าสุด (อ้างอิง)

| รายการ | ค่า |
|---|---|
| Release tag | `v2026.04.27-e002338` |
| วันที่ build | 2026-04-27 |
| Commit | `e002338` (HEAD → main) |
| Backend image | `chanetw/dj-system-backend:v2026.04.27-e002338` |
| Frontend image | `chanetw/dj-system-frontend:v2026.04.27-e002338` |
| Platforms | `linux/amd64`, `linux/arm64` |
| GitHub repo | https://github.com/chanetw/JD-System |

ตรวจสอบ manifest ได้ที่:
```bash
docker buildx imagetools inspect chanetw/dj-system-backend:v2026.04.27-e002338
docker buildx imagetools inspect chanetw/dj-system-frontend:v2026.04.27-e002338
```

---

## 1) สิ่งที่ต้องส่งให้ DevOps (Handoff Package)

### ไฟล์ที่ต้องส่ง (จาก Git repository)

ทั้งหมดอยู่ใน repository `github.com/chanetw/JD-System` branch `main`

| ไฟล์ | วัตถุประสงค์ |
|---|---|
| `docker-compose.prod.yml` | ไฟล์ Compose หลักสำหรับ production |
| `scripts/deploy-docker.sh` | Deploy script มาตรฐาน (pull + up + health) |
| `scripts/deploy-hub.sh` | Deploy แบบ one-command สำหรับ Docker Hub flow |
| `scripts/verify-deployment.sh` | ตรวจสอบ health หลัง deploy |
| `scripts/build-arm.sh` | Build multi-arch แล้ว push Docker Hub |
| `frontend/nginx.conf` | Nginx config ภายใน frontend container |

### ไฟล์ Secret/Env ที่ต้องส่งแยก (ไม่มีใน Git)

> ไฟล์เหล่านี้ไม่ commit เข้า repository ต้องส่งผ่านช่องทางที่ปลอดภัย เช่น secret manager หรือ encrypted file

| ไฟล์ | วัตถุประสงค์ |
|---|---|
| `backend/api-server/.env.production` | ค่า env หลักของ backend (DATABASE_URL, JWT_SECRET, SMTP, ฯลฯ) |
| `backend/api-server/envprod.txt` | ค่า env เพิ่มเติม (SMTP config, third-party keys) |

### ข้อมูลที่แนบมาพร้อมกัน

1. Release tag: `v2026.04.27-e002338`
2. Rollback tag ก่อนหน้า: ดูจาก `docker buildx imagetools inspect chanetw/dj-system-backend:latest`
3. Migration status: มี Prisma migration ใหม่ 1 รายการ (`20260424000000_remove_rejection_requests`) — รัน auto ตอน backend start
4. Changelog / breaking changes: ดูหัวข้อ "สิ่งที่เปลี่ยนแปลง" ด้านล่าง

### สิ่งที่เปลี่ยนแปลงใน release นี้

- ลบ rejection request system ออก (table + routes + UI)
- แก้ MyQueue navigation flicker (tab state sync)
- แก้ Thai filename garbling บน file upload
- Portal: Media Portal เปลี่ยน tab เป็น dropdown พร้อม file count
- Portal: ซ่อนไฟล์ที่ยังไม่ผูกกับ job จากหน้า portal

---

## 2) Prerequisites ของเครื่องที่ DevOps ใช้งาน

### สำหรับเครื่องที่ทำ build/push image (ถ้า build เอง)

| รายการ | ข้อกำหนด |
|---|---|
| Docker Engine | ≥ 24.x พร้อม `docker buildx` |
| Docker Desktop | ≥ 4.x หรือ Docker Engine + buildx plugin |
| Docker Hub login | `docker login` ด้วย account `chanetw` |
| Platform | macOS/Linux (รองรับ QEMU emulation สำหรับ cross-arch) |
| Network | เข้าถึง `registry-1.docker.io` ได้ |
| Source code | `git clone https://github.com/chanetw/JD-System.git` |

ตรวจสอบ buildx:
```bash
docker buildx version
docker buildx ls
```

### สำหรับ Production Server

| รายการ | ข้อกำหนด |
|---|---|
| Docker Engine | ≥ 24.x |
| Docker Compose | ≥ v2.x (CLI plugin ไม่ใช่ standalone) |
| OS | Linux (amd64 หรือ arm64) |
| พอร์ตที่เปิด | 80 (frontend), 3000 (backend), 5434 (postgres) หรือตาม override |
| Disk space | ≥ 10 GB สำหรับ images + postgres volume + uploads |
| `.env.production` | ต้องสร้างก่อน deploy (ดู section 4) |

ตรวจสอบ docker compose:
```bash
docker compose version
# ต้องได้ v2.x ขึ้นไป ไม่ใช่ docker-compose v1
```

---

## 3) Image strategy สำหรับ production

ข้อกำหนด
- ใช้ immutable tag ทุกครั้ง รูปแบบ `v<วันที่>-<commit short SHA>` เช่น `v2026.04.27-e002338`
- ไม่ใช้ `:latest` เป็น release หลักสำหรับ production
- frontend และ backend ต้องใช้ release tag เดียวกันในหนึ่ง rollout

image refs มาตรฐาน
- `chanetw/dj-system-backend:<release-tag>`
- `chanetw/dj-system-frontend:<release-tag>`

หมายเหตุ
- `docker-compose.prod.yml` รองรับ override ผ่าน env vars `BACKEND_IMAGE` และ `FRONTEND_IMAGE`
- production script จะ block การใช้ `:latest` ใน pull mode โดย default

---

## 4) ตัวอย่างไฟล์ .env.production ที่ต้องเตรียม

สร้างไฟล์ `backend/api-server/.env.production` บน production server ตามนี้:

```env
# === Database ===
DATABASE_URL=postgresql://djuser:<password>@localhost:5432/djsystem

# === Auth ===
JWT_SECRET=<สตริง random ≥ 32 ตัว สร้างด้วย: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRES_IN=7d
NODE_ENV=production

# === Origin ===
ALLOWED_ORIGINS=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# === Storage ===
STORAGE_PROVIDER=local
UPLOAD_DIR=/app/uploads

# === SMTP (ถ้าใช้ email) ===
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=<password>
SMTP_FROM=DJ System <noreply@example.com>
```

> **หมายเหตุ:** `SMTP_FROM` ต้องไม่มี quote ครอบ ใช้ `SMTP_FROM=Name <mail@example.com>` เท่านั้น
> Password ใน DATABASE_URL ห้ามมีตัวอักษร `+`, `/`, `=` ให้ใช้ hex password แทน

---

## 5) ขั้นตอนสร้าง image สำหรับ up version (Developer ทำ)

> **DevOps ไม่ต้อง build เอง** — image push ขึ้น Docker Hub แล้ว ข้ามไป section 6 ได้เลย

กรณีต้องการ build ใหม่จาก source:
```bash
# clone source code
git clone https://github.com/chanetw/JD-System.git
cd JD-System

# build + push multi-arch พร้อม tag immutable และ latest
COMMIT=$(git rev-parse --short HEAD)
RELEASE_TAG="v$(date +%Y.%m.%d)-${COMMIT}"
./scripts/build-arm.sh --push --release-tag "${RELEASE_TAG}" --tag-latest
```

ผลลัพธ์ที่ต้องได้
- `chanetw/dj-system-backend:<release-tag>` พร้อม `linux/amd64` และ `linux/arm64`
- `chanetw/dj-system-frontend:<release-tag>` พร้อม `linux/amd64` และ `linux/arm64`
- `:latest` ถูกอัปเดตด้วย

---

## 6) ขั้นตอน deploy มาตรฐานบน production server

### ขั้นตอนทำครั้งแรก (First-time setup)

```bash
# 1. clone repo
git clone https://github.com/chanetw/JD-System.git
cd JD-System

# 2. สร้างไฟล์ env (ดู section 4)
cp backend/api-server/.env.example backend/api-server/.env.production
# แก้ไขค่าให้ถูกต้อง
nano backend/api-server/.env.production

# 3. deploy ครั้งแรกพร้อม local postgres
export RELEASE_TAG=v2026.04.27-e002338
./scripts/deploy-docker.sh --target all --action pull --release-tag "${RELEASE_TAG}" --with-local-db

# 4. ตรวจสอบ
./scripts/verify-deployment.sh
```

### ขั้นตอน update version ปกติ

#### วิธี A — ใช้ deploy script (แนะนำ)

```bash
export RELEASE_TAG=v2026.04.27-e002338

# deploy backend ก่อน (รัน migration อัตโนมัติ)
./scripts/deploy-docker.sh --target backend --action pull --release-tag "${RELEASE_TAG}"
./scripts/verify-deployment.sh

# deploy frontend
./scripts/deploy-docker.sh --target frontend --action pull --release-tag "${RELEASE_TAG}"
./scripts/verify-deployment.sh
```

#### วิธี B — ใช้ deploy-hub script (one-command)

```bash
export RELEASE_TAG=v2026.04.27-e002338
./scripts/deploy-hub.sh --release-tag "${RELEASE_TAG}"
```

#### วิธี C — one-off manual

```bash
export RELEASE_TAG=v2026.04.27-e002338
BACKEND_IMAGE=chanetw/dj-system-backend:${RELEASE_TAG} \
FRONTEND_IMAGE=chanetw/dj-system-frontend:${RELEASE_TAG} \
docker compose -f docker-compose.prod.yml pull backend frontend

BACKEND_IMAGE=chanetw/dj-system-backend:${RELEASE_TAG} \
FRONTEND_IMAGE=chanetw/dj-system-frontend:${RELEASE_TAG} \
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

สิ่งที่ deploy script ทำให้อัตโนมัติ
- ตรวจ env required vars ก่อน deploy
- ตรวจ compose config
- block `:latest` ใน pull mode (เพื่อความปลอดภัย)
- รัน `prisma migrate deploy` สำหรับ backend ก่อน up service
- รอ health check ของ backend และ frontend

---

## 7) Verification หลัง deploy

```bash
./scripts/verify-deployment.sh
```

กรณีใช้พอร์ต custom:
```bash
BACKEND_URL=http://localhost:13000 \
FRONTEND_URL=http://localhost:8080 \
./scripts/verify-deployment.sh
```

Acceptance checklist ขั้นต่ำ
1. `docker compose -f docker-compose.prod.yml ps` ต้องขึ้นครบ ไม่มี Restarting
2. `GET /health` → HTTP 200
3. `GET /api/version` → HTTP 200 ทั้งตรง backend และผ่าน frontend proxy
4. `GET /` → โหลดหน้า login ได้
5. ไม่มี restart loop หลัง 2 นาที

---

## 8) การตั้งพอร์ตและ reverse proxy

ค่า mapping ปัจจุบัน (default)

| Service | Host port | Container port |
|---|---|---|
| Frontend (Nginx) | 80 | 80 |
| Backend (Express) | 3000 | 3000 |
| PostgreSQL | 5434 | 5432 |

Override ผ่าน env:
```env
BACKEND_HOST_PORT=13000
FRONTEND_HOST_PORT=8080
POSTGRES_PORT=15432
```

กรณีมี reverse proxy หน้า (nginx/caddy/traefik)
1. Proxy รับ HTTPS แล้ว forward ไป frontend port
2. Frontend nginx ภายใน container จะ proxy `/api/` และ `/socket.io/` ต่อไปยัง backend
3. ไม่ต้อง expose backend port ออก public
4. ผูก bind เป็น loopback:

```yaml
# docker-compose.prod.yml override
frontend:
  ports:
    - "127.0.0.1:8080:80"
backend:
  ports:
    - "127.0.0.1:13000:3000"
```

---

## 9) Rollback procedure

```bash
# ดู release tag ก่อนหน้า
docker buildx imagetools inspect chanetw/dj-system-backend:latest

# rollback ไป tag ก่อนหน้า
export PREV_TAG=v2026.04.23-78d91b7
./scripts/deploy-docker.sh --target backend --action pull --release-tag "${PREV_TAG}"
./scripts/deploy-docker.sh --target frontend --action pull --release-tag "${PREV_TAG}"
./scripts/verify-deployment.sh
```

สิ่งที่ต้องทำก่อน rollback
1. เก็บ logs: `docker compose -f docker-compose.prod.yml logs --tail=500 > incident.log`
2. ยืนยันว่าปัญหาอยู่ที่ release ไม่ใช่ infra หรือ database
3. ถ้ามี migration ใหม่ต้องพิจารณา rollback database ด้วยแยกต่างหาก

---

## 10) Incident quick checks

```bash
# ดู container status ทั้งหมด
docker compose -f docker-compose.prod.yml ps

# ดู logs ทั้งหมด
docker compose -f docker-compose.prod.yml logs --tail=200

# ดู logs live
docker compose -f docker-compose.prod.yml logs -f backend frontend postgres

# เก็บ diagnostics เมื่อเกิด 502
./scripts/collect-502-diagnostics.sh
```

---

## 11) Handoff checklist สำหรับ DevOps

ทีม Dev ต้องส่งข้อมูลชุดนี้ทุกครั้งก่อนขึ้น prod

- [ ] Release tag (เช่น `v2026.04.27-e002338`)
- [ ] Image manifest inspect ผ่านทั้ง backend + frontend
- [ ] Changelog / breaking changes
- [ ] มี Prisma migration ใหม่หรือไม่ (ถ้ามีให้ระบุชื่อ migration)
- [ ] Rollback tag ก่อนหน้าที่ใช้ได้ทันที
- [ ] ไฟล์ `.env.production` ที่อัปเดตแล้ว (ถ้ามี env ใหม่)
- [ ] ยืนยันว่า build ผ่านและ `docker buildx imagetools inspect` แสดง amd64 + arm64 ครบ
