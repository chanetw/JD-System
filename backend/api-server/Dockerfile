# DJ System Backend - Dockerfile
# สำหรับ production deployment (multi-platform: AMD64 + ARM64)
# Build context: ./backend (ไม่ใช่ ./backend/api-server)

FROM node:18-alpine

# ติดตั้ง dependencies สำหรับ sharp (image processing) + openssl สำหรับ Prisma
RUN apk add --no-cache python3 make g++ vips-dev openssl

WORKDIR /app

# Copy package files ก่อนเพื่อ cache layer
COPY api-server/package*.json ./

# Copy Prisma schema จาก backend/prisma/
COPY prisma ./prisma/

# ติดตั้ง dependencies (ทั้ง prod + dev เพื่อ Prisma generate)
RUN npm ci

# Generate Prisma Client (สร้าง query engine ตาม platform ที่ build)
# หมายเหตุ: schema.prisma มี output = "../api-server/node_modules/.prisma/client"
# ซึ่งใน Docker จะสร้างที่ /app/api-server/node_modules/.prisma/client/
# ต้อง copy ไปยัง /app/node_modules/.prisma/client/ ที่ Node.js ค้นหา
RUN npx prisma generate --schema ./prisma/schema.prisma && \
    cp -r /app/api-server/node_modules/.prisma/client/* /app/node_modules/.prisma/client/

# Copy source code
COPY api-server/src ./src/

# Copy scripts
COPY api-server/scripts ./scripts/

# Copy startup script
COPY api-server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# สร้างโฟลเดอร์ uploads
RUN mkdir -p /app/uploads

EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=10s --retries=5 --start-period=30s \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
