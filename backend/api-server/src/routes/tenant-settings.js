/**
 * Tenant Settings Routes
 *
 * Admin-only routes for managing tenant-level settings:
 * - Default CC emails for rejection notifications
 * - Other tenant configurations
 *
 * Author: Claude Code
 * Date: 2026-02-18
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * Helper: Check if user is Admin
 */
function isAdmin(user) {
  const rawRoles = user?.roles;
  if (!rawRoles || !Array.isArray(rawRoles)) return false;

  const normalizedRoles = rawRoles.map(r => {
    if (typeof r === 'string') return r.toLowerCase();
    if (typeof r === 'object' && r !== null) {
      return (r?.roleName || r?.name || '').toLowerCase();
    }
    return '';
  }).filter(Boolean);

  return normalizedRoles.includes('admin');
}

/**
 * GET /api/tenant-settings
 * Get current tenant settings (all users can view)
 */
router.get('/', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        defaultRejectionCcEmails: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantCode: tenant.code,
        defaultRejectionCcEmails: tenant.defaultRejectionCcEmails || []
      }
    });
  } catch (error) {
    console.error('[TenantSettings] GET error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant settings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/tenant-settings/rejection-cc-emails
 * Update default CC emails for rejection notifications (Admin only)
 *
 * Body: {
 *   emails: string[] // Array of email addresses
 * }
 */
router.put('/rejection-cc-emails', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;
    const { emails } = req.body;

    // Validate: Admin only
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'ADMIN_ONLY',
        message: 'เฉพาะ Admin เท่านั้นที่สามารถแก้ไขการตั้งค่านี้ได้'
      });
    }

    // Validate emails format
    if (!Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FORMAT',
        message: 'รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็น Array)'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: `รูปแบบอีเมลไม่ถูกต้อง: ${invalidEmails.join(', ')}`
      });
    }

    // Update tenant settings
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        defaultRejectionCcEmails: emails
      },
      select: {
        id: true,
        name: true,
        defaultRejectionCcEmails: true
      }
    });

    console.log(`[TenantSettings] Updated default CC emails for tenant ${tenantId}:`, emails);

    res.json({
      success: true,
      message: 'อัปเดตรายชื่ออีเมล CC เรียบร้อยแล้ว',
      data: {
        tenantId: updatedTenant.id,
        tenantName: updatedTenant.name,
        defaultRejectionCcEmails: updatedTenant.defaultRejectionCcEmails
      }
    });
  } catch (error) {
    console.error('[TenantSettings] UPDATE error:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปเดตการตั้งค่าได้',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
