# DJ System Backend - Dockerfile
# สำหรับ production deployment

FROM node:18-alpine

# ติดตั้ง dependencies สำหรับ sharp (image processing)
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Copy package files ก่อนเพื่อ cache layer
COPY package*.json ./
COPY prisma ./prisma/

# ติดตั้ง dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# สร้างโฟลเดอร์ uploads
RUN mkdir -p /app/uploads

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npm", "start"]
