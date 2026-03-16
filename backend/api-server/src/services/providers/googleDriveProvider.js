/**
 * @file googleDriveProvider.js
 * @description Google Drive Storage Provider
 * 
 * อัปโหลด/ดาวน์โหลด/ลบไฟล์ผ่าน Google Drive API
 * ใช้ Service Account สำหรับ authentication
 * 
 * ENV:
 * - STORAGE_PROVIDER=google_drive
 * - GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}  (JSON string)
 * - GOOGLE_DRIVE_FOLDER_ID=1xxxxxxxxxxxxx
 * 
 * Dependencies (ต้องติดตั้งเพิ่ม):
 * - googleapis: npm install googleapis
 */

export class GoogleDriveProvider {
  constructor() {
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    this.drive = null;
    this._initialized = false;
  }

  /**
   * Initialize Google Drive API client (lazy)
   * @private
   */
  async _init() {
    if (this._initialized) return;

    try {
      const { google } = await import('googleapis');

      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
      if (!serviceAccountJson) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is not set');
      }
      if (!this.folderId) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set');
      }

      const credentials = JSON.parse(serviceAccountJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth });
      this._initialized = true;
      console.log('[GoogleDrive] Initialized successfully');
    } catch (error) {
      console.error('[GoogleDrive] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * อัปโหลดไฟล์ไป Google Drive
   * @param {Buffer} buffer - File buffer
   * @param {string} fileName - ชื่อไฟล์
   * @param {string} folder - โฟลเดอร์ (ใช้เป็น prefix ของชื่อไฟล์)
   * @returns {Promise<Object>}
   */
  async uploadFile(buffer, fileName, folder = '') {
    try {
      await this._init();

      const { Readable } = await import('stream');

      // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      const timestamp = Date.now();
      const driveName = folder
        ? `${folder}/${timestamp}_${fileName}`
        : `${timestamp}_${fileName}`;

      const fileMetadata = {
        name: driveName,
        parents: [this.folderId]
      };

      const media = {
        mimeType: 'application/octet-stream',
        body: Readable.from(buffer)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink'
      });

      // ตั้งค่าให้ทุกคนที่มี link ดูได้
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return {
        success: true,
        data: {
          path: `gdrive:${response.data.id}`,
          publicUrl: response.data.webViewLink,
          driveFileId: response.data.id
        },
        message: 'อัปโหลดไฟล์สำเร็จ (Google Drive)'
      };
    } catch (error) {
      console.error('[GoogleDrive] Upload failed:', error);
      return {
        success: false,
        error: 'GDRIVE_UPLOAD_FAILED',
        message: 'ไม่สามารถอัปโหลดไฟล์ไป Google Drive ได้',
        details: error.message
      };
    }
  }

  /**
   * ดาวน์โหลดไฟล์จาก Google Drive
   * @param {string} filePath - พาธไฟล์ (format: gdrive:{fileId})
   * @returns {Promise<Object>}
   */
  async downloadFile(filePath) {
    try {
      await this._init();

      const fileId = filePath.replace('gdrive:', '');

      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' });

      return {
        success: true,
        data: Buffer.from(response.data),
        message: 'ดาวน์โหลดไฟล์สำเร็จ (Google Drive)'
      };
    } catch (error) {
      console.error('[GoogleDrive] Download failed:', error);
      return {
        success: false,
        error: 'GDRIVE_DOWNLOAD_FAILED',
        message: 'ไม่สามารถดาวน์โหลดไฟล์จาก Google Drive ได้',
        details: error.message
      };
    }
  }

  /**
   * ลบไฟล์จาก Google Drive
   * @param {string} filePath - พาธไฟล์ (format: gdrive:{fileId})
   * @returns {Promise<Object>}
   */
  async deleteFile(filePath) {
    try {
      await this._init();

      const fileId = filePath.replace('gdrive:', '');
      await this.drive.files.delete({ fileId });

      return {
        success: true,
        message: 'ลบไฟล์สำเร็จ (Google Drive)'
      };
    } catch (error) {
      console.error('[GoogleDrive] Delete failed:', error);
      return {
        success: false,
        error: 'GDRIVE_DELETE_FAILED',
        message: 'ไม่สามารถลบไฟล์จาก Google Drive ได้',
        details: error.message
      };
    }
  }

  /**
   * ดึง public URL ของไฟล์
   * @param {string} filePath - พาธไฟล์ (format: gdrive:{fileId})
   * @returns {string}
   */
  getPublicUrl(filePath) {
    const fileId = filePath.replace('gdrive:', '');
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
}

export default GoogleDriveProvider;
