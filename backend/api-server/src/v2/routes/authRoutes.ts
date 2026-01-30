/**
 * Authentication Routes for V2 Auth System
 *
 * Endpoints: /api/v2/auth/*
 */

import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// POST /api/v2/auth/register - Register new user
router.post('/register', AuthController.register);

// POST /api/v2/auth/login - Authenticate user
router.post('/login', AuthController.login);

// POST /api/v2/auth/forgot-password - Initiate password reset
router.post('/forgot-password', AuthController.forgotPassword);

// POST /api/v2/auth/reset-password - Reset password with token
router.post('/reset-password', AuthController.resetPassword);

/**
 * Protected routes (authentication required)
 */

// GET /api/v2/auth/verify - Verify token and get user info
router.get('/verify', authenticateToken, AuthController.verifyToken);

// POST /api/v2/auth/refresh - Refresh access token
router.post('/refresh', AuthController.refreshToken);

// POST /api/v2/auth/logout - Logout (for logging purposes)
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
