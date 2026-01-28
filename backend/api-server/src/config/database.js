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
