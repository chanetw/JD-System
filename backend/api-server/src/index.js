/**
 * @file index.js
 * @description DJ System API Server Entry Point
 * 
 * Initializes:
 * - Express.js server
 * - Socket.io for real-time communications
 * - REST API routes
 * - Authentication middleware
 * - CORS configuration
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { authenticateSocket } from './socket/middleware/auth.js';
import { setupJobEventHandlers } from './socket/handlers/jobEvents.js';
import { setupNotificationEventHandlers } from './socket/handlers/notificationEvents.js';

// Import Database Connection
import { getDatabase, testDatabaseConnection, closeDatabaseConnection } from './config/database.js';

// Import Supabase Configuration
import { testSupabaseConnection, isUsingSupabase } from './config/supabase.js';

// Import Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import approvalRoutes from './routes/approval.js';
import reportsRoutes from './routes/reports.js';
import storageRoutes from './routes/storage.js';

// ==========================================
// ขั้นตอนที่ 1: ตั้งค่า Environment Variables
// ==========================================

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

// ==========================================
// ขั้นตอนที่ 2: สร้าง Express App
// ==========================================

/**
 * @constant app
 * Express application instance
 */
const app = express();

// ==========================================
// ขั้นตอนที่ 3: ตั้งค่า Middleware
// ==========================================

// CORS Configuration
// ทำให้ Frontend สามารถเชื่อมต่อได้
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject if not allowed
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body Parser Middleware
// สำหรับ parse JSON request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ==========================================
// ขั้นตอนที่ 4: สร้าง HTTP Server สำหรับ Socket.io
// ==========================================

/**
 * @constant server
 * HTTP Server instance ที่รองรับ Socket.io
 */
const server = createServer(app);

/**
 * @constant io
 * Socket.io Server instance
 */
const io = new SocketIOServer(server, {
  // ==========================================
  // Socket.io Configuration
  // ==========================================
  
  // CORS Configuration
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  },

  // Transport Configuration
  // ใช้ WebSocket เป็นหลัก + HTTP Long Polling as fallback
  transports: ['websocket', 'polling'],

  // Connection Configuration
  pingInterval: 25000,      // ส่ง ping ทุก 25 วินาที
  pingTimeout: 20000,       // รอ pong สูงสุด 20 วินาที
  
  // Rate Limiting (optional)
  perMessageDeflate: false   // ปิด compression เพื่อให้เร็ว
});

// ==========================================
// ขั้นตอนที่ 5: ตั้งค่า Socket.io Authentication Middleware
// ==========================================

/**
 * ตรวจสอบ JWT Token ของ client ก่อนอนุญาติการเชื่อมต่อ
 * 
 * Server จะ:
 * 1. ตรวจสอบ JWT token ที่ส่งมา
 * 2. ตรวจสอบ tenant_id
 * 3. Attach user info ไปยัง socket object
 * 4. Join user ไปยัง personal room (tenant_id:user_id)
 */
io.use(authenticateSocket);

// ==========================================
// ขั้นตอนที่ 6: ตั้งค่า Socket.io Event Handlers
// ==========================================

/**
 * เมื่อ client เชื่อมต่อสำเร็จ
 */
io.on('connection', (socket) => {
  // ดึงข้อมูล user จาก socket object
  // (set by authenticateSocket middleware)
  const { userId, tenantId, role } = socket.handshake.auth;

  console.log(`[Socket] User connected: ${userId} (Role: ${role})`);
  console.log(`[Socket] Socket ID: ${socket.id}`);
  console.log(`[Socket] Room: tenant_${tenantId}:user_${userId}`);

  // ==========================================
  // Join User to Personal Room
  // ==========================================
  // สร้าง Personal room สำหรับเฉพาะ user นี้
  // เมื่อ emit ไปยัง room นี้จะได้รับ notification เท่านั้น
  const userRoom = `tenant_${tenantId}:user_${userId}`;
  socket.join(userRoom);

  // ==========================================
  // Setup Event Listeners
  // ==========================================
  
  // Setup Job Event Handlers
  // ตั้งค่า handlers สำหรับ job-related events
  setupJobEventHandlers(socket, io, { userId, tenantId, role });

  // Setup Notification Event Handlers
  // ตั้งค่า handlers สำหรับ notification-related events
  setupNotificationEventHandlers(socket, io, { userId, tenantId, role });

  // ==========================================
  // Disconnect Event
  // ==========================================
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] User disconnected: ${userId}. Reason: ${reason}`);
  });

  // ==========================================
  // Error Handling
  // ==========================================
  socket.on('error', (error) => {
    console.error(`[Socket] Error for user ${userId}:`, error);
  });
});

// ==========================================
// ขั้นตอนที่ 7: ตั้งค่า REST API Routes
// ==========================================

/**
 * Health Check Endpoint
 */
app.get('/health', async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อ database
    const dbConnected = await testDatabaseConnection();
    
    // ทดสอบการเชื่อมต่อ Supabase (ถ้าใช้)
    let supabaseStatus = 'not_configured';
    if (isUsingSupabase()) {
      const supabaseTest = await testSupabaseConnection();
      supabaseStatus = supabaseTest.success ? 'connected' : 'error';
    }
    
    res.json({ 
      status: 'ok', 
      message: 'DJ System API Server is running',
      database: dbConnected ? 'connected' : 'disconnected',
      supabase: supabaseStatus,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ 
      status: 'ok', 
      message: 'DJ System API Server is running',
      database: 'error',
      supabase: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API Version Endpoint
 */
app.get('/api/version', (req, res) => {
  res.json({ version: '1.0.0', name: 'DJ System API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/storage', storageRoutes);

// Routes will be added here in the future
// app.use('/api/notifications', notificationsRouter);
// app.use('/api/jobs', jobsRouter);
// etc.

// ==========================================
// ขั้นตอนที่ 8: Error Handling Middleware
// ==========================================

/**
 * 404 Not Found Handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ==========================================
// ขั้นตอนที่ 9: เริ่มต้นเซิร์ฟเวอร์
// ==========================================

/**
 * Start Server
 */
server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         DJ System API + Socket.io Server Started            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ 🚀 Server running at: http://localhost:${PORT}`);
  console.log(`║ 🔌 Socket.io ready at: ws://localhost:${PORT}`);
  console.log(`║ 📱 Frontend URL: ${FRONTEND_URL}`);
  console.log(`║ 🔐 CORS Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});

// ==========================================
// ขั้นตอนที่ 10: Graceful Shutdown
// ==========================================

/**
 * Handle graceful shutdown
 * เมื่อ SIGTERM signal รับได้ ให้ปิด server อย่างสวยงาม
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // ปิด database connection
  await closeDatabaseConnection();
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

/**
 * Handle graceful shutdown on SIGINT (Ctrl+C)
 */
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  
  // ปิด database connection
  await closeDatabaseConnection();
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// ==========================================
// Export for testing
// ==========================================

export { app, server, io };
