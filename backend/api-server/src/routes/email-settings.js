/**
 * @file email-settings.js
 * @description API Routes สำหรับจัดการ Email Settings (CC emails แยกตามประเภท)
 * 
 * Endpoints:
 * - GET /api/email-settings - ดึงการตั้งค่า email ทั้งหมด
 * - GET /api/email-settings/:type - ดึงการตั้งค่าแยกตามประเภท
 * - PUT /api/email-settings/:type - อัปเดตการตั้งค่าแยกตามประเภท
 * - POST /api/email-settings/:type/test - ทดสอบส่ง email
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';
import EmailService from '../services/emailService.js';

const router = express.Router();
const emailService = new EmailService();

// Apply authentication middleware
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

// Email Settings Types
const EMAIL_TYPES = {
  urgentJob: {
    name: 'urgentJob',
    label: 'งานด่วน (Urgent Job)',
    description: 'แจ้งเตือนเมื่อมีงานด่วนที่ต้องการความสนใจจากผู้บริหาร',
    priority: 'high'
  },
  urgentImpact: {
    name: 'urgentImpact',
    label: 'งานถูกเลื่อนจากงานด่วน (Urgent Impact)',
    description: 'แจ้งเตือนเมื่องานถูกเลื่อนเนื่องจากมีงานด่วน',
    priority: 'high'
  },
  jobRejection: {
    name: 'jobRejection',
    label: 'งานถูกยกเลิก/ปฏิเสธ (Job Rejection)',
    description: 'แจ้งเตือนเมื่องานถูกยกเลิกหรือปฏิเสธ',
    priority: 'medium'
  },
  jobApprovalRequest: {
    name: 'jobApprovalRequest',
    label: 'คำขออนุมัติงาน (Approval Request)',
    description: 'แจ้งเตือนเมื่อมีคำขออนุมัติงานใหม่',
    priority: 'medium'
  },
  jobApproved: {
    name: 'jobApproved',
    label: 'งานได้รับการอนุมัติ (Job Approved)',
    description: 'แจ้งเตือนเมื่องานได้รับการอนุมัติ',
    priority: 'low'
  },
  jobAssigned: {
    name: 'jobAssigned',
    label: 'งานมอบหมาย (Job Assigned)',
    description: 'แจ้งเตือนเมื่อได้รับมอบหมายงานใหม่',
    priority: 'medium'
  },
  jobDeadlineReminder: {
    name: 'jobDeadlineReminder',
    label: 'แจ้งเตือน Deadline',
    description: 'แจ้งเตือนเมื่องานใกล้ถึงกำหนดส่ง',
    priority: 'medium'
  },
  jobStatusChanged: {
    name: 'jobStatusChanged',
    label: 'เปลี่ยนสถานะงาน',
    description: 'แจ้งเตือนเมื่อสถานะงานเปลี่ยนแปลง',
    priority: 'low'
  },
  commentNotification: {
    name: 'commentNotification',
    label: 'ความคิดเห็นใหม่',
    description: 'แจ้งเตือนเมื่อมีความคิดเห็นใหม่',
    priority: 'low'
  },
  additionalInfoRequest: {
    name: 'additionalInfoRequest',
    label: 'ขอข้อมูลเพิ่มเติม',
    description: 'แจ้งเตือนเมื่อผู้รับผิดชอบขอข้อมูลเพิ่มเติม',
    priority: 'medium'
  }
};

/**
 * Helper: ตรวจสอบว่าเป็น Admin หรือไม่
 */
function isAdmin(user) {
  if (!user) return false;
  // V2: user.roleName (string)
  if (user.roleName) {
    const name = user.roleName.toLowerCase();
    return name === 'admin' || name === 'superadmin';
  }
  // V1: user.roles (array)
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some(role => {
      const name = (typeof role === 'string' ? role : role.name || '').toLowerCase();
      return name === 'admin' || name === 'superadmin';
    });
  }
  return false;
}

/**
 * Helper: Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper: ดึง tenant + emailSettings พร้อม fallback ถ้า column ยังไม่มี
 */
async function getTenantEmailSettings(tenantId) {
  const prisma = getDatabase();
  let tenant = null;
  let emailSettingsRaw = null;
  let defaultRejectionCcEmails = [];

  // Step 1: ดึงข้อมูล tenant พื้นฐานก่อน (id, name เท่านั้น - มีแน่นอน)
  try {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true }
    });
  } catch (err) {
    console.error('[Email Settings] Failed to fetch tenant:', err.message);
    return { tenant: null, emailSettings: {}, defaultRejectionCcEmails: [] };
  }

  if (!tenant) {
    return { tenant: null, emailSettings: {}, defaultRejectionCcEmails: [] };
  }

  // Step 2: ลองดึง email_settings ผ่าน raw query (ไม่ขึ้นกับ Prisma schema sync)
  try {
    const raw = await prisma.$queryRaw`SELECT email_settings FROM tenants WHERE id = ${tenantId} LIMIT 1`;
    emailSettingsRaw = raw[0]?.email_settings || {};
  } catch (_) {
    console.warn('[Email Settings] Column email_settings not found, using defaults');
    emailSettingsRaw = {};
  }

  // Step 3: ลองดึง default_rejection_cc_emails ผ่าน raw query
  try {
    const raw = await prisma.$queryRaw`SELECT default_rejection_cc_emails FROM tenants WHERE id = ${tenantId} LIMIT 1`;
    defaultRejectionCcEmails = raw[0]?.default_rejection_cc_emails || [];
  } catch (_) {
    console.warn('[Email Settings] Column default_rejection_cc_emails not found, using defaults');
    defaultRejectionCcEmails = [];
  }

  // Step 4: Parse emailSettings
  let parsed = {};
  try {
    parsed = typeof emailSettingsRaw === 'string' ? JSON.parse(emailSettingsRaw) : (emailSettingsRaw || {});
  } catch (_) {
    parsed = {};
  }

  // Attach defaultRejectionCcEmails to tenant object
  tenant.defaultRejectionCcEmails = defaultRejectionCcEmails;

  return { tenant, emailSettings: parsed };
}

/**
 * Helper: บันทึก emailSettings ลง DB พร้อม fallback ถ้า column ยังไม่มี
 */
async function saveTenantEmailSettings(tenantId, emailSettings) {
  const prisma = getDatabase();
  const jsonStr = JSON.stringify(emailSettings);

  try {
    await prisma.$executeRaw`UPDATE tenants SET email_settings = ${jsonStr}::jsonb WHERE id = ${tenantId}`;
  } catch (err) {
    if (err.meta?.code === '42703' || err.message?.includes('does not exist')) {
      // Column doesn't exist yet - create it first
      console.warn('[Email Settings] Column email_settings not found, creating it...');
      await prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_settings JSONB DEFAULT '{}'::jsonb`);
      await prisma.$executeRaw`UPDATE tenants SET email_settings = ${jsonStr}::jsonb WHERE id = ${tenantId}`;
      console.log('[Email Settings] Column email_settings created and data saved');
    } else {
      throw err;
    }
  }
}

/**
 * GET /api/email-settings
 * ดึงการตั้งค่า email ทั้งหมด
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    console.log('[Email Settings] GET / - tenantId:', tenantId, 'user:', req.user?.id);

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'TENANT_NOT_FOUND', message: 'ไม่พบข้อมูล Tenant' });
    }

    const { tenant, emailSettings } = await getTenantEmailSettings(tenantId);

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND', message: 'ไม่พบข้อมูล Tenant' });
    }

    // Return all email types with their settings
    const allSettings = {};
    Object.keys(EMAIL_TYPES).forEach(type => {
      allSettings[type] = {
        ...EMAIL_TYPES[type],
        enabled: emailSettings[type]?.enabled || false,
        ccEmails: emailSettings[type]?.ccEmails || [],
      };
    });

    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        emailSettings: allSettings,
        defaultRejectionCcEmails: tenant.defaultRejectionCcEmails || []
      }
    });
  } catch (error) {
    console.error('[Email Settings] GET error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
});

/**
 * GET /api/email-settings/:type
 * ดึงการตั้งค่าแยกตามประเภท
 */
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'TENANT_NOT_FOUND', message: 'ไม่พบข้อมูล Tenant' });
    }

    if (!EMAIL_TYPES[type]) {
      return res.status(400).json({ success: false, error: 'INVALID_TYPE', message: 'ประเภทการแจ้งเตือนไม่ถูกต้อง' });
    }

    const { tenant, emailSettings } = await getTenantEmailSettings(tenantId);

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND', message: 'ไม่พบข้อมูล Tenant' });
    }

    const typeSetting = emailSettings[type] || {};

    res.json({
      success: true,
      data: {
        type,
        ...EMAIL_TYPES[type],
        enabled: typeSetting.enabled || false,
        ccEmails: typeSetting.ccEmails || []
      }
    });
  } catch (error) {
    console.error('[Email Settings] GET type error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
});

/**
 * PUT /api/email-settings/:type
 * อัปเดตการตั้งค่าแยกตามประเภท (Admin only)
 */
router.put('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { enabled, ccEmails } = req.body;
    const tenantId = req.user?.tenantId;

    // ตรวจสอบสิทธิ์ Admin
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'ADMIN_ONLY', message: 'เฉพาะ Admin เท่านั้นที่สามารถแก้ไขการตั้งค่านี้ได้' });
    }

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'TENANT_NOT_FOUND', message: 'ไม่พบข้อมูล Tenant' });
    }

    if (!EMAIL_TYPES[type]) {
      return res.status(400).json({ success: false, error: 'INVALID_TYPE', message: 'ประเภทการแจ้งเตือนไม่ถูกต้อง' });
    }

    // Validate ccEmails
    if (!Array.isArray(ccEmails)) {
      return res.status(400).json({ success: false, error: 'INVALID_FORMAT', message: 'รูปแบบข้อมูล ccEmails ไม่ถูกต้อง (ต้องเป็น Array)' });
    }

    // Validate email format
    for (const email of ccEmails) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, error: 'INVALID_EMAIL', message: `รูปแบบอีเมลไม่ถูกต้อง: ${email}` });
      }
    }

    // Limit CC emails (max 10)
    if (ccEmails.length > 10) {
      return res.status(400).json({ success: false, error: 'TOO_MANY_EMAILS', message: 'จำนวน CC emails เกินกำหนด (สูงสุด 10 emails)' });
    }

    // Get current settings
    const { tenant, emailSettings } = await getTenantEmailSettings(tenantId);

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND', message: 'ไม่พบข้อมูล Tenant' });
    }

    // Update specific type
    emailSettings[type] = {
      enabled: enabled !== undefined ? enabled : false,
      ccEmails: ccEmails || [],
      description: EMAIL_TYPES[type].description
    };

    // Save to database
    await saveTenantEmailSettings(tenantId, emailSettings);

    res.json({
      success: true,
      message: 'อัปเดตการตั้งค่าสำเร็จ',
      data: {
        type,
        ...EMAIL_TYPES[type],
        enabled: emailSettings[type].enabled,
        ccEmails: emailSettings[type].ccEmails
      }
    });
  } catch (error) {
    console.error('[Email Settings] PUT error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
  }
});

/**
 * POST /api/email-settings/:type/test
 * ทดสอบส่ง email (Admin only)
 */
router.post('/:type/test', async (req, res) => {
  try {
    const { type } = req.params;
    const tenantId = req.user?.tenantId;

    // ตรวจสอบสิทธิ์ Admin
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'ADMIN_ONLY', message: 'เฉพาะ Admin เท่านั้นที่สามารถทดสอบส่ง email ได้' });
    }

    if (!EMAIL_TYPES[type]) {
      return res.status(400).json({ success: false, error: 'INVALID_TYPE', message: 'ประเภทการแจ้งเตือนไม่ถูกต้อง' });
    }

    // Get email settings
    const { tenant, emailSettings } = await getTenantEmailSettings(tenantId);

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND', message: 'ไม่พบข้อมูล Tenant' });
    }

    const typeSetting = emailSettings[type] || {};

    if (!typeSetting.enabled) {
      return res.status(400).json({ success: false, error: 'TYPE_DISABLED', message: 'ประเภทการแจ้งเตือนนี้ถูกปิดใช้งาน' });
    }

    if (!typeSetting.ccEmails || typeSetting.ccEmails.length === 0) {
      return res.status(400).json({ success: false, error: 'NO_CC_EMAILS', message: 'ไม่มี CC emails ที่ตั้งค่าไว้' });
    }

    // ส่ง test email ไปยัง CC emails ทั้งหมด
    console.log(`[Email Settings] Sending test email for type: ${type} to:`, typeSetting.ccEmails);
    
    const subject = `[DJ System] Test Email - ${EMAIL_TYPES[type].label}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e11d48;">🧪 Test Email - ${EMAIL_TYPES[type].label}</h2>
        <p>นี่คือ test email สำหรับการแจ้งเตือนประเภท: <strong>${EMAIL_TYPES[type].label}</strong></p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>ประเภท:</strong> ${type}</p>
          <p style="margin: 5px 0 0 0;"><strong>คำอธิบาย:</strong> ${EMAIL_TYPES[type].description}</p>
          <p style="margin: 5px 0 0 0;"><strong>ระดับความสำคัญ:</strong> ${EMAIL_TYPES[type].priority}</p>
        </div>
        <p>ถ้าคุณได้รับ email นี้ แสดงว่าการตั้งค่า Email Settings ทำงานถูกต้อง ✅</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Email นี้ถูกส่งจาก DJ System - Design Job Management<br>
          เวลาส่ง: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
        </p>
      </div>
    `;

    // ส่ง email ไปยัง CC emails ทั้งหมด
    const emailResults = await Promise.allSettled(
      typeSetting.ccEmails.map(email => 
        emailService.sendEmail(email, subject, html)
      )
    );

    // นับจำนวนที่ส่งสำเร็จ
    const successCount = emailResults.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failCount = emailResults.length - successCount;

    console.log(`[Email Settings] Test email results: ${successCount} success, ${failCount} failed`);

    if (successCount === 0) {
      return res.status(500).json({ 
        success: false, 
        error: 'EMAIL_SEND_FAILED', 
        message: 'ไม่สามารถส่ง test email ได้ กรุณาตรวจสอบการตั้งค่า SMTP' 
      });
    }

    res.json({
      success: true,
      message: `ส่ง test email สำเร็จ (${successCount}/${emailResults.length} emails)`,
      data: {
        type,
        ccEmails: typeSetting.ccEmails,
        successCount,
        failCount,
        totalSent: emailResults.length
      }
    });
  } catch (error) {
    console.error('[Email Settings] Test email error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดในการส่ง test email' });
  }
});

export default router;
