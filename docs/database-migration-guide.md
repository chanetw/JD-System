# 📚 Database Migration Guide

## 🎯 ภาพรวม

คู่มือนี้อธิบายการใช้งานระบบฐานข้อมูลแบบ Dual-Mode ที่สามารถสลับระหว่าง Supabase และ Local/Docker PostgreSQL ได้

## 🔄 Dual-Mode Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│                 │    │                 │
│ VITE_AUTH_MODE  │───▶│ AUTH_MODE       │
│ VITE_FRONTEND_  │    │ DATABASE_MODE    │
│ MODE            │    │ STORAGE_PROVIDER │
└─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Database      │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ Supabase    │ │
                    │ │ PostgreSQL  │ │
                    │ └─────────────┘ │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ Local/Docker│ │
                    │ │ PostgreSQL  │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

## 🛠️ Environment Variables

### Backend Configuration
```env
# Database Mode
DATABASE_MODE=supabase          # supabase | local
DATABASE_URL=postgresql://...   # Connection string

# Storage Provider
STORAGE_PROVIDER=supabase       # supabase | local | google_drive

# Google Drive (if using google_drive)
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
GOOGLE_DRIVE_FOLDER_ID=1xxxxxxxxxxxxx

# Local Storage (if using local)
UPLOADS_DIR=./uploads
```

### Frontend Configuration
```env
# Authentication Mode
VITE_AUTH_MODE=supabase         # supabase | jwt_only

# Frontend Mode
VITE_FRONTEND_MODE=supabase     # supabase | api_only
```

## 🚀 Quick Start

### 1. ใช้งานกับ Supabase (Default)
```bash
# Backend .env
DATABASE_MODE=supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
STORAGE_PROVIDER=supabase

# Frontend .env
VITE_AUTH_MODE=supabase
VITE_FRONTEND_MODE=supabase

# Start services
npm run dev  # Backend
npm run dev  # Frontend
```

### 2. ใช้งานกับ Local/Docker
```bash
# Start Docker PostgreSQL
docker-compose up -d postgres

# Backend .env
DATABASE_MODE=local
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system
STORAGE_PROVIDER=local

# Frontend .env (optional)
VITE_AUTH_MODE=jwt_only
VITE_FRONTEND_MODE=api_only

# Start services
npm run dev  # Backend
npm run dev  # Frontend
```

## 📋 Mode Combinations

| DATABASE_MODE | STORAGE_PROVIDER | VITE_AUTH_MODE | VITE_FRONTEND_MODE | Use Case |
|---------------|------------------|-----------------|-------------------|---------|
| supabase | supabase | supabase | supabase | **Production (Current)** |
| local | local | jwt_only | api_only | **Local Development** |
| supabase | local | supabase | supabase | **Hybrid (Supabase DB, Local Files)** |
| local | google_drive | jwt_only | api_only | **Local DB, Cloud Files** |

## 🔄 Migration Steps

### Phase 1: Sync Data to Local
```bash
# 1. Export from Supabase
export SUPABASE_DB_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
./scripts/sync-supabase-to-docker.sh

# 2. Verify data
docker exec dj-postgres psql -U postgres dj_system -c "SELECT COUNT(*) FROM jobs;"
```

### Phase 2: Switch to Local Mode
```bash
# Update backend .env
DATABASE_MODE=local
DATABASE_URL=postgresql://postgres:password@localhost:5433/dj_system

# Restart backend
npm run dev
```

### Phase 3: Test Applications
```bash
# Test API endpoints
curl http://localhost:3000/api/jobs

# Test frontend
# Open http://localhost:5173
# Check console logs for mode information
```

## 🗂️ File Storage Options

### 1. Supabase Storage (Default)
```env
STORAGE_PROVIDER=supabase
```
- Files stored in Supabase Storage bucket
- Public URLs automatically generated
- RLS policies apply

### 2. Local Disk Storage
```env
STORAGE_PROVIDER=local
UPLOADS_DIR=./uploads
```
- Files stored in local filesystem
- Served via `/uploads` endpoint
- Docker volume support for persistence

### 3. Google Drive Storage
```env
STORAGE_PROVIDER=google_drive
GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'
GOOGLE_DRIVE_FOLDER_ID=1xxxxxxxxxxxxx
```
- Files stored in Google Drive folder
- Requires service account setup
- Public sharing links automatically created

## 🔧 Docker Operations

### Development Environment
```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Check status
docker ps | grep dj-postgres
docker exec dj-postgres pg_isready -U postgres

# View logs
docker-compose logs postgres
```

### Production Environment
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost:3000/health

# View logs
docker-compose -f docker-compose.prod.yml logs
```

## 💾 Backup & Restore

### Backup Database & Files
```bash
# Create backup
./scripts/backup-docker.sh

# View backup files
ls -la backups/
```

### Manual Backup
```bash
# Database only
docker exec dj-postgres pg_dump -U postgres dj_system > backup.sql

# Files only (if using local storage)
docker run --rm \
  -v dj-data-prod:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/files.tar.gz -C /data uploads/
```

### Restore Database
```bash
# Stop backend
pkill -f "npm run dev"

# Restore database
docker exec -i dj-postgres psql -U postgres dj_system < backup.sql

# Start backend
npm run dev
```

## 🧪 Testing Modes

### Test Storage Provider Switching
```bash
# Test each provider
for provider in supabase local google_drive; do
  echo "Testing $provider..."
  STORAGE_PROVIDER=$provider npm run dev &
  sleep 3
  curl -s http://localhost:3000/api/storage/config | jq '.storageProvider'
  pkill -f "npm run dev"
done
```

### Test Database Mode Switching
```bash
# Test database modes
for mode in supabase local; do
  echo "Testing $mode database..."
  DATABASE_MODE=$mode npm run dev &
  sleep 3
  curl -s http://localhost:3000/health | jq '.database'
  pkill -f "npm run dev"
done
```

### Test Frontend Modes
```bash
# Test frontend modes
for auth in supabase jwt_only; do
  for frontend in supabase api_only; do
    echo "Testing AUTH_MODE=$auth, FRONTEND_MODE=$frontend"
    VITE_AUTH_MODE=$auth VITE_FRONTEND_MODE=$frontend npm run dev &
    sleep 3
    # Open browser and test
    pkill -f "npm run dev"
  done
done
```

## 🔍 Debugging

### Check Current Mode
```bash
# Backend logs show mode on startup
npm run dev
# Look for:
# [Database] Mode: supabase | URL: postgresql://****@****
# [StorageService] Provider: local

# Frontend console shows mode
# Open browser dev tools
# Look for mode indicators in network requests
```

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :5173  # Frontend

# Kill processes
lsof -ti:3000 | xargs kill -9
```

#### Docker Issues
```bash
# Reset Docker volumes
docker-compose down -v
docker system prune -f
docker-compose up -d postgres
```

#### Connection Issues
```bash
# Test database connection
docker exec dj-postgres psql -U postgres dj_system -c "SELECT version();"

# Test backend health
curl http://localhost:3000/health

# Test storage config (requires auth)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/storage/config
```

## 📚 Reference

### Environment Variables Summary
| Variable | Options | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_MODE` | `supabase`, `local` | `supabase` | Database connection mode |
| `STORAGE_PROVIDER` | `supabase`, `local`, `google_drive` | `supabase` | File storage provider |
| `VITE_AUTH_MODE` | `supabase`, `jwt_only` | `supabase` | Frontend authentication |
| `VITE_FRONTEND_MODE` | `supabase`, `api_only` | `supabase` | Frontend API calls |
| `UPLOADS_DIR` | path | `./uploads` | Local storage directory |

### File Locations
- Docker Compose: `docker-compose.yml`, `docker-compose.prod.yml`
- Dockerfile: `backend/api-server/Dockerfile`
- Scripts: `scripts/sync-supabase-to-docker.sh`, `scripts/backup-docker.sh`
- Storage Service: `backend/api-server/src/services/storageService.js`
- Providers: `backend/api-server/src/services/providers/`

### Port Mappings
| Service | Development | Production |
|---------|-------------|------------|
| Frontend | 5173 | 80 (via Nginx) |
| Backend | 3000 | 3000 |
| PostgreSQL | 5433 | 5432 (internal) |

---

**📝 Note:** ระบบถูกออกแบบให้ทำงานเหมือนเดิมเมื่อใช้ค่า default (supabase) การเปลี่ยน mode เป็นแบบ optional สำหรับการทดสอบและ migration เท่านั้น
