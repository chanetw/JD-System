# DJ System Docker Handoff (DevOps)

เอกสารย่อสำหรับ deploy ระบบ DJ ด้วย Docker Compose แบบปลอดภัยและตรวจสอบได้เร็ว

## 1) สิ่งที่ต้องส่งให้ DevOps

1. ไฟล์หลัก
- [docker-compose.prod.yml](/Users/chanetw/Documents/DJ-System/docker-compose.prod.yml)
- [scripts/deploy-docker.sh](/Users/chanetw/Documents/DJ-System/scripts/deploy-docker.sh)
- [scripts/verify-deployment.sh](/Users/chanetw/Documents/DJ-System/scripts/verify-deployment.sh)
- [frontend/nginx.conf](/Users/chanetw/Documents/DJ-System/frontend/nginx.conf)

2. ค่า env/secret
- [backend/api-server/.env.production](/Users/chanetw/Documents/DJ-System/backend/api-server/.env.production)
- [backend/api-server/envprod.txt](/Users/chanetw/Documents/DJ-System/backend/api-server/envprod.txt)

3. Image ที่ใช้ deploy
- chanetw/dj-system-backend:latest
- chanetw/dj-system-frontend:latest

## 2) Env สำคัญที่ต้องถูกต้อง

ขั้นต่ำที่ระบบตรวจก่อน deploy
- DATABASE_URL
- JWT_SECRET (>= 32 chars)
- NODE_ENV
- ALLOWED_ORIGINS

ตัวแปรพอร์ต (override ได้)
- BACKEND_HOST_PORT (default 3000)
- FRONTEND_HOST_PORT (default 80)
- POSTGRES_PORT (default 5434)

ตัวแปรที่มีผลต่อลิงก์ในอีเมล
- FRONTEND_URL

หมายเหตุ: ถ้าเปลี่ยน public port หรือโดเมน ต้องอัปเดต FRONTEND_URL และ ALLOWED_ORIGINS ให้ตรง

## 3) ขั้นตอน Deploy มาตรฐาน

### แบบ pull image

1. Deploy backend ก่อน
```bash
./scripts/deploy-docker.sh --target backend --action pull --with-local-db
```

ถ้าใช้ external DB:
```bash
./scripts/deploy-docker.sh --target backend --action pull
```

2. Verify
```bash
./scripts/verify-deployment.sh
```

3. Deploy frontend
```bash
./scripts/deploy-docker.sh --target frontend --action pull
```

4. Verify อีกรอบ
```bash
./scripts/verify-deployment.sh
```

### แบบ build บน server
```bash
./scripts/deploy-docker.sh --target all --action build --with-local-db
./scripts/verify-deployment.sh
```

## 4) ถ้า Port บน Server ไม่ตรงนโยบาย

ค่า mapping ปัจจุบัน
- Frontend: ${FRONTEND_HOST_PORT:-80}:80
- Backend: ${BACKEND_HOST_PORT:-3000}:3000
- Postgres: ${POSTGRES_PORT:-5434}:5432

ตัวอย่าง override
```env
BACKEND_HOST_PORT=13000
FRONTEND_HOST_PORT=8080
POSTGRES_PORT=15432
```

หรือ one-off command
```bash
BACKEND_HOST_PORT=13000 FRONTEND_HOST_PORT=8080 POSTGRES_PORT=15432 ./scripts/deploy-docker.sh --target all --action pull --with-local-db
```

verify เมื่อใช้พอร์ต custom
```bash
BACKEND_URL=http://localhost:13000 FRONTEND_URL=http://localhost:8080 ./scripts/verify-deployment.sh
```

## 5) กรณีมี Reverse Proxy/LB ด้านหน้า

แนวทางแนะนำ
1. เปิด public ที่ proxy ชั้นนอก
2. bind app เป็น loopback/private ได้ถ้าต้องการ
3. forward /, /api/, /socket.io/ ไป frontend container

ตัวอย่าง bind local only
```yaml
backend:
  ports:
    - "127.0.0.1:13000:3000"
frontend:
  ports:
    - "127.0.0.1:8080:80"
```

## 6) Acceptance Checklist หลัง Deploy

ต้องผ่านอย่างน้อย
1. docker compose -f docker-compose.prod.yml ps ขึ้นครบ
2. GET /health ผ่าน
3. GET /api/version ผ่าน
4. GET / และ /index.html ผ่าน
5. GET /api/version ผ่าน frontend proxy
6. ไม่มี restart loop

## 7) เช็ค Incident เร็ว

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200
docker compose -f docker-compose.prod.yml logs -f backend frontend postgres
./scripts/collect-502-diagnostics.sh
```

## 8) Rollback แบบสั้น

1. หยุด rollout frontend ก่อน
2. เก็บ logs
3. เปลี่ยน image กลับเป็น tag ก่อนหน้า
4. up ใหม่
```bash
docker compose -f docker-compose.prod.yml up -d
./scripts/verify-deployment.sh
```

ข้อแนะนำ: production ควรใช้ immutable tags/digest แทน latest
