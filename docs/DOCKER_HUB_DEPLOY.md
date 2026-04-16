# คู่มือ Deploy — DJ System

> Images: [hub.docker.com/u/chanetw](https://hub.docker.com/u/chanetw)  
> `chanetw/dj-system-backend` · `chanetw/dj-system-frontend`

---

## สิ่งที่ต้องมีบน Server

- Docker + Docker Compose (`docker compose version`)
- ไฟล์ `docker-compose.prod.yml`
- ไฟล์ `backend/api-server/.env.production`
- PostgreSQL ที่มีข้อมูลอยู่แล้ว (container `dj-postgres-prod`)

---
# 1. แก้ .env.production บน server — เพิ่ม/อัปเดตค่าเหล่านี้:
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp.sena.co.th
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=pridesena@sena.co.th
SMTP_PASS=SenaN3xT
SMTP_FROM="DJ System" <info@sena.co.th>

## วิธีที่ Deploy
```bash
docker compose -f docker-compose.prod.yml pull backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
docker compose -f docker-compose.prod.yml ps
```

> `--no-deps` = postgres ไม่ถูกแตะ  
> `--force-recreate` = บังคับสร้าง container ใหม่

---

## ตรวจสอบ

```bash
# Backend
curl -s http://localhost:3000/health

# Frontend
curl -sI http://localhost | head -2

# Logs
docker logs dj-backend-prod --tail 20
```

**ผลที่คาดหวัง:**
```
dj-postgres-prod    Up X hours  (healthy)
dj-backend-prod     Up X min    (healthy)
dj-frontend-prod    Up X min
```

---

## Rollback

```bash
docker compose -f docker-compose.prod.yml stop backend frontend

# แก้ docker-compose.prod.yml → เปลี่ยน image tag เป็นเวอร์ชันก่อนหน้า
# image: chanetw/dj-system-backend:v2026.03.20
# image: chanetw/dj-system-frontend:v2026.03.20

docker compose -f docker-compose.prod.yml pull backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

---

## หมายเหตุ

- **Database ไม่ถูกแตะ** — postgres container, volume `dj-data-prod`, และ data ทั้งหมดยังเดิม
- Backend เริ่มจะรัน `prisma migrate deploy` อัตโนมัติ — ถ้าไม่มี migration ใหม่จะข้ามไป (no-op)
- ถ้า frontend ยังแสดง version เก่า → กด **Ctrl+Shift+R** (hard refresh)
