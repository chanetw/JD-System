# DJ System Backend - Dockerfile
# สำหรับ production deployment
# Build context: ./backend (ไม่ใช่ ./backend/api-server)

FROM node:18-alpine

# ติดตั้ง dependencies สำหรับ sharp (image processing)
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Copy package files ก่อนเพื่อ cache layer
COPY api-server/package*.json ./

# Copy Prisma schema จาก backend/prisma/
COPY prisma ./prisma/

# ติดตั้ง dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate --schema ./prisma/schema.prisma

# Copy source code
COPY api-server/src ./src/

# สร้างโฟลเดอร์ uploads
RUN mkdir -p /app/uploads

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
