# 🚀 DJ System — Deployment Guide

เอกสารครบวงจรสำหรับการตั้งค่า ทดสอบ และ deploy ระบบ DJ System  
แบ่งเป็น 3 ส่วน: **ก่อนย้าย → ทดสอบบน Local → ย้ายขึ้น Production**

---

## 📋 Table of Contents

1. [ก่อนย้าย — Checklist เตรียมตัว](#1-ก่อนย้าย--checklist-เตรียมตัว)
2. [ทดสอบบน Local — ตั้งค่าและรันบนเครื่อง](#2-ทดสอบบน-local--ตั้งค่าและรันบนเครื่อง)
3. [ย้ายขึ้น Production — Docker Deploy](#3-ย้ายขึ้น-production--docker-deploy)
4. [ข้อมูล Login สำหรับทดสอบ](#4-ข้อมูล-login-สำหรับทดสอบ)
5. [การ Backup / Restore](#5-การ-backup--restore)
6. [การแก้ไขปัญหา (Troubleshooting)](#6-การแก้ไขปัญหา-troubleshooting)
7. [Architecture Overview](#7-architecture-overview)

---

## 1. ก่อนย้าย — Checklist เตรียมตัว

### ✅ สิ่งที่ต้องมีบนเครื่อง (Local Dev)

| เครื่องมือ | เวอร์ชันขั้นต่ำ | ตรวจสอบ |
|-----------|---------------|---------|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Docker Desktop | 4+ | `docker -v` |
| Docker Compose | 2+ | `docker compose version` |
| Git | 2+ | `git -v` |

### ✅ สิ่งที่ต้องมีบน Production Server

| เครื่องมือ | เวอร์ชันขั้นต่ำ |
|-----------|---------------|
| Docker Engine | 24+ |
| Docker Compose | 2+ |
| (Optional) Nginx/Caddy | สำหรับ reverse proxy + SSL |

### ✅ ไฟล์ที่ต้องเตรียม

```
DJ-System/
├── backend/
│   ├── api-server/
│   │   ├── .env.local              ← สร้างจาก .env.local.example
│   │   ├── .env.production         ← สร้างจาก .env.production.example
│   │   └── Dockerfile
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.js
│       └── migrations/
├── frontend/
│   ├── .env.local                  ← สร้างเอง (ดูหัวข้อ 2)
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml              ← สำหรับ local dev
└── docker-compose.prod.yml         ← สำหรับ production
```

### ✅ Checklist ก่อนเริ่ม

- [ ] Clone repository เรียบร้อย
- [ ] Docker Desktop เปิดทำงาน
- [ ] Port 3000, 5173/5174, 5433 ว่าง
- [ ] สร้าง `.env.local` สำหรับ backend แล้ว
- [ ] สร้าง `.env.local` สำหรับ frontend แล้ว

---

## 2. ทดสอบบน Local — ตั้งค่าและรันบนเครื่อง

### Step 1: สร้าง Environment Files

**Backend** (`backend/api-server/.env.local`):
```bash
cp backend/api-server/.env.local.example backend/api-server/.env.local
```

ค่าสำคัญที่ต้องตรวจสอบ:
```env
DATABASE_MODE=local
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system
AUTH_MODE=jwt_only
JWT_SECRET=your-super-secret-key-change-this-locally
```

**Frontend** (`frontend/.env.local`):
```env
VITE_FRONTEND_MODE=api_only
VITE_AUTH_MODE=jwt_only
VITE_API_URL=http://localhost:3000
```

### Step 2: รัน PostgreSQL Database

```bash
# เริ่ม PostgreSQL container
docker compose up -d postgres

# ตรวจสอบสถานะ
docker compose ps

# รอให้ database พร้อม (~10 วินาที)
docker exec dj-postgres pg_isready -U postgres
```

**ข้อมูล Database Connection:**
| รายการ | ค่า |
|--------|-----|
| Host | localhost |
| Port | 5433 |
| Database | dj_system |
| Username | postgres |
| Password | password |
| Connection String | `postgresql://postgres:password@localhost:5433/dj_system` |

### Step 3: สร้าง Database Schema + ข้อมูลเริ่มต้น

```bash
cd backend/api-server

# รัน migrations (สร้าง tables)
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system \
  npx prisma migrate deploy --schema ../prisma/schema.prisma

# รัน seed (สร้างข้อมูลเริ่มต้น: users, roles, jobs ฯลฯ)
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system \
  npx prisma db seed --schema ../prisma/schema.prisma
```

### Step 4: ตรวจสอบ Database

```bash
# ดูจำนวน tables
docker exec dj-postgres psql -U postgres -d dj_system -c "\dt"

# ดูจำนวน users
docker exec dj-postgres psql -U postgres -d dj_system \
  -c "SELECT id, email, display_name, status FROM users;"

# หรือเปิด Prisma Studio (GUI)
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system \
  npx prisma studio --schema ../prisma/schema.prisma
# → เปิด http://localhost:5555
```

### Step 5: รัน Backend

```bash
cd backend/api-server
npm start
# → http://localhost:3000
```

ตรวจสอบ: `curl http://localhost:3000/health`

ผลลัพธ์ที่ถูกต้อง:
```json
{"status":"ok","message":"DJ System API Server is running","database":"connected"}
```

### Step 6: รัน Frontend

```bash
cd frontend
npm run dev
# → http://localhost:5173 หรือ http://localhost:5174
```

### Step 7: ทดสอบ Login

เปิดเบราว์เซอร์ไปที่ frontend URL แล้ว login ด้วย:

| Email | Password | Role |
|-------|----------|------|
| admin@sena.co.th | P@ssw0rd | Admin |
| requester@sena.co.th | P@ssw0rd | Requester |
| designer@sena.co.th | P@ssw0rd | Assignee |

---

## 3. ย้ายขึ้น Production — Docker Deploy

### Step 1: เตรียม Environment File

```bash
cp backend/api-server/.env.production.example backend/api-server/.env.production
```

**แก้ไขค่าสำคัญ** ใน `.env.production`:
```env
# ⚠️ เปลี่ยนค่าเหล่านี้ทั้งหมด!
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com

DATABASE_MODE=local
DATABASE_URL=postgresql://postgres:YOUR_STRONG_PASSWORD@postgres:5432/dj_system

JWT_SECRET=GENERATE_A_VERY_LONG_RANDOM_STRING_AT_LEAST_64_CHARACTERS

STORAGE_PROVIDER=local
UPLOADS_DIR=/app/uploads
```

### Step 2: สร้าง `.env` สำหรับ Docker Compose

สร้างไฟล์ `.env` ที่ root ของ project:
```env
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
POSTGRES_DB=dj_system
POSTGRES_USER=postgres
VITE_API_URL=https://yourdomain.com
```

### Step 3: Build & Deploy

**วิธีที่ 1 — ใช้ Deploy Script (แนะนำ):**
```bash
chmod +x scripts/deploy-docker.sh
./scripts/deploy-docker.sh
```

**วิธีที่ 2 — Manual:**
```bash
# Build images
docker compose -f docker-compose.prod.yml build --no-cache

# Start database ก่อน
docker compose -f docker-compose.prod.yml up -d postgres
sleep 10

# รัน migrations
docker compose -f docker-compose.prod.yml run --rm backend \
  npx prisma migrate deploy --schema ./prisma/schema.prisma

# (ครั้งแรก) รัน seed
docker compose -f docker-compose.prod.yml run --rm backend \
  node prisma/seed.js

# Start ทุก services
docker compose -f docker-compose.prod.yml up -d
```

### Step 4: ตรวจสอบ Production

```bash
# ดูสถานะ containers
docker compose -f docker-compose.prod.yml ps

# ดู logs
docker compose -f docker-compose.prod.yml logs -f

# ตรวจสอบ health
curl http://localhost:3000/health

# เข้าใช้งาน
# Frontend: http://localhost (port 80)
# Backend: http://localhost:3000
```

### Step 5: (Optional) ตั้งค่า SSL + Reverse Proxy

ถ้าต้องการ HTTPS ใช้ Nginx หรือ Caddy เป็น reverse proxy:

```nginx
# /etc/nginx/sites-available/dj-system
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 4. ข้อมูล Login สำหรับทดสอบ

Seed script สร้าง users เริ่มต้นดังนี้:

| Email | Password | Role | หน้าที่ |
|-------|----------|------|--------|
| admin@sena.co.th | P@ssw0rd | admin | ผู้ดูแลระบบ สิทธิ์เต็ม |
| approver@sena.co.th | P@ssw0rd | approver | ผู้อนุมัติงาน |
| requester@sena.co.th | P@ssw0rd | requester | ผู้ขอสร้างงาน (Marketing) |
| designer@sena.co.th | P@ssw0rd | assignee | ผู้รับงาน (Designer) |
| teamlead@sena.co.th | P@ssw0rd | team_lead | หัวหน้าทีม |

**Tenant:** SENA Development (code: SENA)

> ⚠️ **สำคัญ:** เปลี่ยน password ทันทีหลัง deploy บน production!

---

## 5. การ Backup / Restore

### Backup Database

```bash
# Local
docker exec dj-postgres pg_dump -U postgres dj_system > backup_$(date +%Y%m%d_%H%M%S).sql

# Production
docker exec dj-postgres-prod pg_dump -U postgres dj_system > backup_prod_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
# Drop + Recreate
docker exec dj-postgres psql -U postgres -c "DROP DATABASE IF EXISTS dj_system;"
docker exec dj-postgres psql -U postgres -c "CREATE DATABASE dj_system;"

# Restore
docker exec -i dj-postgres psql -U postgres dj_system < backup_file.sql
```

### Backup Uploads (ไฟล์ที่ upload)

```bash
# Local
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/api-server/uploads/

# Production (from Docker volume)
docker run --rm -v dj-files-prod:/data -v $(pwd):/backup \
  alpine tar -czf /backup/uploads_backup.tar.gz /data
```

---

## 6. การแก้ไขปัญหา (Troubleshooting)

### ❌ Port ถูกใช้อยู่
```bash
# หา process ที่ใช้ port
lsof -i :3000
lsof -i :5433

# หยุด process
kill -9 <PID>
```

### ❌ Database connection failed
```bash
# ตรวจสอบ container
docker compose ps
docker compose logs postgres

# ตรวจสอบ pg_isready
docker exec dj-postgres pg_isready -U postgres
```

### ❌ Migration failed
```bash
# Reset database แล้วรันใหม่
docker exec dj-postgres psql -U postgres -c "DROP DATABASE IF EXISTS dj_system;"
docker exec dj-postgres psql -U postgres -c "CREATE DATABASE dj_system;"

cd backend/api-server
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system \
  npx prisma migrate deploy --schema ../prisma/schema.prisma

DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system \
  npx prisma db seed --schema ../prisma/schema.prisma
```

### ❌ Login ไม่ได้
```bash
# ตรวจสอบว่ามี users อยู่ใน database
docker exec dj-postgres psql -U postgres -d dj_system \
  -c "SELECT id, email, status FROM users;"

# ถ้าไม่มี ให้รัน seed ใหม่
cd backend/api-server
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system \
  npx prisma db seed --schema ../prisma/schema.prisma
```

### ❌ Docker build failed (Prisma)
```bash
# ตรวจสอบว่า prisma directory อยู่ถูกที่
ls backend/prisma/schema.prisma

# Build context ต้องเป็น ./backend (ไม่ใช่ ./backend/api-server)
docker compose -f docker-compose.prod.yml build backend
```

---

## 7. Architecture Overview

### Local Development
```
┌──────────────────────────────────────────────────┐
│  Your Machine                                    │
│                                                  │
│  ┌─────────────┐     ┌─────────────────────────┐│
│  │  Frontend    │────▶│  Backend API            ││
│  │  (Vite)     │     │  (Express + Socket.io)  ││
│  │  :5174      │     │  :3000                  ││
│  └─────────────┘     └──────────┬──────────────┘│
│                                 │                │
│                      ┌──────────▼──────────────┐│
│                      │  PostgreSQL (Docker)     ││
│                      │  :5433                   ││
│                      │  DB: dj_system           ││
│                      │  User: postgres          ││
│                      │  Pass: password          ││
│                      └──────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### Production (Docker)
```
┌──────────────────────────────────────────────────┐
│  Production Server                               │
│                                                  │
│  ┌─────────────┐     ┌─────────────────────────┐│
│  │  Nginx      │────▶│  Backend API            ││
│  │  (Frontend) │     │  (Node.js)              ││
│  │  :80        │     │  :3000                  ││
│  └─────────────┘     └──────────┬──────────────┘│
│        │                        │                │
│        │  /uploads/  ┌──────────▼──────────────┐│
│        └────────────▶│  PostgreSQL             ││
│         (volume)     │  :5432 (internal)       ││
│                      │  DB: dj_system           ││
│                      └──────────────────────────┘│
│                                                  │
│  Docker Network: dj-network                      │
│  Volumes: dj-data-prod, dj-files-prod            │
└──────────────────────────────────────────────────┘
```

### Docker Services

| Service | Container | Port | Image |
|---------|-----------|------|-------|
| postgres | dj-postgres-prod | 5432 (internal) | postgres:15 |
| backend | dj-backend-prod | 3000 | custom (Node.js) |
| frontend | dj-frontend-prod | 80 | custom (Nginx) |

---

## 📝 คำสั่งที่ใช้บ่อย

### Local Development
```bash
docker compose up -d postgres          # เริ่ม database
docker compose down                     # หยุด database
docker compose logs -f postgres         # ดู logs

cd backend/api-server && npm start      # เริ่ม backend
cd frontend && npm run dev              # เริ่ม frontend
```

### Production
```bash
docker compose -f docker-compose.prod.yml up -d       # เริ่มทั้งหมด
docker compose -f docker-compose.prod.yml down         # หยุดทั้งหมด
docker compose -f docker-compose.prod.yml logs -f      # ดู logs
docker compose -f docker-compose.prod.yml restart      # รีสตาร์ท
docker compose -f docker-compose.prod.yml ps           # ดูสถานะ
```

### Database
```bash
# เข้า psql
docker exec -it dj-postgres psql -U postgres -d dj_system

# รัน SQL
docker exec dj-postgres psql -U postgres -d dj_system -c "SELECT count(*) FROM users;"

# Prisma Studio
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system \
  npx prisma studio --schema ../prisma/schema.prisma
```

ข้อมูล Login สำหรับทดสอบ
Email	Password	Role
admin@sena.co.th	P@ssw0rd	admin
approver@sena.co.th	P@ssw0rd	approver
requester@sena.co.th	P@ssw0rd	requester
designer@sena.co.th	P@ssw0rd	assignee
teamlead@sena.co.th	P@ssw0rd	team_lead
