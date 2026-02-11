/**
 * @file database.js
 * @description Database Connection Configuration
 *
 * จัดการการเชื่อมต่อ PostgreSQL สำหรับ:
 * - Development: Local PostgreSQL
 * - UAT: Supabase PostgreSQL
 * - Production: On-premise PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

/**
 * สร้าง Prisma Client instance สำหรับเชื่อมต่อ database
 *
 * @returns {PrismaClient} - Prisma client instance
 */
export function createDatabaseConnection() {
  // ดึง database URL จาก environment variable
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('[Database] DATABASE_URL not found in environment variables');
    console.warn('[Database] Using default connection for development');
  }

  // สร้าง Prisma Client พร้อม configuration
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl || 'postgresql://postgres:password@localhost:5432/dj_system'
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
  });

  return prisma;
}

/**
 * Set RLS tenant context for the database session
 * Must be called before executing queries to filter by tenant
 */
export async function setRLSContext(prisma, tenantId, userId = null) {
  try {
    // Set tenant ID if provided
    if (tenantId) {
      const validTenantId = parseInt(tenantId, 10);
      if (isNaN(validTenantId) || validTenantId <= 0) {
        console.warn('[RLS] Invalid tenant ID:', tenantId);
        return; // Don't continue if tenant ID is invalid
      }
      try {
        await prisma.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${validTenantId}', false)`);
        console.log('[RLS] ✅ Set tenant_id:', validTenantId);
      } catch (err) {
        console.error('[RLS] ❌ Failed to set tenant_id:', validTenantId, err.message);
        throw err;
      }
    }

    // Set user ID if provided (required for admin permission checks)
    if (userId) {
      const validUserId = parseInt(userId, 10);
      if (isNaN(validUserId) || validUserId <= 0) {
        console.warn('[RLS] Invalid user ID:', userId);
        return; // Don't continue if user ID is invalid
      }
      try {
        await prisma.$executeRawUnsafe(`SELECT set_config('app.current_user_id', '${validUserId}', false)`);
        console.log('[RLS] ✅ Set current_user_id:', validUserId);
      } catch (err) {
        console.error('[RLS] ❌ Failed to set current_user_id:', validUserId, err.message);
        throw err;
      }
    }
  } catch (error) {
    console.error('[RLS] ⚠️  RLS Context Error - This will cause 403 on queries:', {
      tenantId,
      userId,
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      stack: error.stack
    });
    // IMPORTANT: Re-throw the error so middleware can decide how to handle it
    throw error;
  }
}

/**
 * Singleton instance สำหรับใช้ใน application
 */
let prismaInstance = null;

/**
 * ดึง Prisma Client instance (Singleton pattern)
 * 
 * @returns {PrismaClient} - Prisma client instance
 */
export function getDatabase() {
  if (!prismaInstance) {
    prismaInstance = createDatabaseConnection();
  }
  return prismaInstance;
}

/**
 * ปิดการเชื่อมต่อ database
 * ใช้ตอน shutdown application
 */
export async function closeDatabaseConnection() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    console.log('[Database] Connection closed');
  }
}

/**
 * ทดสอบการเชื่อมต่อ database
 * 
 * @returns {Promise<boolean>} - true ถ้าเชื่อมต่อสำเร็จ
 */
export async function testDatabaseConnection() {
  try {
    const prisma = getDatabase();
    await prisma.$queryRaw`SELECT 1`;
    console.log('[Database] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Database] Connection test failed:', error.message);
    return false;
  }
}

export default {
  createDatabaseConnection,
  getDatabase,
  closeDatabaseConnection,
  testDatabaseConnection
};
