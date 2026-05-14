# DJ System Docker Handoff - 2026-05-13

เอกสารนี้ใช้ส่งต่อ DevOps สำหรับ deploy image จากโค้ดปัจจุบันของ 2 ระบบ:

- Backend API: `chanetw/dj-system-backend:20260513-1714-c916ea2`
- Frontend Web: `chanetw/dj-system-frontend:20260513-1714-c916ea2`

## 1) Release Metadata

| รายการ | ค่า |
|---|---|
| Release tag | `20260513-1714-c916ea2` |
| Git commit | `c916ea2` |
| Build time | `2026-05-13T17:15:35+07:00` |
| Backend image | `chanetw/dj-system-backend:20260513-1714-c916ea2` |
| Frontend image | `chanetw/dj-system-frontend:20260513-1714-c916ea2` |
| Compose file | `docker-compose.prod.yml` |
| Frontend build args | `VITE_API_URL=/api`, `VITE_FRONTEND_MODE=api_only`, `VITE_AUTH_MODE=jwt_only` |

Docker labels ที่ stamp ลง image:

```text
org.opencontainers.image.revision=c916ea2
org.opencontainers.image.created=2026-05-13T17:15:35+07:00
org.opencontainers.image.title=dj-system-backend | dj-system-frontend
```

## 2) Artifact Package

ไฟล์ image อยู่ที่เครื่อง build:

```text
/private/tmp/dj-system-devops-handoff-20260513-1714-c916ea2/
```

| ไฟล์ | ขนาดโดยประมาณ | SHA256 |
|---|---:|---|
| `dj-system-backend-20260513-1714-c916ea2.tar` | `393M` | `9fb1946925c2d5b6bc088cdd925f7b604b435f3d9c189ebb76ff5a062697f464` |
| `dj-system-frontend-20260513-1714-c916ea2.tar` | `21M` | `7099197dbd22781304daedfa816c9420887c65398a95bdfc6e4720dd33ba6b16` |
| `SHA256SUMS` | `341B` | checksum manifest |

ตรวจ checksum หลัง DevOps รับไฟล์:

```bash
cd /path/to/handoff
shasum -a 256 -c SHA256SUMS
```

## 3) วิธี Load Image บน Production Server

```bash
docker load -i dj-system-backend-20260513-1714-c916ea2.tar
docker load -i dj-system-frontend-20260513-1714-c916ea2.tar

docker images | grep 'dj-system'
```

คาดหวังว่าต้องเห็น:

```text
chanetw/dj-system-backend   20260513-1714-c916ea2
chanetw/dj-system-frontend  20260513-1714-c916ea2
```

## 4) ENV ที่ต้องส่งให้ DevOps

ค่าที่ต้องตั้งใน `backend/api-server/.env.production` หรือ export ก่อน `docker compose`:

```env
FRONTEND_URL=https://dj.sena.co.th
ALLOWED_ORIGINS=https://dj.sena.co.th
MAGIC_LINK_VIEW_EXPIRY_HOURS=720
MAGIC_LINK_EXPIRY_HOURS=168
MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN=7d
```

ความหมาย:

- `MAGIC_LINK_VIEW_EXPIRY_HOURS=720`: ลิงก์ดูงาน/เปิดงาน เข้าได้หลายครั้งภายใน 30 วัน
- `MAGIC_LINK_EXPIRY_HOURS=168`: ลิงก์ action เช่น approve/reject/submit ใช้ได้ 1 ครั้งภายใน 7 วัน
- `MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN=7d`: session หลัง magic login อยู่ได้ 7 วัน
- `FRONTEND_URL` ต้องเป็น domain production เพื่อไม่ให้ลิงก์ใน email กลับไปเป็น IP หรือ localhost

## 5) Deploy ด้วย Docker Compose

บน production server ให้ใช้ image tag แบบ immutable ไม่ใช้ `latest`:

```bash
export BACKEND_IMAGE=chanetw/dj-system-backend:20260513-1714-c916ea2
export FRONTEND_IMAGE=chanetw/dj-system-frontend:20260513-1714-c916ea2

docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

ถ้า deploy พร้อม database container ครั้งแรกหรือ restart ทั้ง stack:

```bash
export BACKEND_IMAGE=chanetw/dj-system-backend:20260513-1714-c916ea2
export FRONTEND_IMAGE=chanetw/dj-system-frontend:20260513-1714-c916ea2

docker compose -f docker-compose.prod.yml up -d
```

## 6) Database Preflight ก่อน Deploy

Release นี้มี logic sync ไฟล์ส่งมอบไปที่ `job_deliverables` แล้ว จึงต้องเช็ก production DB ก่อน deploy backend image ใหม่

วิธีหลัก: เช็กผ่าน postgres container โดยตรง เพราะ backend container เดิมบน prod อาจยังไม่มี script preflight ของ release นี้:

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

ถ้า preflight แจ้งว่าไม่มี table `job_deliverables` ให้ DevOps apply migration นี้ก่อน deploy backend:

```bash
database/migrations/014_ensure_job_deliverables.sql
```

ตัวอย่าง apply ผ่าน postgres container:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d dj_system < database/migrations/014_ensure_job_deliverables.sql
```

ถ้า preflight แจ้งว่า column ไม่ครบ ให้หยุด deploy และตรวจ schema ก่อน ห้ามเดาเติมเองนอกแผน

หลัง deploy backend image ใหม่แล้ว สามารถรัน preflight script เพิ่มเติมได้:

```bash
docker compose -f docker-compose.prod.yml exec backend node scripts/preflight-job-deliverables.js
```

## 7) Backfill งานเก่า

ไม่ต้องรัน backfill อัตโนมัติตอน deploy

หลัง deploy เสถียรแล้ว ถ้าต้องการเติม `job_deliverables` ให้กับงานที่ปิดไปก่อนหน้า ให้รัน dry-run ก่อน:

```bash
docker compose -f docker-compose.prod.yml exec backend node scripts/backfill-job-deliverables.js --limit=20
```

ถ้าผล dry-run ถูกต้องแล้วค่อย apply:

```bash
docker compose -f docker-compose.prod.yml exec backend node scripts/backfill-job-deliverables.js --apply --limit=20
```

แนะนำให้เริ่มจาก `--limit=20` หรือระบุ `--job-id=<id>` ก่อน เพื่อคุม blast radius

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

ตรวจ magic link env ใน backend container:

```bash
docker compose -f docker-compose.prod.yml exec backend printenv \
  FRONTEND_URL ALLOWED_ORIGINS MAGIC_LINK_VIEW_EXPIRY_HOURS MAGIC_LINK_EXPIRY_HOURS MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN
```

Smoke test ที่ควรทำ:

1. Login เข้าเว็บ production ได้
2. สร้างงานใหม่และส่ง email แล้ว link ต้องขึ้นต้นด้วย `https://dj.sena.co.th`
3. อีเมล action แสดงข้อความ `ลิงก์นี้ใช้ได้ 1 ครั้ง ภายใน 7 วัน`
4. อีเมล view/draft/rebrief แสดงข้อความ `ลิงก์นี้เข้าได้หลายครั้ง ภายใน 30 วัน`
5. Upload ไฟล์ตอนปิดงาน แล้วตรวจว่า `final_files` ยังมีข้อมูล และ `job_deliverables` มี row ใหม่

## 9) Rollback

Rollback code ทำได้โดย deploy image tag ก่อนหน้า:

```bash
export BACKEND_IMAGE=<previous-backend-image>
export FRONTEND_IMAGE=<previous-frontend-image>

docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
```

หมายเหตุ:

- Rows ใหม่ใน `job_deliverables` ไม่กระทบระบบเก่า เพราะ release ก่อนหน้าไม่ได้ใช้ table นี้เป็นตัวหลัก
- ถ้าต้อง rollback data จริง ให้ลบเฉพาะ rows ที่สร้างหลังเวลา deploy หรือ job ids ที่บันทึกไว้ใน deployment log
- ไม่แนะนำให้ drop table `job_deliverables` ตอน rollback

## 10) Build Notes

Build commands ที่ใช้:

```bash
docker build \
  -f backend/api-server/Dockerfile \
  --label org.opencontainers.image.revision=c916ea2 \
  --label org.opencontainers.image.created=2026-05-13T17:15:35+07:00 \
  --label org.opencontainers.image.title=dj-system-backend \
  -t chanetw/dj-system-backend:20260513-1714-c916ea2 \
  backend

docker build \
  -f frontend/Dockerfile \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_FRONTEND_MODE=api_only \
  --build-arg VITE_AUTH_MODE=jwt_only \
  --label org.opencontainers.image.revision=c916ea2 \
  --label org.opencontainers.image.created=2026-05-13T17:15:35+07:00 \
  --label org.opencontainers.image.title=dj-system-frontend \
  -t chanetw/dj-system-frontend:20260513-1714-c916ea2 \
  frontend
```

Warnings ที่เจอระหว่าง build และไม่เป็น blocker:

- Backend: Docker linter เตือน `CopyIgnoredFile` จาก `.dockerignore` pattern แต่ build copy package files ได้และ image สร้างสำเร็จ
- Frontend: Docker linter เตือน `VITE_AUTH_MODE` เป็น ARG/ENV แนว secret แต่ค่านี้เป็น build config ไม่ใช่ secret

## 11) Checklist สิ่งที่ต้องส่งให้ DevOps

- [ ] `dj-system-backend-20260513-1714-c916ea2.tar`
- [ ] `dj-system-frontend-20260513-1714-c916ea2.tar`
- [ ] `SHA256SUMS`
- [ ] เอกสารนี้: `docs/deployment/DEVOPS_DOCKER_HANDOFF_2026-05-13_TH.md`
- [ ] `docker-compose.prod.yml`
- [ ] `database/migrations/014_ensure_job_deliverables.sql`
- [ ] ค่า env production โดยส่งผ่านช่องทางปลอดภัย ไม่ส่ง secret ในแชตสาธารณะ
- [ ] previous image tag สำหรับ rollback
- [ ] แจ้ง DevOps ให้ preflight `job_deliverables` ก่อน deploy backend
