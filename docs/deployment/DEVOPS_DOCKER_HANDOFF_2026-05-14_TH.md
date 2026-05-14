# DJ System Docker Handoff - 2026-05-14

เอกสารนี้ใช้ส่งต่อ DevOps สำหรับ deploy DJ System จาก image tag ล่าสุด:

- Backend API: `chanetw/dj-system-backend:20260514-0849-c916ea2`
- Frontend Web: `chanetw/dj-system-frontend:20260514-0849-c916ea2`

## 1) Release Metadata

| รายการ | ค่า |
|---|---|
| Release tag | `20260514-0849-c916ea2` |
| Git commit | `c916ea2` |
| Build date | `2026-05-14` |
| Backend image | `chanetw/dj-system-backend:20260514-0849-c916ea2` |
| Frontend image | `chanetw/dj-system-frontend:20260514-0849-c916ea2` |
| Required platforms | `linux/amd64`, `linux/arm64` |
| Compose file | `docker-compose.prod.yml` |
| Frontend build args | `VITE_API_URL=/api`, `VITE_FRONTEND_MODE=api_only`, `VITE_AUTH_MODE=jwt_only` |

สำคัญ: image บน Docker Hub ต้องเป็น multi-platform manifest ไม่ใช่ image เดี่ยว `linux/arm64`

ตรวจบน Docker Hub/เครื่อง DevOps:

```bash
docker buildx imagetools inspect chanetw/dj-system-backend:20260514-0849-c916ea2
docker buildx imagetools inspect chanetw/dj-system-frontend:20260514-0849-c916ea2
```

ผลลัพธ์ต้องเห็นทั้ง:

```text
linux/amd64
linux/arm64
```

## 2) Local Multi-Platform OCI Artifacts

ไฟล์ archive ที่สร้างไว้บนเครื่อง build:

```text
/private/tmp/dj-system-devops-handoff-20260514-0849-c916ea2/
```

| ไฟล์ | ขนาดโดยประมาณ | SHA256 |
|---|---:|---|
| `dj-system-backend-20260514-0849-c916ea2-multiarch.oci.tar` | `796M` | `d75bea7197db250c2e39d91c41267f5c36c55cc1b8bc1d9a380eb07f5146c538` |
| `dj-system-frontend-20260514-0849-c916ea2-multiarch.oci.tar` | `42M` | `5696af2ea5dc53535d5ea025fa2bb9c9edbe0c6e58fabaad10338c330e742e4f` |
| `SHA256SUMS` | `369B` | checksum manifest |

ตรวจ checksum หลังรับไฟล์:

```bash
cd /path/to/handoff
shasum -a 256 -c SHA256SUMS
```

หมายเหตุ: OCI archive เป็น package แบบ multi-platform จึงไม่แสดงเป็น image row เดียวใน Docker Desktop Images tab

## 3) Build/Push Command สำหรับ Docker Hub

ถ้า Docker Hub ยังแสดงแค่ `linux/arm64` ให้ rebuild และ push ด้วย `buildx` ตามนี้:

```bash
docker buildx build --builder dj-arm-builder \
  --platform linux/amd64,linux/arm64 \
  -f backend/api-server/Dockerfile \
  --provenance=false \
  --sbom=false \
  -t chanetw/dj-system-backend:20260514-0849-c916ea2 \
  --push backend
```

```bash
docker buildx build --builder dj-arm-builder \
  --platform linux/amd64,linux/arm64 \
  -f frontend/Dockerfile \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_FRONTEND_MODE=api_only \
  --build-arg VITE_AUTH_MODE=jwt_only \
  --provenance=false \
  --sbom=false \
  -t chanetw/dj-system-frontend:20260514-0849-c916ea2 \
  --push frontend
```

หลัง push ให้ตรวจซ้ำด้วย:

```bash
docker buildx imagetools inspect chanetw/dj-system-backend:20260514-0849-c916ea2
docker buildx imagetools inspect chanetw/dj-system-frontend:20260514-0849-c916ea2
```

## 4) Deploy ด้วย Docker Compose

ให้ใช้ immutable tag นี้ ไม่ใช้ `latest`:

```bash
export BACKEND_IMAGE=chanetw/dj-system-backend:20260514-0849-c916ea2
export FRONTEND_IMAGE=chanetw/dj-system-frontend:20260514-0849-c916ea2

docker compose -f docker-compose.prod.yml pull backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

ถ้า deploy พร้อมทั้ง stack:

```bash
export BACKEND_IMAGE=chanetw/dj-system-backend:20260514-0849-c916ea2
export FRONTEND_IMAGE=chanetw/dj-system-frontend:20260514-0849-c916ea2

docker compose -f docker-compose.prod.yml up -d
```

## 5) ENV ที่ต้องมีบน Production

ตั้งค่าใน `backend/api-server/.env.production` หรือ environment ของ compose:

```env
FRONTEND_URL=https://dj.sena.co.th
ALLOWED_ORIGINS=https://dj.sena.co.th
MAGIC_LINK_VIEW_EXPIRY_HOURS=720
MAGIC_LINK_EXPIRY_HOURS=168
MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN=7d
```

ความหมาย:

- `MAGIC_LINK_VIEW_EXPIRY_HOURS=720`: ลิงก์ดูงาน/เปิดงานเข้าได้หลายครั้งภายใน 30 วัน
- `MAGIC_LINK_EXPIRY_HOURS=168`: ลิงก์ action เช่น approve/reject/submit ใช้ได้ 1 ครั้งภายใน 7 วัน
- `MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN=7d`: session หลัง magic login อยู่ได้ 7 วัน
- `FRONTEND_URL` ต้องเป็น domain production เพื่อให้ลิงก์ใน email เป็น `https://dj.sena.co.th`

## 6) Database Preflight

ก่อน deploy backend image ใหม่ ให้ตรวจว่า production DB มี `job_deliverables`:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d dj_system -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'job_deliverables';
"

docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d dj_system -c "
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'job_deliverables'
ORDER BY ordinal_position;
"
```

ถ้าไม่มี table ให้ apply migration นี้ก่อน deploy backend:

```bash
database/migrations/014_ensure_job_deliverables.sql
```

ตัวอย่าง apply:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d dj_system < database/migrations/014_ensure_job_deliverables.sql
```

หลัง deploy backend image ใหม่ สามารถรัน preflight script เพิ่มเติม:

```bash
docker compose -f docker-compose.prod.yml exec backend node scripts/preflight-job-deliverables.js
```

## 7) Uploads / Storage Preflight

ระบบ production ใช้ local storage โดยตั้งค่า:

```env
STORAGE_PROVIDER=local
```

ตำแหน่งไฟล์จริง:

```text
Production host: ./uploads
Backend container: /app/uploads
Frontend container: /app/uploads:ro
Public URL: /uploads/<relative-file-path>
API view/download: /api/storage/files/:id/view และ /api/storage/files/:id
```

จาก `docker-compose.prod.yml` ต้องมี volume mount นี้:

```yaml
backend:
  volumes:
    - ./uploads:/app/uploads

frontend:
  volumes:
    - ./uploads:/app/uploads:ro
```

จาก `frontend/nginx.conf` มี route นี้สำหรับเปิดไฟล์ผ่าน frontend:

```nginx
location ^~ /uploads/ {
    alias /app/uploads/;
    expires 7d;
    add_header Cache-Control "public";
    try_files $uri =404;
}
```

ข้อสำคัญก่อน deploy:

1. ห้ามลบ `./uploads` บน production host เพราะไฟล์ upload ไม่ได้ bake อยู่ใน Docker image
2. ถ้าย้าย server หรือเปลี่ยน path compose ต้องย้าย `./uploads` เดิมไปด้วย
3. Backend ต้องเขียนไฟล์ได้ที่ `/app/uploads`
4. Frontend อ่านไฟล์ได้แบบ read-only ที่ `/app/uploads`
5. `media_files.file_path`, `jobs.final_files`, และ `job_deliverables.file_path` ต้องเป็น relative path ใต้ `uploads`

ตรวจบน production server:

```bash
mkdir -p ./uploads
docker compose -f docker-compose.prod.yml exec backend sh -lc 'pwd && ls -ld /app/uploads && test -w /app/uploads && echo uploads-writable'
docker compose -f docker-compose.prod.yml exec frontend sh -lc 'ls -ld /app/uploads && echo uploads-readable'
```

หลัง deploy ให้ทดสอบ upload/download จริง:

```bash
docker compose -f docker-compose.prod.yml exec backend sh -lc 'find /app/uploads -maxdepth 3 -type f | head'
```

ถ้าเปิดไฟล์แนบแล้ว 404 ให้ตรวจ 3 จุดก่อน:

1. host path `./uploads` อยู่ directory เดียวกับ `docker-compose.prod.yml`
2. backend และ frontend mount `./uploads` path เดียวกัน
3. `media_files.file_path` ใน DB ตรงกับไฟล์จริงใต้ `/app/uploads`

## 8) Verification หลัง Deploy

ตรวจ container:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend
docker compose -f docker-compose.prod.yml logs --tail=100 frontend
```

ตรวจ health:

```bash
curl -I https://dj.sena.co.th/
curl -s https://dj.sena.co.th/api/health
```

ตรวจ env:

```bash
docker compose -f docker-compose.prod.yml exec backend printenv \
  FRONTEND_URL ALLOWED_ORIGINS MAGIC_LINK_VIEW_EXPIRY_HOURS MAGIC_LINK_EXPIRY_HOURS MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN
```

Smoke test:

1. Login production ได้
2. อีเมลใหม่ต้องมีลิงก์ขึ้นต้นด้วย `https://dj.sena.co.th`
3. อีเมล action แสดง `ลิงก์นี้ใช้ได้ 1 ครั้ง ภายใน 7 วัน`
4. อีเมล view/draft/rebrief แสดง `ลิงก์นี้เข้าได้หลายครั้ง ภายใน 30 วัน`
5. Upload ไฟล์ตอนปิดงานแล้ว `jobs.final_files` และ `job_deliverables` มีข้อมูลครบ
6. เปิด preview/download ไฟล์แนบเดิมและไฟล์แนบใหม่ได้จาก Job Detail

## 9) Rollback

Rollback โดยใช้ image tag ก่อนหน้า:

```bash
export BACKEND_IMAGE=<previous-backend-image>
export FRONTEND_IMAGE=<previous-frontend-image>

docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

หมายเหตุ:

- Rows ใหม่ใน `job_deliverables` ไม่กระทบระบบเก่า เพราะ release ก่อนหน้าไม่ได้ใช้ table นี้เป็น canonical reader
- ไม่แนะนำให้ drop table `job_deliverables` ตอน rollback
- เก็บ logs ก่อน rollback ทุกครั้ง: `docker compose -f docker-compose.prod.yml logs --tail=500`

## 10) Checklist ส่งให้ DevOps

- [ ] Docker image tag: `chanetw/dj-system-backend:20260514-0849-c916ea2`
- [ ] Docker image tag: `chanetw/dj-system-frontend:20260514-0849-c916ea2`
- [ ] ยืนยัน Docker Hub manifest มี `linux/amd64` และ `linux/arm64`
- [ ] `docker-compose.prod.yml`
- [ ] `database/migrations/014_ensure_job_deliverables.sql`
- [ ] ยืนยันว่า production host มี `./uploads` เดิมครบ และอยู่ path เดียวกับ compose
- [ ] ยืนยัน backend เขียน `/app/uploads` ได้ และ frontend อ่าน `/app/uploads` ได้
- [ ] ค่า env production ผ่านช่องทางปลอดภัย
- [ ] previous image tag สำหรับ rollback
- [ ] เอกสารนี้: `docs/deployment/DEVOPS_DOCKER_HANDOFF_2026-05-14_TH.md`
