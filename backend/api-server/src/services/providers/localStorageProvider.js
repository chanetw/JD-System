/**
 * @file localStorageProvider.js
 * @description Local Disk Storage Provider
 * 
 * เก็บไฟล์บน disk ของ server ที่โฟลเดอร์ /uploads/
 * รองรับ Docker volume mount
 * 
 * ENV: STORAGE_PROVIDER=local
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Base directory สำหรับเก็บไฟล์ */
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

export class LocalStorageProvider {
  constructor() {
    this.uploadsDir = UPLOADS_DIR;
  }

  /**
   * อัปโหลดไฟล์ไป Local disk
   * @param {Buffer} buffer - File buffer
   * @param {string} fileName - ชื่อไฟล์
   * @param {string} folder - โฟลเดอร์
   * @returns {Promise<Object>}
   */
  async uploadFile(buffer, fileName, folder = '') {
    try {
      // สร้างโฟลเดอร์ถ้ายังไม่มี
      const uploadDir = folder
        ? path.join(this.uploadsDir, folder)
        : this.uploadsDir;
      await fs.mkdir(uploadDir, { recursive: true });

      // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      const timestamp = Date.now();
      const safeFileName = `${timestamp}_${fileName}`;
      const fullPath = path.join(uploadDir, safeFileName);

      // เขียนไฟล์
      await fs.writeFile(fullPath, buffer);

      // คำนวณ relative path
      const relativePath = path.relative(this.uploadsDir, fullPath);

      return {
        success: true,
        data: {
          path: relativePath,
          publicUrl: `/uploads/${relativePath}`
        },
        message: 'อัปโหลดไฟล์สำเร็จ (Local)'
      };
    } catch (error) {
      console.error('[LocalStorage] Upload failed:', error);
      return {
        success: false,
        error: 'LOCAL_UPLOAD_FAILED',
        message: 'ไม่สามารถอัปโหลดไฟล์ในเครื่องได้',
        details: error.message
      };
    }
  }

  /**
   * ดาวน์โหลดไฟล์จาก Local disk
   * @param {string} filePath - พาธไฟล์ (relative)
   * @returns {Promise<Object>}
   */
  async downloadFile(filePath) {
    try {
      const fullPath = path.join(this.uploadsDir, filePath);
      const fileBuffer = await fs.readFile(fullPath);

      return {
        success: true,
        data: fileBuffer,
        message: 'ดาวน์โหลดไฟล์สำเร็จ (Local)'
      };
    } catch (error) {
      console.error('[LocalStorage] Download failed:', error);
      return {
        success: false,
        error: 'LOCAL_DOWNLOAD_FAILED',
        message: 'ไม่สามารถดาวน์โหลดไฟล์ในเครื่องได้',
        details: error.message
      };
    }
  }

  /**
   * ลบไฟล์จาก Local disk
   * @param {string} filePath - พาธไฟล์ (relative)
   * @returns {Promise<Object>}
   */
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this.uploadsDir, filePath);
      await fs.unlink(fullPath);

      return {
        success: true,
        message: 'ลบไฟล์สำเร็จ (Local)'
      };
    } catch (error) {
      console.error('[LocalStorage] Delete failed:', error);
      return {
        success: false,
        error: 'LOCAL_DELETE_FAILED',
        message: 'ไม่สามารถลบไฟล์ในเครื่องได้',
        details: error.message
      };
    }
  }

  /**
   * ดึง public URL ของไฟล์
   * @param {string} filePath - พาธไฟล์ (relative)
   * @returns {string}
   */
  getPublicUrl(filePath) {
    return `/uploads/${filePath}`;
  }
}

export default LocalStorageProvider;
