# Backend Restart Required After Schema Changes

## ⚠️ สำคัญ: หลังจาก Prisma Generate

เมื่อทำการ regenerate Prisma Client (`npx prisma generate`) หลังจากแก้ไข schema.prisma:

**ต้อง restart backend server ทุกครั้ง** เพื่อให้โหลด Prisma Client เวอร์ชันใหม่

---

## วิธี Restart Backend

### วิธีที่ 1: ใช้ PID file

```bash
cd backend/api-server

# Stop
kill $(cat backend.pid)

# Start
nohup node src/index.js > backend.log 2>&1 &
echo $! > backend.pid
```

### วิธีที่ 2: Kill by process name

```bash
# Find and kill
ps aux | grep "node src/index.js" | grep -v grep | awk '{print $2}' | xargs kill

# Start
cd backend/api-server
node src/index.js
```

### วิธีที่ 3: ใช้ npm script

```bash
cd backend/api-server

# Stop existing process first
kill $(lsof -ti:3000)

# Start
npm start
```

---

## ตรวจสอบว่า Backend รันอยู่

```bash
# Check process
ps aux | grep "node src/index.js" | grep -v grep

# Check port
lsof -i:3000

# Check logs
tail -f backend/api-server/backend.log
```

---

## สาเหตุที่ต้อง Restart

Node.js โหลด modules ตอน start ครั้งเดียว:

```
Server Start (ครั้งแรก)
  ├─ Load @prisma/client (old version)
  └─ Cache in memory

ทำ prisma generate (สร้าง client ใหม่)
  └─ node_modules/@prisma/client อัปเดต

Server ยังใช้ old client (cached in memory) ❌
  └─ ยังไม่รู้จัก nextJobTypeId

Restart Server
  ├─ Load @prisma/client (new version)
  └─ รู้จัก nextJobTypeId แล้ว ✅
```

---

## Quick Fix Script

สร้างไฟล์ `restart-backend.sh`:

```bash
#!/bin/bash

cd "$(dirname "$0")/backend/api-server"

echo "Stopping backend..."
kill $(cat backend.pid 2>/dev/null) 2>/dev/null || pkill -f "node src/index.js"

sleep 2

echo "Starting backend..."
nohup node src/index.js > backend.log 2>&1 &
echo $! > backend.pid

echo "Backend restarted. PID: $(cat backend.pid)"
echo "Check logs: tail -f backend/api-server/backend.log"
```

ใช้งาน:
```bash
chmod +x restart-backend.sh
./restart-backend.sh
```
