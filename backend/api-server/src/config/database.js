/**
 * @file database.js
 * @description Database Connection Configuration
 *
 * จัดการการเชื่อมต่อ PostgreSQL สำหรับ:
 * - Development: Local PostgreSQL
 * - UAT: Supabase PostgreSQL
 * - Production: On-premise PostgreSQL
 *
 * Dual-Mode Support:
 * - DATABASE_MODE=supabase  → ใช้ Supabase PostgreSQL (default)
 * - DATABASE_MODE=local     → ใช้ Local/Docker PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

/**
 * ตรวจสอบ Database Mode ปัจจุบัน
 * @returns {'supabase' | 'local'} - Database mode
 */
export function getDatabaseMode() {
  return process.env.DATABASE_MODE || 'supabase';
}

/**
 * สร้าง Prisma Client instance สำหรับเชื่อมต่อ database
 *
 * @returns {PrismaClient} - Prisma client instance
 */
export function createDatabaseConnection() {
  // ดึง database URL จาก environment variable
  const databaseUrl = process.env.DATABASE_URL;
  const dbMode = getDatabaseMode();

  if (!databaseUrl) {
    console.warn('[Database] DATABASE_URL not found in environment variables');
    console.warn('[Database] Using default connection for development');
  }

  console.log(`[Database] Mode: ${dbMode} | URL: ${databaseUrl ? databaseUrl.replace(/:[^:@]+@/, ':****@') : 'default'}`);

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
    const validTenantId = tenantId ? parseInt(tenantId, 10) : null;
    const validUserId = userId ? parseInt(userId, 10) : null;

    if (!validTenantId || isNaN(validTenantId) || validTenantId <= 0) {
      console.warn('[RLS] Invalid tenant ID:', tenantId);
      return;
    }

    // ⚡ Performance: รวม 2 set_config เป็น 1 query เพื่อลด round-trip
    if (validUserId && !isNaN(validUserId) && validUserId > 0) {
      await prisma.$executeRawUnsafe(
        `SELECT set_config('app.tenant_id', '${validTenantId}', false),
                set_config('app.current_user_id', '${validUserId}', false)`
      );
    } else {
      await prisma.$executeRawUnsafe(
        `SELECT set_config('app.tenant_id', '${validTenantId}', false)`
      );
    }
  } catch (error) {
    console.error('[RLS] ⚠️  RLS Context Error:', {
      tenantId,
      userId,
      errorMessage: error.message,
      errorCode: error.code
    });
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
