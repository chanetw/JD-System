/**
 * @file supabase.js
 * @description Supabase Integration Configuration
 * 
 * Features:
 * - Direct Supabase client connection
 * - Storage bucket management
 * - Real-time subscriptions
 * - Authentication helpers
 */

import { createClient } from '@supabase/supabase-js';

/**
 * สร้าง Supabase client instance
 * 
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} supabaseKey - Supabase service role key
 * @returns {Object} - Supabase client instance
 */
export function createSupabaseClient(supabaseUrl, supabaseKey) {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Missing configuration, skipping Supabase initialization');
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });

    console.log('[Supabase] Client initialized successfully');
    return supabase;
  } catch (error) {
    console.error('[Supabase] Failed to initialize client:', error);
    return null;
  }
}

/**
 * ดึง Supabase client instance (singleton)
 * 
 * @returns {Object|null} - Supabase client or null if not configured
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}

/**
 * ทดสอบการเชื่อมต่อ Supabase
 * 
 * @returns {Promise<Object>} - ผลการทดสอบ
 */
export async function testSupabaseConnection() {
  try {
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return {
        success: false,
        error: 'NOT_CONFIGURED',
        message: 'Supabase ไม่ได้กำหนดค่า'
      };
    }

    // ทดสอบการเชื่อมต่อด้วยการ query ง่ายๆ
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);

    if (error) {
      return {
        success: false,
        error: 'CONNECTION_FAILED',
        message: 'ไม่สามารถเชื่อมต่อ Supabase ได้',
        details: error.message
      };
    }

    return {
      success: true,
      message: 'เชื่อมต่อ Supabase สำเร็จ'
    };
  } catch (error) {
    console.error('[Supabase] Connection test failed:', error);
    return {
      success: false,
      error: 'TEST_FAILED',
      message: 'ทดสอบการเชื่อมต่อล้มเหลว',
      details: error.message
    };
  }
}

/**
 * Supabase Storage Service
 * จัดการการอัปโหลด/ดาวน์โหลดไฟล์
 */
export class SupabaseStorageService {
  constructor() {
    this.supabase = getSupabaseClient();
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'dj-system-files';
  }

  /**
   * อัปโหลดไฟล์ไปยัง Supabase Storage
   * 
   * @param {File|Buffer} file - ไฟล์ที่ต้องการอัปโหลด
   * @param {string} fileName - ชื่อไฟล์
   * @param {string} folder - โฟลเดอร์ (optional)
   * @returns {Promise<Object>} - ผลการอัปโหลด
   */
  async uploadFile(file, fileName, folder = '') {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'SUPABASE_NOT_CONFIGURED',
          message: 'Supabase ไม่ได้กำหนดค่า'
        };
      }

      const filePath = folder ? `${folder}/${fileName}` : fileName;
      
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        return {
          success: false,
          error: 'UPLOAD_FAILED',
          message: 'อัปโหลดไฟล์ล้มเหลว',
          details: error.message
        };
      }

      // ดึง public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        data: {
          path: data.path,
          publicUrl
        },
        message: 'อัปโหลดไฟล์สำเร็จ'
      };
    } catch (error) {
      console.error('[SupabaseStorage] Upload failed:', error);
      return {
        success: false,
        error: 'UPLOAD_ERROR',
        message: 'เกิดข้อผิดพลาดในการอัปโหลด',
        details: error.message
      };
    }
  }

  /**
   * ดาวน์โหลดไฟล์จาก Supabase Storage
   * 
   * @param {string} filePath - พาธไฟล์
   * @returns {Promise<Object>} - ผลการดาวน์โหลด
   */
  async downloadFile(filePath) {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'SUPABASE_NOT_CONFIGURED',
          message: 'Supabase ไม่ได้กำหนดค่า'
        };
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        return {
          success: false,
          error: 'DOWNLOAD_FAILED',
          message: 'ดาวน์โหลดไฟล์ล้มเหลว',
          details: error.message
        };
      }

      return {
        success: true,
        data,
        message: 'ดาวน์โหลดไฟล์สำเร็จ'
      };
    } catch (error) {
      console.error('[SupabaseStorage] Download failed:', error);
      return {
        success: false,
        error: 'DOWNLOAD_ERROR',
        message: 'เกิดข้อผิดพลาดในการดาวน์โหลด',
        details: error.message
      };
    }
  }

  /**
   * ลบไฟล์จาก Supabase Storage
   * 
   * @param {string} filePath - พาธไฟล์
   * @returns {Promise<Object>} - ผลการลบ
   */
  async deleteFile(filePath) {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'SUPABASE_NOT_CONFIGURED',
          message: 'Supabase ไม่ได้กำหนดค่า'
        };
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        return {
          success: false,
          error: 'DELETE_FAILED',
          message: 'ลบไฟล์ล้มเหลว',
          details: error.message
        };
      }

      return {
        success: true,
        data,
        message: 'ลบไฟล์สำเร็จ'
      };
    } catch (error) {
      console.error('[SupabaseStorage] Delete failed:', error);
      return {
        success: false,
        error: 'DELETE_ERROR',
        message: 'เกิดข้อผิดพลาดในการลบไฟล์',
        details: error.message
      };
    }
  }

  /**
   * ดึงรายการไฟล์ในโฟลเดอร์
   * 
   * @param {string} folder - โฟลเดอร์ (optional)
   * @returns {Promise<Object>} - รายการไฟล์
   */
  async listFiles(folder = '') {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'SUPABASE_NOT_CONFIGURED',
          message: 'Supabase ไม่ได้กำหนดค่า'
        };
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        return {
          success: false,
          error: 'LIST_FAILED',
          message: 'ดึงรายการไฟล์ล้มเหลว',
          details: error.message
        };
      }

      return {
        success: true,
        data,
        message: 'ดึงรายการไฟล์สำเร็จ'
      };
    } catch (error) {
      console.error('[SupabaseStorage] List files failed:', error);
      return {
        success: false,
        error: 'LIST_ERROR',
        message: 'เกิดข้อผิดพลาดในการดึงรายการไฟล์',
        details: error.message
      };
    }
  }
}

/**
 * ตรวจสอบว่าใช้ Supabase อยู่หรือไม่
 * 
 * @returns {boolean} - true ถ้าใช้ Supabase
 */
export function isUsingSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * ดึงข้อมูลการตั้งค่า Supabase
 * 
 * @returns {Object} - ข้อมูลการตั้งค่า
 */
export function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucketName: process.env.SUPABASE_STORAGE_BUCKET || 'dj-system-files',
    isConfigured: isUsingSupabase()
  };
}

export default {
  createSupabaseClient,
  getSupabaseClient,
  testSupabaseConnection,
  SupabaseStorageService,
  isUsingSupabase,
  getSupabaseConfig
};
