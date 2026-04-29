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
// Trigger restart
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { authenticateSocket } from './socket/middleware/auth.js';
import { setupJobEventHandlers } from './socket/handlers/jobEvents.js';
import { setupNotificationEventHandlers } from './socket/handlers/notificationEvents.js';

// Import Database Connection
import { getDatabase, testDatabaseConnection, closeDatabaseConnection } from './config/database.js';

// Import Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import approvalRoutes from './routes/approval.js';
import reportsRoutes from './routes/reports.js';
import storageRoutes from './routes/storage.js';
import jobsRoutes from './routes/jobs.js';
import departmentsRoutes from './routes/departments.js';
import masterDataRoutes from './routes/master-data.js';
import tenantsRoutes from './routes/tenants.js';
import budsRoutes from './routes/buds.js';
import projectsRoutes from './routes/projects.js';

import holidaysRoutes from './routes/holidays.js';
import jobTypesRoutes from './routes/job-types.js'; // ✓ NEW: Job Types Management
import approvalFlowsRoutes from './routes/approval-flows.js';
import commentsRoutes from './routes/comments.js'; // ✓ NEW: Job Comments with @mentions
import activitiesRoutes from './routes/activities.js'; // ✓ NEW: Job Activities
import analyticsRoutes from './routes/analytics.js'; // ✓ NEW: Analytics Tracking
import masterDataCombinedRoutes from './routes/master-data-combined.js'; // ⚡ Performance: Combined master data endpoint
import tenantSettingsRoutes from './routes/tenant-settings.js'; // ✓ NEW: Tenant Settings (CC emails, etc.)
import notificationsRoutes from './routes/notifications.js'; // ✓ NEW: In-App Notifications API
import emailSettingsRoutes from './routes/email-settings.js'; // ✓ NEW: Email Settings (CC emails per notification type)
import draftReadLogsRoutes from './routes/draft-read-logs.js'; // ✓ NEW: Draft Read Logs (Track when Requester reads draft)
import magicLinkRoutes from './routes/magic-link.js'; // ✓ NEW: Magic Link Authentication
import contactRoutes from './routes/contact.js'; // ✓ NEW: Contact Admin
import userRequestsRoutes from './routes/user-requests.js'; // ✓ NEW: User Requests inbox for admins

// V2 Flow Templates REMOVED - Using V1 Extended instead

// V2 Auth System Routes (Production-ready with Sequelize + RBAC)
import v2Routes from './v2/index.js';

// Cron Services
import jobReminderCron from './services/jobReminderCron.js';
import fileCleanupCron from './services/fileCleanupCron.js';

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
// ใช้ 50mb เพื่อให้ตรงกับ nginx client_max_body_size 50m และ multer MAX_UPLOAD_SIZE_MB=50
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static File Serving
// Serve uploaded files จาก /uploads/ (ใช้เมื่อ STORAGE_PROVIDER=local)
app.use('/uploads', express.static('uploads'));

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

app.set('io', io);

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

    res.json({
      status: 'ok',
      message: 'DJ System API Server is running',
      database: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'ok',
      message: 'DJ System API Server is running',
      database: 'error',
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

// Public tenant-settings endpoints (no auth required) - MUST BE FIRST
app.get('/api/tenant-settings/public/portal-settings', async (req, res) => {
  console.log('[Public Portal Settings] Called - NO AUTH REQUIRED');
  try {
    const { getDatabase } = await import('./config/database.js');
    const prisma = getDatabase();
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: 1 },
      select: { portalSettings: true }
    });

    const defaults = {
      heroTitle: 'ต้องการงาน Design อะไรวันนี้?',
      heroSubtitle: 'ค้นหางานเดิมหรือสร้าง Design Job ใหม่',
      announcementText: '',
      announcementVisible: false
    };

    const settings = { ...defaults, ...(tenant?.portalSettings || {}) };
    console.log('[Public Portal Settings] Returning:', settings);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[Public Portal Settings] error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch portal settings' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/buds', budsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/job-types', jobTypesRoutes); // ✓ NEW: Job Types API
app.use('/api/approvals', approvalRoutes);
app.use('/api/approval-flows', approvalFlowsRoutes);

// V2 Auth System Routes (Production-ready with Sequelize + RBAC)
// Endpoints: /api/v2/auth/*, /api/v2/users/*
// IMPORTANT: Must be mounted BEFORE /api routes to prevent comments router from blocking V2 auth endpoints
app.use('/api/v2', v2Routes);

// Comments API - Must be AFTER V2 routes to avoid blocking unauthenticated V2 endpoints
app.use('/api', commentsRoutes); // ✓ NEW: Comments API (routes: /api/jobs/:jobId/comments)
app.use('/api', activitiesRoutes); // ✓ NEW: Activities API (routes: /api/jobs/:jobId/activities)
// V2 Flow Templates API REMOVED - Using V1 Extended instead
app.use('/api/reports', reportsRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/analytics', analyticsRoutes); // ✓ NEW: Analytics API (routes: /api/analytics/track-click, /api/analytics/stats)
app.use('/api/master-data-combined', masterDataCombinedRoutes); // ⚡ Performance: Combined endpoint (6-7 calls → 1 call)

app.use('/api/tenant-settings', tenantSettingsRoutes); // ✓ NEW: Tenant Settings API (routes: /api/tenant-settings, /api/tenant-settings/rejection-cc-emails)
app.use('/api/email-settings', emailSettingsRoutes); // ✓ NEW: Email Settings API (routes: /api/email-settings, /api/email-settings/:type)
app.use('/api/draft-read-logs', draftReadLogsRoutes); // ✓ NEW: Draft Read Logs API (routes: /api/draft-read-logs/:jobId)
app.use('/api/magic-link', magicLinkRoutes); // ✓ NEW: Magic Link Authentication API

// ✓ Notifications API
app.use('/api/notifications', notificationsRoutes);

// ✓ Contact Admin API
app.use('/api/contact-admin', contactRoutes);

// ✓ User Requests API
app.use('/api/user-requests', userRequestsRoutes);

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

  // Start cron services
  try {
    jobReminderCron.start();
    console.log('✓ Job reminder cron started');
  } catch (cronErr) {
    console.error('✗ Failed to start job reminder cron:', cronErr);
  }
  try {
    fileCleanupCron.start();
    console.log('✓ File cleanup cron started');
  } catch (cronErr) {
    console.error('✗ Failed to start file cleanup cron:', cronErr);
  }
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

  // Stop cron services
  try {
    jobReminderCron.stop();
    console.log('✓ Job reminder cron stopped');
  } catch (cronErr) {
    console.error('✗ Failed to stop job reminder cron:', cronErr);
  }
  try {
    fileCleanupCron.stop();
    console.log('✓ File cleanup cron stopped');
  } catch (cronErr) {
    console.error('✗ Failed to stop file cleanup cron:', cronErr);
  }

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

  // Stop cron services
  try {
    jobReminderCron.stop();
    console.log('✓ Job reminder cron stopped');
  } catch (cronErr) {
    console.error('✗ Failed to stop job reminder cron:', cronErr);
  }
  try {
    fileCleanupCron.stop();
    console.log('✓ File cleanup cron stopped');
  } catch (cronErr) {
    console.error('✗ Failed to stop file cleanup cron:', cronErr);
  }

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
