/**
 * @file magicLinkService.js
 * @description Magic Link Authentication Service
 * 
 * Features:
 * - Generate secure magic links for email notifications
 * - JWT-based tokens with expiry
 * - One-time use tokens (stored in Redis/DB)
 * - Auto-login capability
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase } from '../config/database.js';

export class MagicLinkService {
  constructor() {
    this.prisma = getDatabase();
    this.secret = process.env.MAGIC_LINK_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.expiryHours = 24; // Magic link valid for 24 hours
  }

  /**
   * สร้าง Magic Link สำหรับ user
   * 
   * @param {Object} params
   * @param {number} params.userId - ID ของ user
   * @param {string} params.targetUrl - URL ที่ต้องการ redirect ไปหลัง login
   * @param {string} params.action - Action type (approve, view, submit, etc.)
   * @param {Object} params.metadata - ข้อมูลเพิ่มเติม (jobId, etc.)
   * @returns {Promise<string>} - Magic link URL
   */
  async generateMagicLink({ userId, targetUrl, action = 'view', metadata = {} }) {
    try {
      // Generate unique token ID
      const tokenId = crypto.randomBytes(32).toString('hex');
      
      // Create JWT payload
      const payload = {
        tokenId,
        userId,
        targetUrl,
        action,
        metadata,
        type: 'magic_link',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (this.expiryHours * 60 * 60)
      };

      // Sign JWT
      const token = jwt.sign(payload, this.secret);

      // Store token in database for one-time use validation
      const expiresAt = new Date(Date.now() + (this.expiryHours * 60 * 60 * 1000));
      await this.prisma.magicLinkToken.create({
        data: {
          tokenId,
          userId,
          targetUrl,
          action,
          metadata: JSON.stringify(metadata),
          expiresAt,
          used: false
        }
      });

      // Build magic link URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const magicLink = `${frontendUrl}/auth/magic-link?token=${token}`;

      return magicLink;
    } catch (error) {
      console.error('[MagicLinkService] Generate magic link error:', error);
      throw new Error('Failed to generate magic link');
    }
  }

  /**
   * ตรวจสอบและใช้งาน Magic Link Token
   * 
   * @param {string} token - JWT token from magic link
   * @returns {Promise<Object>} - { valid, userId, targetUrl, action, metadata }
   */
  async verifyAndConsumeMagicLink(token) {
    try {
      // Verify JWT signature and expiry
      let decoded;
      try {
        decoded = jwt.verify(token, this.secret);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return { valid: false, error: 'TOKEN_EXPIRED', message: 'Magic link has expired' };
        }
        return { valid: false, error: 'INVALID_TOKEN', message: 'Invalid magic link' };
      }

      // Check token type
      if (decoded.type !== 'magic_link') {
        return { valid: false, error: 'INVALID_TOKEN_TYPE', message: 'Invalid token type' };
      }

      // Check if token exists in database and not used
      const tokenRecord = await this.prisma.magicLinkToken.findUnique({
        where: { tokenId: decoded.tokenId }
      });

      if (!tokenRecord) {
        return { valid: false, error: 'TOKEN_NOT_FOUND', message: 'Magic link not found' };
      }

      if (tokenRecord.used) {
        return { valid: false, error: 'TOKEN_ALREADY_USED', message: 'Magic link has already been used' };
      }

      if (new Date() > tokenRecord.expiresAt) {
        return { valid: false, error: 'TOKEN_EXPIRED', message: 'Magic link has expired' };
      }

      // Mark token as used (one-time use)
      await this.prisma.magicLinkToken.update({
        where: { tokenId: decoded.tokenId },
        data: {
          used: true,
          usedAt: new Date()
        }
      });

      // Get user data
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          tenantId: true,
          isActive: true,
          userRoles: {
            select: {
              roleName: true
            }
          }
        }
      });

      if (!user) {
        return { valid: false, error: 'USER_NOT_FOUND', message: 'User not found' };
      }

      if (!user.isActive) {
        return { valid: false, error: 'USER_INACTIVE', message: 'User account is inactive' };
      }

      return {
        valid: true,
        user,
        targetUrl: decoded.targetUrl,
        action: decoded.action,
        metadata: decoded.metadata
      };
    } catch (error) {
      console.error('[MagicLinkService] Verify magic link error:', error);
      return { valid: false, error: 'VERIFICATION_FAILED', message: 'Failed to verify magic link' };
    }
  }

  /**
   * ลบ magic link tokens ที่หมดอายุ (Cleanup job)
   */
  async cleanupExpiredTokens() {
    try {
      const result = await this.prisma.magicLinkToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { used: true, usedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Delete used tokens older than 7 days
          ]
        }
      });
      console.log(`[MagicLinkService] Cleaned up ${result.count} expired tokens`);
      return result.count;
    } catch (error) {
      console.error('[MagicLinkService] Cleanup error:', error);
      return 0;
    }
  }

  /**
   * สร้าง Magic Link สำหรับ Job Action
   * Helper function สำหรับสร้าง magic link สำหรับงานต่างๆ
   */
  async createJobActionLink({ userId, jobId, action, djId }) {
    const actionMap = {
      'approve': `/jobs/${jobId}?action=approve`,
      'reject': `/jobs/${jobId}?action=reject`,
      'view': `/jobs/${jobId}`,
      'submit': `/jobs/${jobId}?action=submit`,
      'draft': `/jobs/${jobId}?tab=drafts`,
      'rebrief': `/jobs/${jobId}?tab=rebrief`
    };

    const targetUrl = actionMap[action] || `/jobs/${jobId}`;

    return this.generateMagicLink({
      userId,
      targetUrl,
      action,
      metadata: { jobId, djId }
    });
  }
}

export default MagicLinkService;
