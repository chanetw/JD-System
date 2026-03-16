/**
 * @file supabaseStorageProvider.js
 * @description Supabase Storage Provider (Wrapper)
 * 
 * ครอบ SupabaseStorageService เดิมให้ใช้ interface เดียวกับ provider อื่น
 * 
 * ENV: STORAGE_PROVIDER=supabase (default)
 */

import { SupabaseStorageService, isUsingSupabase } from '../../config/supabase.js';

export class SupabaseStorageProvider {
  constructor() {
    this.service = isUsingSupabase() ? new SupabaseStorageService() : null;
    if (!this.service) {
      console.warn('[SupabaseStorage] Supabase is not configured — storage operations will fail');
    }
  }

  /**
   * อัปโหลดไฟล์ไป Supabase Storage
   * @param {Buffer} buffer - File buffer
   * @param {string} fileName - ชื่อไฟล์
   * @param {string} folder - โฟลเดอร์
   * @returns {Promise<Object>}
   */
  async uploadFile(buffer, fileName, folder = '') {
    if (!this.service) {
      return {
        success: false,
        error: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase ไม่ได้กำหนดค่า'
      };
    }

    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${fileName}`;
    return this.service.uploadFile(buffer, safeFileName, folder);
  }

  /**
   * ดาวน์โหลดไฟล์จาก Supabase Storage
   * @param {string} filePath - พาธไฟล์
   * @returns {Promise<Object>}
   */
  async downloadFile(filePath) {
    if (!this.service) {
      return {
        success: false,
        error: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase ไม่ได้กำหนดค่า'
      };
    }

    return this.service.downloadFile(filePath);
  }

  /**
   * ลบไฟล์จาก Supabase Storage
   * @param {string} filePath - พาธไฟล์
   * @returns {Promise<Object>}
   */
  async deleteFile(filePath) {
    if (!this.service) {
      return {
        success: false,
        error: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase ไม่ได้กำหนดค่า'
      };
    }

    return this.service.deleteFile(filePath);
  }

  /**
   * ดึง public URL ของไฟล์
   * @param {string} filePath - พาธไฟล์
   * @returns {string}
   */
  getPublicUrl(filePath) {
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'dj-system-files';
    const supabaseUrl = process.env.SUPABASE_URL || '';
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
  }
}

export default SupabaseStorageProvider;
