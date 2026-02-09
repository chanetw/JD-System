/**
 * @file storage.js
 * @description File Storage Routes (Supabase & NAS)
 * 
 * Features:
 * - File upload/download
 * - Supabase Storage integration
 * - NAS fallback support
 * - File metadata management
 */

import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { SupabaseStorageService, isUsingSupabase } from '../config/supabase.js';
import { getDatabase } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = getDatabase();

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // อนุญาตไฟล์ประเภทต่างๆ
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่ได้รับอนุญาต'), false);
    }
  }
});

/**
 * POST /api/storage/upload
 * อัปโหลดไฟล์
 * 
 * @formdata {File} file - ไฟล์ที่ต้องการอัปโหลด
 * @formdata {string} folder - โฟลเดอร์ (optional)
 * @formdata {number} jobId - ID ของงาน (optional)
 * @formdata {number} projectId - ID ของโปรเจกต์ (optional)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { folder, jobId, projectId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: 'กรุณาเลือกไฟล์'
      });
    }

    let uploadResult;

    if (isUsingSupabase()) {
      // ใช้ Supabase Storage
      const supabaseStorage = new SupabaseStorageService();

      // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.originalname}`;
      const folderPath = folder || `tenant_${req.user.tenantId}`;

      uploadResult = await supabaseStorage.uploadFile(file.buffer, fileName, folderPath);
    } else {
      // ใช้ Local/NAS (fallback)
      uploadResult = await uploadToLocalFile(file, folder, req.user.tenantId);
    }

    if (!uploadResult.success) {
      return res.status(500).json(uploadResult);
    }

    // สร้าง Thumbnail สำหรับไฟล์รูปภาพ
    let thumbnailPath = null;
    if (file.mimetype.startsWith('image/')) {
      try {
        thumbnailPath = await generateThumbnail(file, uploadResult.data.path, req.user.tenantId);
        console.log('[Storage] Thumbnail created:', thumbnailPath);
      } catch (error) {
        console.error('[Storage] Thumbnail generation failed:', error.message);
        // ไม่ throw error - ให้ upload สำเร็จแต่ไม่มี thumbnail
      }
    }

    // บันทึกข้อมูลไฟล์ใน database
    const mediaFile = await prisma.mediaFile.create({
      data: {
        tenantId: req.user.tenantId,
        jobId: jobId ? parseInt(jobId) : null,
        projectId: projectId ? parseInt(projectId) : null,
        fileName: file.originalname,
        filePath: uploadResult.data.path,
        fileSize: BigInt(file.size),
        fileType: file.mimetype,
        mimeType: file.mimetype,
        thumbnailPath, // เพิ่มบันทึก thumbnail path
        uploadedBy: req.user.userId
      }
    });
    res.status(201).json({
      success: true,
      data: {
        id: mediaFile.id,
        fileName: mediaFile.fileName,
        filePath: mediaFile.filePath,
        fileSize: Number(mediaFile.fileSize),
        fileType: mediaFile.fileType,
        publicUrl: uploadResult.data.publicUrl,
        uploadedAt: mediaFile.createdAt
      },
      message: 'อัปโหลดไฟล์สำเร็จ'
    });

  } catch (error) {
    console.error('[Storage] Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'UPLOAD_FAILED',
      message: 'ไม่สามารถอัปโหลดไฟล์ได้',
      details: error.message
    });
  }
});

/**
 * GET /api/storage/files
 * ดึงรายการไฟล์
 * 
 * @query {string} folder - โฟลเดอร์ (optional)
 * @query {number} jobId - ID ของงาน (optional)
 * @query {number} projectId - ID ของโปรเจกต์ (optional)
 */
router.get('/files', async (req, res) => {
  try {
    const { folder, jobId, projectId } = req.query;

    const whereCondition = {
      tenantId: req.user.tenantId
    };

    if (jobId) {
      whereCondition.jobId = parseInt(jobId);
    }
    if (projectId) {
      whereCondition.projectId = parseInt(projectId);
    }

    const files = await prisma.mediaFile.findMany({
      where: whereCondition,
      include: {
        job: {
          select: {
            id: true,
            djId: true,
            subject: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: files.map(file => ({
        ...file,
        fileSize: Number(file.fileSize),
        publicUrl: isUsingSupabase() ?
          `https://${process.env.SUPABASE_URL?.replace('https://', '')}/storage/v1/object/public/${process.env.SUPABASE_STORAGE_BUCKET || 'dj-system-files'}/${file.filePath}` :
          `/uploads/${file.filePath}`
      }))
    });

  } catch (error) {
    console.error('[Storage] Get files error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_FILES_FAILED',
      message: 'ไม่สามารถดึงรายการไฟล์ได้'
    });
  }
});

/**
 * GET /api/storage/files/:id
 * ดาวน์โหลดไฟล์
 * 
 * @param {number} id - ID ของไฟล์
 */
router.get('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FILE_ID',
        message: 'ID ไฟล์ไม่ถูกต้อง'
      });
    }

    // ตรวจสอบว่าไฟล์มีอยู่และผู้ใช้มีสิทธิ์เข้าถึง
    const file = await prisma.mediaFile.findFirst({
      where: {
        id: fileId,
        tenantId: req.user.tenantId
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
        message: 'ไม่พบไฟล์นี้'
      });
    }

    let downloadResult;

    if (isUsingSupabase()) {
      // ดาวน์โหลดจาก Supabase
      const supabaseStorage = new SupabaseStorageService();
      downloadResult = await supabaseStorage.downloadFile(file.filePath);
    } else {
      // ดาวน์โหลดจาก Local/NAS
      downloadResult = await downloadFromLocalFile(file.filePath);
    }

    if (!downloadResult.success) {
      return res.status(500).json(downloadResult);
    }

    // ตั้งค่า headers สำหรับการดาวน์โหลด
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.setHeader('Content-Length', downloadResult.data.length);

    res.send(downloadResult.data);

  } catch (error) {
    console.error('[Storage] Download error:', error);
    res.status(500).json({
      success: false,
      error: 'DOWNLOAD_FAILED',
      message: 'ไม่สามารถดาวน์โหลดไฟล์ได้'
    });
  }
});

/**
 * DELETE /api/storage/files/:id
 * ลบไฟล์
 * 
 * @param {number} id - ID ของไฟล์
 */
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FILE_ID',
        message: 'ID ไฟล์ไม่ถูกต้อง'
      });
    }

    // ตรวจสอบว่าไฟล์มีอยู่และผู้ใช้มีสิทธิ์ลบ
    const file = await prisma.mediaFile.findFirst({
      where: {
        id: fileId,
        tenantId: req.user.tenantId
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
        message: 'ไม่พบไฟล์นี้'
      });
    }

    // ตรวจสอบสิทธิ์ (admin หรือ ผู้อัปโหลดเท่านั้น)
    if (!req.user.roles.includes('admin') && file.uploadedBy !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ลบไฟล์นี้'
      });
    }

    let deleteResult;

    if (isUsingSupabase()) {
      // ลบจาก Supabase
      const supabaseStorage = new SupabaseStorageService();
      deleteResult = await supabaseStorage.deleteFile(file.filePath);
    } else {
      // ลบจาก Local/NAS
      deleteResult = await deleteFromLocalFile(file.filePath);
    }

    if (!deleteResult.success) {
      return res.status(500).json(deleteResult);
    }

    // ลบข้อมูลจาก database
    await prisma.mediaFile.delete({
      where: { id: fileId }
    });

    res.json({
      success: true,
      message: 'ลบไฟล์สำเร็จ'
    });

  } catch (error) {
    console.error('[Storage] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'DELETE_FAILED',
      message: 'ไม่สามารถลบไฟล์ได้'
    });
  }
});

/**
 * GET /api/storage/config
 * ดึงข้อมูลการตั้งค่า storage
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      usingSupabase: isUsingSupabase(),
      supabaseConfig: isUsingSupabase() ? {
        bucketName: process.env.SUPABASE_STORAGE_BUCKET || 'dj-system-files',
        url: process.env.SUPABASE_URL
      } : null,
      maxFileSize: '10MB',
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip'
      ]
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('[Storage] Config error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_CONFIG_FAILED',
      message: 'ไม่สามารถดึงข้อมูลการตั้งค่าได้'
    });
  }
});

// ==========================================
// Helper Functions for Local/NAS Storage
// ==========================================

/**
 * อัปโหลดไฟล์ไป Local/NAS
 * 
 * @param {Object} file - ไฟล์จาก multer
 * @param {string} folder - โฟลเดอร์
 * @param {number} tenantId - ID ของ tenant
 * @returns {Promise<Object>} - ผลการอัปโหลด
 */
async function uploadToLocalFile(file, folder, tenantId) {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    const uploadDir = path.join(process.cwd(), 'uploads', `tenant_${tenantId}`, folder || '');
    await fs.mkdir(uploadDir, { recursive: true });

    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    // เขียนไฟล์
    await fs.writeFile(filePath, file.buffer);

    return {
      success: true,
      data: {
        path: path.relative(path.join(process.cwd(), 'uploads'), filePath),
        publicUrl: `/uploads/${path.relative(path.join(process.cwd(), 'uploads'), filePath)}`
      }
    };
  } catch (error) {
    console.error('[Local Storage] Upload failed:', error);
    return {
      success: false,
      error: 'LOCAL_UPLOAD_FAILED',
      message: 'ไม่สามารถอัปโหลดไฟล์ในเครื่องได้'
    };
  }
}

/**
 * ดาวน์โหลดไฟล์จาก Local/NAS
 * 
 * @param {string} filePath - พาธไฟล์
 * @returns {Promise<Object>} - ผลการดาวน์โหลด
 */
async function downloadFromLocalFile(filePath) {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const fullPath = path.join(process.cwd(), 'uploads', filePath);
    const fileBuffer = await fs.readFile(fullPath);

    return {
      success: true,
      data: fileBuffer
    };
  } catch (error) {
    console.error('[Local Storage] Download failed:', error);
    return {
      success: false,
      error: 'LOCAL_DOWNLOAD_FAILED',
      message: 'ไม่สามารถดาวน์โหลดไฟล์ในเครื่องได้'
    };
  }
}

/**
 * ลบไฟล์จาก Local/NAS
 * 
 * @param {string} filePath - พาธไฟล์
 * @returns {Promise<Object>} - ผลการลบ
 */
async function deleteFromLocalFile(filePath) {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const fullPath = path.join(process.cwd(), 'uploads', filePath);
    await fs.unlink(fullPath);

    return {
      success: true
    };
  } catch (error) {
    console.error('[Local Storage] Delete failed:', error);
    return {
      success: false,
      error: 'LOCAL_DELETE_FAILED',
      message: 'ไม่สามารถลบไฟล์ในเครื่องได้'
    };
  }
}

/**
 * สร้าง Thumbnail สำหรับไฟล์รูปภาพ
 * 
 * @param {Object} file - Multer file object
 * @param {string} originalPath - Path ของไฟล์ต้นฉบับ
 * @param {number} tenantId - Tenant ID
 * @returns {Promise<string|null>} - Path ของ thumbnail
 */
async function generateThumbnail(file, originalPath, tenantId) {
  try {
    // สร้างโฟลเดอร์ thumbnails ถ้ายังไม่มี
    const thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails', `tenant_${tenantId}`);
    await fs.promises.mkdir(thumbnailsDir, { recursive: true });

    // สร้างชื่อไฟล์ thumbnail
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const thumbnailFileName = `thumb_${timestamp}${ext}`;
    const thumbnailFullPath = path.join(thumbnailsDir, thumbnailFileName);

    // สร้าง Thumbnail ขนาด 400x300px (maintain aspect ratio)
    await sharp(file.buffer)
      .resize(400, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 }) // แปลงเป็น JPEG เพื่อประหยัดพื้นที่
      .toFile(thumbnailFullPath);

    // Return relative path
    return `thumbnails/tenant_${tenantId}/${thumbnailFileName}`;
  } catch (error) {
    console.error('[Thumbnail] Generation error:', error);
    throw error;
  }
}

export default router;
