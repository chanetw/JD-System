# DJ System Docker Handoff (DevOps)

เอกสารส่งต่อสำหรับ DevOps เพื่อ `pull`, `deploy`, `verify` และ `rollback` ระบบ DJ บน production ด้วย Docker Compose โดยอิง image ที่ build และ push ขึ้น Docker Hub แล้ว

---

## 0) Release ล่าสุด (อ้างอิง)

| รายการ | ค่า |
|---|---|
| Release tag | `20260430-3525d07` |
| วันที่ build | `2026-04-30` |
| Commit | `3525d07` |
| Backend image | `chanetw/dj-system-backend:20260430-3525d07` |
| Frontend image | `chanetw/dj-system-frontend:20260430-3525d07` |
| Backend digest | `sha256:4e9c4f5a352e962ed94331bb504a591011ab438e63e38ff3afb8d6b8e8e4aa81` |
| Frontend digest | `sha256:b17659156b8699a3f759ab7480596a469d1b1fb0bb5ac4b97bb7b86a6ae4e404` |
| Docker Hub mutable tags | `chanetw/dj-system-backend:latest`, `chanetw/dj-system-frontend:latest` |
| Platforms | `linux/amd64`, `linux/arm64` |
| GitHub repo | `https://github.com/chanetw/JD-System` |

ตรวจสอบ manifest:
```bash
docker buildx imagetools inspect chanetw/dj-system-backend:20260430-3525d07
docker buildx imagetools inspect chanetw/dj-system-frontend:20260430-3525d07
```

หมายเหตุ:
- production ควร pin ด้วย immutable tag `20260430-3525d07`
- `latest` มีไว้เพื่อความสะดวกในการทดสอบหรือ pull แบบเร็ว ไม่ควรใช้เป็นค่าหลักของ rollout production

---

## 1) Handoff package ที่ต้องส่งให้ DevOps

### ไฟล์จาก repository

ทั้งหมดอยู่ใน branch ที่จะ deploy

| ไฟล์ | วัตถุประสงค์ |
|---|---|
| `docker-compose.prod.yml` | Compose หลักสำหรับ production |
| `scripts/deploy-docker.sh` | Deploy แบบกำหนด target และ release tag |
| `scripts/deploy-hub.sh` | Deploy แบบ one-command จาก Docker Hub |
| `scripts/verify-deployment.sh` | ตรวจ health หลัง deploy |
| `scripts/build-arm.sh` | Build/push multi-arch สำหรับ release ถัดไป |
| `frontend/nginx.conf` | Frontend reverse proxy config ภายใน container |
| `backend/api-server/Dockerfile` | Backend production image definition |
| `frontend/Dockerfile` | Frontend production image definition |

### ไฟล์ secret / env ที่ต้องส่งแยก

| ไฟล์ | วัตถุประสงค์ |
|---|---|
| `backend/api-server/.env.production` | env หลักของ backend/prod |
| `backend/api-server/envprod.txt` | env/notes เพิ่มเติม ถ้ายังใช้งานในฝั่ง server |

### ข้อมูลที่แนบกับ release นี้

1. Release tag: `20260430-3525d07`
2. Backend digest: `sha256:4e9c4f5a352e962ed94331bb504a591011ab438e63e38ff3afb8d6b8e8e4aa81`
3. Frontend digest: `sha256:b17659156b8699a3f759ab7480596a469d1b1fb0bb5ac4b97bb7b86a6ae4e404`
4. Platforms: `linux/amd64`, `linux/arm64`
5. Migration ใหม่: `backend/prisma/migrations/20260430000000_add_draft_read_logs`

### สิ่งที่เปลี่ยนใน release นี้

- แยก logic `assign` ออกจาก `approved` ให้ชัดขึ้น:
  - งานที่ยัง `pending_approval` หรือ `pending_level_*` สามารถเลือกผู้รับงานได้
  - แต่ยังไม่เปลี่ยนเป็น `assigned` จนกว่าจะ approved จริง
- งาน urgent ที่ยังไม่อยู่ในสถานะพร้อมทำงานจริง จะไม่ trigger urgent SLA reschedule
- เพิ่ม draft read log / notification เมื่อ requester เปิด draft link หรือไฟล์
- ปรับ My Queue card และ Sidebar รายละเอียดงาน
- เพิ่มข้อมูลติดต่อ requester ใน job detail

---

## 2) Production image refs ที่ต้องใช้

แนะนำให้ DevOps ใช้ tag ตรงนี้เท่านั้นใน rollout นี้

```bash
BACKEND_IMAGE=chanetw/dj-system-backend:20260430-3525d07
FRONTEND_IMAGE=chanetw/dj-system-frontend:20260430-3525d07
```

ถ้าต้อง pin แบบ digest:

```bash
BACKEND_IMAGE=chanetw/dj-system-backend@sha256:4e9c4f5a352e962ed94331bb504a591011ab438e63e38ff3afb8d6b8e8e4aa81
FRONTEND_IMAGE=chanetw/dj-system-frontend@sha256:b17659156b8699a3f759ab7480596a469d1b1fb0bb5ac4b97bb7b86a6ae4e404
```

---

## 3) Prerequisites บน production server

| รายการ | ข้อกำหนด |
|---|---|
| Docker Engine | `24.x+` |
| Docker Compose | `v2.x+` |
| OS | Linux `amd64` หรือ `arm64` |
| พอร์ต default | `80`, `3000`, `5434` |
| Disk space | อย่างน้อย `10 GB` สำหรับ images / volumes / uploads |
| Env file | ต้องมี `backend/api-server/.env.production` |

ตรวจสอบขั้นต่ำ:
```bash
docker compose version
docker info
```

---

## 4) ขั้นตอน deploy มาตรฐาน

### วิธี A — ใช้ deploy script

```bash
export RELEASE_TAG=20260430-3525d07

./scripts/deploy-docker.sh --target backend --action pull --release-tag "${RELEASE_TAG}"
./scripts/verify-deployment.sh

./scripts/deploy-docker.sh --target frontend --action pull --release-tag "${RELEASE_TAG}"
./scripts/verify-deployment.sh
```

### วิธี B — ใช้ deploy-hub script

```bash
export RELEASE_TAG=20260430-3525d07
./scripts/deploy-hub.sh --release-tag "${RELEASE_TAG}"
```

### วิธี C — manual compose

```bash
export RELEASE_TAG=20260430-3525d07

BACKEND_IMAGE=chanetw/dj-system-backend:${RELEASE_TAG} \
FRONTEND_IMAGE=chanetw/dj-system-frontend:${RELEASE_TAG} \
docker compose -f docker-compose.prod.yml pull backend frontend

BACKEND_IMAGE=chanetw/dj-system-backend:${RELEASE_TAG} \
FRONTEND_IMAGE=chanetw/dj-system-frontend:${RELEASE_TAG} \
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

ถ้าขึ้นครั้งแรกพร้อม database local:
```bash
export RELEASE_TAG=20260430-3525d07
./scripts/deploy-docker.sh --target all --action pull --release-tag "${RELEASE_TAG}" --with-local-db
```

---

## 5) Verification หลัง deploy

```bash
./scripts/verify-deployment.sh
```

Acceptance checklist:
1. `docker compose -f docker-compose.prod.yml ps` ขึ้นครบ และไม่มี `Restarting`
2. `GET /health` ของ backend ได้ `HTTP 200`
3. `GET /api/version` ได้ `HTTP 200`
4. `GET /` โหลด frontend ได้
5. ไม่มี restart loop หลัง deploy เกิน 2 นาที

---

## 6) Rollback

rollback แบบ tag ก่อนหน้า:

```bash
export PREV_TAG=<previous-release-tag>

./scripts/deploy-docker.sh --target backend --action pull --release-tag "${PREV_TAG}"
./scripts/deploy-docker.sh --target frontend --action pull --release-tag "${PREV_TAG}"
./scripts/verify-deployment.sh
```

สิ่งที่ต้องทำก่อน rollback:
1. เก็บ logs: `docker compose -f docker-compose.prod.yml logs --tail=500 > incident.log`
2. ยืนยันว่าปัญหาอยู่ที่ release ไม่ใช่ infra หรือ database
3. ถ้ามี migration ใหม่ ให้ประเมิน compatibility ของ schema กับ release ก่อนหน้า

---

## 7) หมายเหตุจาก build ที่ DevOps ควรรู้

รายการนี้ไม่ใช่ blocker ของการ deploy release นี้ แต่ควรรับรู้ไว้

### Frontend

- Vite เตือนว่า bundle หลักใหญ่ (`>500kB`)
- มี warning เรื่อง dynamic import ของ `Dashboard.jsx` แต่ยังมี static import ซ้ำ
- ผลกระทบคือโหลดหน้าแรกอาจช้ากว่าที่ควร แต่ไม่ทำให้ container start fail

### Backend / Frontend dependencies

- `npm audit` ยังรายงาน vulnerabilities:
  - frontend: `15` รายการ
  - backend: `20` รายการ
- เป็น technical debt ด้าน dependency security ไม่ใช่ blocker ของ release นี้

### Docker build warning

- frontend มี warning จาก Docker linter ว่าใช้ `ARG/ENV` กับ `VITE_AUTH_MODE`
- ค่านี้เป็น runtime/build config ทั่วไป ไม่ใช่ secret
- ไม่มีผลต่อการใช้งาน production ใน release นี้

---

## 8) Handoff checklist สำหรับ DevOps

- [ ] ใช้ image tag `20260430-3525d07` หรือ pin digest
- [ ] ตรวจ manifest แล้วมี `linux/amd64` และ `linux/arm64`
- [ ] มี `backend/api-server/.env.production` ครบ
- [ ] รับทราบว่ามี Prisma migration `20260430000000_add_draft_read_logs`
- [ ] ตรวจ health หลัง deploy ด้วย `scripts/verify-deployment.sh`
- [ ] เตรียม previous tag สำหรับ rollback ก่อนเริ่ม rollout
