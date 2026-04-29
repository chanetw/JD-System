/**
 * @file storage.js
 * @description File Storage Routes
 * 
 * Features:
 * - File upload/download
 * - Local disk storage by default
 * - Optional Google Drive provider support
 * - File metadata management
 */

import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { hasRole } from '../helpers/roleHelper.js';
import { getDatabase } from '../config/database.js';
import { getStorageService, getStorageMode } from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = getDatabase();

const MAX_UPLOAD_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10);
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  // Design files
  'application/postscript',
  'image/vnd.adobe.photoshop'
];

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่ได้รับอนุญาต'), false);
    }
  }
});

function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      // Multer decodes multipart filenames as latin1 by default.
      // Re-encode back to get the correct UTF-8 string (fixes Thai/Unicode filenames).
      if (req.file) {
        req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      }
      return next();
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: `ไฟล์ขนาดใหญ่เกินไป (สูงสุด ${MAX_UPLOAD_SIZE_MB}MB)`
      });
    }

    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE',
      message: err.message || 'ไม่สามารถอัปโหลดไฟล์ได้'
    });
  });
}

const normalizeExternalFileUrl = (value) => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value;
  }
  return `https://${value}`;
};

const buildContentDisposition = (type, fileName) => {
  const safeFileName = String(fileName || 'download')
    .replace(/[^\x20-\x7E]|[\r\n"]/g, '_');
  const encodedFileName = encodeURIComponent(String(fileName || 'download'));
  return `${type}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;
};

const sendStoredFile = async (req, res, { disposition = 'attachment' } = {}) => {
  const { id } = req.params;
  const fileId = parseInt(id);

  if (isNaN(fileId)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE_ID',
      message: 'ID ไฟล์ไม่ถูกต้อง'
    });
  }

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

  if (file.fileType === 'link') {
    const externalUrl = normalizeExternalFileUrl(file.filePath);
    if (!externalUrl) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FILE_URL',
        message: 'ลิงก์ไฟล์ไม่ถูกต้อง'
      });
    }
    return res.redirect(externalUrl);
  }

  const storageService = getStorageService();
  const downloadResult = await storageService.downloadFile(file.filePath);

  if (!downloadResult.success) {
    return res.status(500).json(downloadResult);
  }

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', buildContentDisposition(disposition, file.fileName));
  res.setHeader('Content-Length', downloadResult.data.length);

  return res.send(downloadResult.data);
};

/**
 * POST /api/storage/upload
 * อัปโหลดไฟล์
 * 
 * @formdata {File} file - ไฟล์ที่ต้องการอัปโหลด
 * @formdata {string} folder - โฟลเดอร์ (optional)
 * @formdata {number} jobId - ID ของงาน (optional)
 * @formdata {number} projectId - ID ของโปรเจกต์ (optional)
 */
router.post('/upload', uploadSingleFile, async (req, res) => {
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

    // ใช้ StorageService abstraction (เลือก provider จาก STORAGE_PROVIDER env)
    const storageService = getStorageService();
    const folderPath = folder || `tenant_${req.user.tenantId}`;
    uploadResult = await storageService.uploadFile(file.buffer, file.originalname, folderPath);

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
    const { folder, jobId, projectId, includeUnlinked } = req.query;
    const userId = req.user.userId;
    const userRoles = req.user.roles || [];

    // ตรวจสอบว่า user เป็น admin/superadmin หรือไม่
    const isAdmin = userRoles.some(role => 
      ['admin', 'superadmin'].includes(typeof role === 'string' ? role.toLowerCase() : role?.name?.toLowerCase())
    );

    const whereCondition = {
      tenantId: req.user.tenantId
    };

    // Default behavior for portal/gallery: show only files already linked to a job
    // (pre-submit uploads/orphan files should not be visible)
    if (!jobId && String(includeUnlinked ?? 'false').toLowerCase() !== 'true') {
      whereCondition.jobId = { not: null };
    }

    if (jobId) {
      whereCondition.jobId = parseInt(jobId);
    }
    if (projectId) {
      whereCondition.projectId = parseInt(projectId);
    }

    // ถ้าไม่ใช่ admin ให้กรองเฉพาะโครงการที่ user มีส่วนเกี่ยวข้อง
    if (!isAdmin) {
      // ดึงโครงการที่ user เป็น requester, assignee, หรือ approver
      const userJobs = await prisma.job.findMany({
        where: {
          tenantId: req.user.tenantId,
          OR: [
            { requesterId: userId },
            { assigneeId: userId },
            { approvals: { some: { approverId: userId } } }
          ]
        },
        select: { projectId: true },
        distinct: ['projectId']
      });

      const userProjectIds = [...new Set(userJobs.map(j => j.projectId).filter(Boolean))];
      
      if (userProjectIds.length === 0) {
        // ถ้าไม่มีโครงการที่เกี่ยวข้อง ส่ง empty array
        return res.json({
          success: true,
          data: []
        });
      }

      whereCondition.projectId = { in: userProjectIds };
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
      data: files.map(file => {
        // ถ้าเป็น link ภายนอก (Google Drive, Canva, etc.) ให้ใช้ filePath โดยตรง
        let publicUrl;
        if (file.fileType === 'link') {
          publicUrl = file.filePath;
          // เติม https:// ถ้า URL ไม่มี protocol
          if (publicUrl && !publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
            publicUrl = 'https://' + publicUrl;
          }
        } else {
          // ใช้ StorageService abstraction สำหรับ publicUrl
          const storageService = getStorageService();
          publicUrl = storageService.getPublicUrl(file.filePath);
        }

        return {
          ...file,
          fileSize: Number(file.fileSize),
          publicUrl
        };
      })
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
 * GET /api/storage/files/:id/view
 * เปิดดูไฟล์ใน browser (PDF preview ใช้ Content-Disposition: inline)
 *
 * @param {number} id - ID ของไฟล์
 */
router.get('/files/:id/view', async (req, res) => {
  try {
    return await sendStoredFile(req, res, { disposition: 'inline' });
  } catch (error) {
    console.error('[Storage] View error:', error);
    res.status(500).json({
      success: false,
      error: 'VIEW_FAILED',
      message: 'ไม่สามารถเปิดดูไฟล์ได้'
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
    return await sendStoredFile(req, res, { disposition: 'attachment' });
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
    if (!hasRole(req.user.roles, 'admin') && file.uploadedBy !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ลบไฟล์นี้'
      });
    }

    let deleteResult;

    // ใช้ StorageService abstraction
    const storageService = getStorageService();
    deleteResult = await storageService.deleteFile(file.filePath);

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
      storageProvider: getStorageMode(),
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
