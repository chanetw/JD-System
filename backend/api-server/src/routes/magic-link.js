/**
 * @file magic-link.js
 * @description Magic Link Authentication Routes
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import MagicLinkService from '../services/magicLinkService.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();
const magicLinkService = new MagicLinkService();
const MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN = process.env.MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN || '7d';

/**
 * POST /api/magic-link/verify
 * Verify magic link token and auto-login user
 * 
 * Body: { token: string }
 * Returns: { success, user, accessToken, targetUrl, action }
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'TOKEN_REQUIRED',
        message: 'Token is required'
      });
    }

    // Verify and consume magic link
    const result = await magicLinkService.verifyAndConsumeMagicLink(token);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }

    // Generate JWT access token for auto-login
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const accessToken = jwt.sign(
      {
        userId: result.user.id,
        email: result.user.email,
        tenantId: result.user.tenantId,
        roles: result.user.userRoles.map(r => r.roleName)
      },
      jwtSecret,
      { expiresIn: MAGIC_LINK_ACCESS_TOKEN_EXPIRES_IN }
    );

    // Log successful magic link login
    const prisma = getDatabase();
    await prisma.user.update({
      where: { id: result.user.id },
      data: { lastLoginAt: new Date() }
    }).catch(err => console.warn('[MagicLink] Failed to update lastLoginAt:', err));

    // Return user data and access token
    res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        tenantId: result.user.tenantId,
        roles: result.user.userRoles.map(r => r.roleName)
      },
      accessToken,
      targetUrl: result.targetUrl,
      action: result.action,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[MagicLink] Verify error:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_FAILED',
      message: 'Failed to verify magic link'
    });
  }
});

/**
 * POST /api/magic-link/cleanup
 * Cleanup expired tokens (Admin only - can be called by cron job)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const count = await magicLinkService.cleanupExpiredTokens();
    res.json({
      success: true,
      message: `Cleaned up ${count} expired tokens`
    });
  } catch (error) {
    console.error('[MagicLink] Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'CLEANUP_FAILED',
      message: 'Failed to cleanup tokens'
    });
  }
});

export default router;
