# DJ System Frontend - Dockerfile
# Multi-stage build: Build React + Serve ด้วย Nginx
# สำหรับ production deployment

# ==========================================
# Stage 1: Build
# ==========================================
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files ก่อนเพื่อ cache layer
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm ci

# Copy source code
COPY . .

# Build args สำหรับ ENV ที่ต้อง inject ตอน build
ARG VITE_API_URL=http://localhost:3000
ARG VITE_FRONTEND_MODE=api_only
ARG VITE_AUTH_MODE=jwt_only

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FRONTEND_MODE=$VITE_FRONTEND_MODE
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE

# Build React app
RUN npm run build

# ==========================================
# Stage 2: Serve ด้วย Nginx
# ==========================================
FROM nginx:alpine

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
