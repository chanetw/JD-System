/**
 * @file storageService.js
 * @description Storage Service Abstraction - รองรับหลาย provider
 * 
 * Dual-Mode Support:
 * - STORAGE_PROVIDER=supabase      → Supabase Storage (default)
 * - STORAGE_PROVIDER=local         → Local disk /uploads/
 * - STORAGE_PROVIDER=google_drive  → Google Drive API
 * 
 * ทุก provider ใช้ interface เดียวกัน:
 * - uploadFile(buffer, fileName, folder) → { success, data: { path, publicUrl } }
 * - downloadFile(filePath)               → { success, data: Buffer }
 * - deleteFile(filePath)                 → { success }
 * - getPublicUrl(filePath)               → string
 */

import { LocalStorageProvider } from './providers/localStorageProvider.js';
import { GoogleDriveProvider } from './providers/googleDriveProvider.js';
import { SupabaseStorageProvider } from './providers/supabaseStorageProvider.js';

/**
 * ตรวจสอบ Storage Provider ปัจจุบัน
 * @returns {'supabase' | 'local' | 'google_drive'} - Storage provider type
 */
export function getStorageMode() {
  return process.env.STORAGE_PROVIDER || 'supabase';
}

/**
 * Storage Service - Abstract interface สำหรับจัดการไฟล์
 */
export class StorageService {
  constructor() {
    this.provider = this._createProvider();
    console.log(`[StorageService] Provider: ${this.getProviderType()}`);
  }

  /**
   * สร้าง provider ตาม environment variable
   * @private
   */
  _createProvider() {
    const providerType = getStorageMode();
    
    switch (providerType) {
      case 'google_drive':
        return new GoogleDriveProvider();
      case 'local':
        return new LocalStorageProvider();
      case 'supabase':
      default:
        return new SupabaseStorageProvider();
    }
  }

  /**
   * อัปโหลดไฟล์
   * @param {Buffer} buffer - File buffer
   * @param {string} fileName - ชื่อไฟล์
   * @param {string} folder - โฟลเดอร์ (optional)
   * @returns {Promise<Object>} - { success, data: { path, publicUrl }, error }
   */
  async uploadFile(buffer, fileName, folder = '') {
    return this.provider.uploadFile(buffer, fileName, folder);
  }

  /**
   * ดาวน์โหลดไฟล์
   * @param {string} filePath - พาธไฟล์
   * @returns {Promise<Object>} - { success, data: Buffer, error }
   */
  async downloadFile(filePath) {
    return this.provider.downloadFile(filePath);
  }

  /**
   * ลบไฟล์
   * @param {string} filePath - พาธไฟล์
   * @returns {Promise<Object>} - { success, error }
   */
  async deleteFile(filePath) {
    return this.provider.deleteFile(filePath);
  }

  /**
   * ดึง public URL ของไฟล์
   * @param {string} filePath - พาธไฟล์
   * @returns {string} - Public URL
   */
  getPublicUrl(filePath) {
    return this.provider.getPublicUrl(filePath);
  }

  /**
   * ดึงชื่อ provider ที่ใช้งาน
   * @returns {string} - Provider type
   */
  getProviderType() {
    return getStorageMode();
  }
}

/** Singleton instance */
let storageInstance = null;

/**
 * ดึง StorageService instance (Singleton)
 * @returns {StorageService}
 */
export function getStorageService() {
  if (!storageInstance) {
    storageInstance = new StorageService();
  }
  return storageInstance;
}

export default {
  StorageService,
  getStorageService,
  getStorageMode
};
