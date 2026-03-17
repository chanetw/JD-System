# 📚 Local Database Setup Guide - DJ System

เอกสารนี้อธิบายการตั้งค่า PostgreSQL database ในเครื่องสำหรับการพัฒนาและทดสอบ DJ System แบบละเอียด

---

## 📋 Table of Contents

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [ข้อมูลการเข้าถึง Database](#ข้อมูลการเข้าถึง-database)
3. [ขั้นตอนการติดตั้ง](#ขั้นตอนการติดตั้ง)
4. [Environment Variables](#environment-variables)
5. [การจัดการ Database](#การจัดการ-database)
6. [การแก้ไขปัญหา](#การแก้ไขปัญหา)
7. [การ Backup และ Restore](#การ-backup-และ-restore)
8. [เครื่องมือที่เป็นประโยชน์](#เครื่องมือที่เป็นประโยชน์)

---

## 🏗️ ภาพรวมระบบ

### Architecture
```
DJ System (Local Development)
├── Frontend (React + Vite)
│   └── Port: 5174
├── Backend (Node.js + Express)
│   └── Port: 3000
├── PostgreSQL Database
│   └── Port: 5433
└── Docker Container
    └── Container Name: dj-postgres
```

### Data Flow
```
Frontend (api_only) → Backend API → Prisma ORM → PostgreSQL
```

---

## 🔐 ข้อมูลการเข้าถึง Database

### PostgreSQL Connection Details
```bash
Host: localhost
Port: 5433
Database: dj_system
Username: postgres
Password: password
SSL Mode: disable
```

### Connection Strings
**PostgreSQL URI:**
```
postgresql://postgres:password@localhost:5433/dj_system
```

**Prisma Database URL:**
```
DATABASE_URL="postgresql://postgres:password@localhost:5433/dj_system"
```

### เข้าถึง Database ผ่าน Command Line
```bash
# เข้าถึง PostgreSQL container
docker exec -it dj-postgres psql -U postgres -d dj_system

# หรือเข้าถึงจากภายนอก container
psql -h localhost -p 5433 -U postgres -d dj_system
```

### เข้าถึงผ่าน GUI Tools
**DBeaver/PGAdmin Setup:**
- Host: `localhost`
- Port: `5433`
- Database: `dj_system`
- Username: `postgres`
- Password: `password`

---

## 📦 ขั้นตอนการติดตั้ง

### Prerequisites
- Docker Desktop ติดตั้งและทำงาน
- Node.js 18+ ติดตั้งแล้ว
- Git สำหรับ clone repository

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd DJ-System
```

### Step 2: ตั้งค่า Environment Files
```bash
# Backend Environment
cd backend/api-server
cp .env.local.example .env.local

# Frontend Environment
cd ../../frontend
cat > .env.local << 'EOF'
VITE_FRONTEND_MODE=api_only
VITE_AUTH_MODE=jwt_only
VITE_API_URL=http://localhost:3000
EOF
```

### Step 3: รัน PostgreSQL Container
```bash
cd ../../
docker compose up -d postgres
```

### Step 4: ตรวจสอบ Container Status
```bash
docker compose ps
# ควรแสดง postgres container ที่กำลังทำงาน

# ตรวจสอบ logs
docker compose logs postgres
```

### Step 5: สร้าง Database Schema
```bash
cd backend/api-server
DATABASE_MODE=local DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system npx prisma db push --schema ../prisma/schema.prisma
```

### Step 6: ตรวจสอบ Database Connection
```bash
# ทดสอบ connection
npx prisma db pull --schema ../prisma/schema.prisma

# เปิด Prisma Studio (optional)
npx prisma studio --schema ../prisma/schema.prisma
```

### Step 7: รัน Application
```bash
# Terminal 1: Backend
cd backend/api-server
npm start

# Terminal 2: Frontend
cd ../../frontend
npm run dev
```

---

## ⚙️ Environment Variables

### Backend (.env.local)
```bash
# ==========================================
# Server Configuration
# ==========================================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5174
ALLOWED_ORIGINS=http://localhost:5174,http://localhost:3000

# ==========================================
# Database Configuration
# ==========================================
DATABASE_MODE=local
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system

# ==========================================
# Storage Configuration
# ==========================================
STORAGE_PROVIDER=local
UPLOADS_DIR=./uploads
FILE_RETENTION_DAYS=30

# ==========================================
# Authentication Configuration
# ==========================================
AUTH_MODE=jwt_only
JWT_SECRET=your-super-secret-key-change-this-locally

# ==========================================
# Email Configuration (Optional)
# ==========================================
ENABLE_EMAIL_NOTIFICATIONS=false
EMAIL_API_URL=http://localhost:3001
EMAIL_API_KEY=local-dev-key

# ==========================================
# Feature Flags
# ==========================================
ENABLE_NOTIFICATIONS=true
ENABLE_RATE_LIMITING=false

# ==========================================
# Job Chaining Configuration
# ==========================================
MAX_CHAIN_DEPTH=3
ENABLE_FULL_TRANSITIVE=true
PREVENT_SELF_CHAIN=true
ENABLE_CYCLE_DETECTION=true
URGENT_SHIFT_DAYS=2
ENABLE_URGENT_RESCHEDULE=true
ENABLE_CHAIN_NOTIFICATIONS=true
```

### Frontend (.env.local)
```bash
# ==========================================
# Frontend Configuration
# ==========================================
VITE_FRONTEND_MODE=api_only
VITE_AUTH_MODE=jwt_only
VITE_API_URL=http://localhost:3000
```

---

## 🗄️ การจัดการ Database

### ดู Structure ของ Database
```bash
# ดูทุก tables
\dt

# ดู structure ของ table ที่กำหนด
\d table_name

# ดู indexes
\di

# ดู foreign keys
\df
```

### สร้างและจัดการ Data
```bash
# ดูจำนวน records ในแต่ละ table
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename;

# ดูข้อมูล users
SELECT id, email, displayName, status FROM users LIMIT 5;

# ดูข้อมูล jobs
SELECT id, dj_id, status, created_at FROM jobs LIMIT 5;
```

### Reset Database
```bash
# ลบและสร้าง database ใหม่
docker exec dj-postgres psql -U postgres -c "DROP DATABASE IF EXISTS dj_system; CREATE DATABASE dj_system;"

# รัน schema ใหม่
cd backend/api-server
DATABASE_MODE=local DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system npx prisma db push --schema ../prisma/schema.prisma --force-reset
```

---

## 🔧 การแก้ไขปัญหา

### Common Issues

#### 1. Port 5433 ถูกใช้อยู่
```bash
# หา process ที่ใช้ port 5433
lsof -i :5433

# หยุด process
kill -9 <PID>

# หรือเปลี่ยน port ใน docker-compose.yml
ports:
  - "5434:5432"  # เปลี่ยนจาก 5433 เป็น 5434
```

#### 2. Database Connection Failed
```bash
# ตรวจสอบ container status
docker compose ps postgres

# ตรวจสอบ logs
docker compose logs postgres

# รอให้ database พร้อม
sleep 10
docker exec dj-postgres pg_isready -U postgres
```

#### 3. Migration Errors
```bash
# Reset แล้วรันใหม่
npx prisma migrate reset --schema ../prisma/schema.prisma --force

# หรือใช้ db push แทน
npx prisma db push --schema ../prisma/schema.prisma
```

#### 4. Permission Errors
```bash
# ตรวจสอสิทธิ์ uploads folder
ls -la uploads/

# สร้าง folder ถ้าไม่มี
mkdir -p uploads
chmod 755 uploads
```

#### 5. Docker Issues
```bash
# รีสตาร์ท Docker Desktop
# หรือ rebuild container
docker compose down
docker compose up -d postgres --build
```

### Health Checks
```bash
# ตรวจสอบ backend health
curl http://localhost:3000/health

# ตรวจสอง database connection
docker exec dj-postgres psql -U postgres -c "SELECT version();"

# ตรวจสอบ frontend
curl http://localhost:5174/
```

---

## 💾 การ Backup และ Restore

### Backup Database
```bash
# Backup ทั้ง database
docker exec dj-postgres pg_dump -U postgres dj_system > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup เฉพาะ tables ที่ต้องการ
docker exec dj-postgres pg_dump -U postgres -t users -t jobs dj_system > users_jobs_backup.sql
```

### Restore Database
```bash
# Restore จาก backup file
docker exec -i dj-postgres psql -U postgres dj_system < backup_20260317_120000.sql

# Restore หลังจากสร้าง database ใหม่
docker exec dj-postgres psql -U postgres -c "DROP DATABASE IF EXISTS dj_system; CREATE DATABASE dj_system;"
docker exec -i dj-postgres psql -U postgres dj_system < backup_file.sql
```

### Export/Import Data
```bash
# Export ข้อมูล users เป็น CSV
docker exec dj-postgres psql -U postgres -d dj_system -c "\copy (SELECT id, email, displayName FROM users) TO 'users_export.csv' WITH CSV HEADER;"

# Import ข้อมูลจาก CSV
docker exec -i dj-postgres psql -U postgres -d dj_system -c "\copy users(id, email, displayName) FROM 'users_import.csv' WITH CSV HEADER;"
```

---

## 🛠️ เครื่องมือที่เป็นประโยชน์

### Prisma Commands
```bash
# ดู schema
npx prisma studio --schema ../prisma/schema.prisma

# Generate client
npx prisma generate --schema ../prisma/schema.prisma

# ตรวจสอบ schema
npx prisma validate --schema ../prisma/schema.prisma

# Format schema
npx prisma format --schema ../prisma/schema.prisma
```

### Docker Commands
```bash
# เข้าถึง container
docker exec -it dj-postgres bash

# ดู logs
docker compose logs -f postgres

# รีสตาร์ท container
docker compose restart postgres

# ดู resource usage
docker stats dj-postgres
```

### Database Monitoring
```bash
# ดู active connections
docker exec dj-postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# ดู table sizes
docker exec dj-postgres psql -U postgres -c "SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats WHERE schemaname = 'public' ORDER BY tablename;"

# ดู database size
docker exec dj-postgres psql -U postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;"
```

---

## 📝 ข้อมูลอ้างอิง

### Default Credentials
| Service | Username | Password | Port |
|---------|----------|----------|------|
| PostgreSQL | postgres | password | 5433 |
| Backend API | - | - | 3000 |
| Frontend | - | - | 5174 |

### Important Files
- `backend/api-server/.env.local` - Backend configuration
- `frontend/.env.local` - Frontend configuration  
- `docker-compose.yml` - Docker configuration
- `backend/prisma/schema.prisma` - Database schema

### Security Notes
⚠️ **สำหรับ Development เท่านั้น**
- Password `password` ควรเปลี่ยนสำหรับ production
- JWT secret ควรเปลี่ยนเป็นค่าที่ปลอดภัย
- Database ไม่ควร expose ไปยัง external network

---

## 🎯 Quick Start Commands

```bash
# 1. Start database
docker compose up -d postgres

# 2. Setup schema
cd backend/api-server
DATABASE_MODE=local DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system npx prisma db push --schema ../prisma/schema.prisma

# 3. Start backend
npm start

# 4. Start frontend (new terminal)
cd ../../frontend
npm run dev

# 5. Access applications
# Frontend: http://localhost:5174
# Backend: http://localhost:3000
# Prisma Studio: npx prisma studio
```

---

## 📞 การติดต่อและ Support

หากพบปัญหา:
1. ตรวจสอบ logs ของทุก service
2. ตรวจสอบ environment variables
3. ลอง restart containers
4. ตรวจสอสิทธิ์ files และ folders

สำหรับข้อมูลเพิ่มเติม:
- Prisma Documentation: https://www.prisma.io/docs
- Docker Compose Documentation: https://docs.docker.com/compose/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
