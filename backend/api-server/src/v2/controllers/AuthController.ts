/**
 * Authentication Controller for V2 Auth System
 *
 * Handles HTTP requests for authentication operations.
 */

import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService';
import { successResponse, errorResponse, ErrorCodes } from '../utils/responseUtils';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  ILoginRequest,
  IRegisterRequest,
  IForgotPasswordRequest,
  IResetPasswordRequest,
} from '../interfaces/IAuth';

class AuthController {
  /**
   * POST /api/v2/auth/register
   * Register a new user with organization link
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload: IRegisterRequest = req.body;

      // Validate required fields
      const { email, password, firstName, lastName, organizationId } = payload;
      if (!email || !password || !firstName || !lastName || !organizationId) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'All fields are required: email, password, firstName, lastName, organizationId')
        );
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json(
          errorResponse(ErrorCodes.INVALID_EMAIL, 'Invalid email format')
        );
        return;
      }

      const result = await AuthService.register(payload);

      res.status(201).json(
        successResponse(result, 'Registration successful')
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'EMAIL_EXISTS') {
        res.status(409).json(
          errorResponse(ErrorCodes.EMAIL_EXISTS, 'Email already exists')
        );
        return;
      }

      if (errorMessage === 'ORGANIZATION_NOT_FOUND') {
        res.status(404).json(
          errorResponse(ErrorCodes.ORGANIZATION_NOT_FOUND, 'Organization not found')
        );
        return;
      }

      if (errorMessage.startsWith('WEAK_PASSWORD:')) {
        res.status(400).json(
          errorResponse(ErrorCodes.WEAK_PASSWORD, errorMessage.replace('WEAK_PASSWORD:', ''))
        );
        return;
      }

      next(error);
    }
  }

  /**
   * POST /api/v2/auth/login
   * Authenticate user and return JWT token
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, tenantId }: ILoginRequest = req.body;

      // Validate required fields
      if (!email || !password || !tenantId) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'Email, password, and tenantId are required')
        );
        return;
      }

      const result = await AuthService.login({ email, password, tenantId });

      res.json(
        successResponse(result, 'Login successful')
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'INVALID_CREDENTIALS') {
        res.status(401).json(
          errorResponse(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password')
        );
        return;
      }

      if (errorMessage === 'USER_INACTIVE') {
        res.status(403).json(
          errorResponse(ErrorCodes.USER_INACTIVE, 'User account is inactive')
        );
        return;
      }

      next(error);
    }
  }

  /**
   * POST /api/v2/auth/forgot-password
   * Initiate password reset flow
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email }: IForgotPasswordRequest = req.body;

      if (!email) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'Email is required')
        );
        return;
      }

      await AuthService.forgotPassword(email);

      // Always return success to prevent email enumeration
      res.json(
        successResponse(null, 'If the email exists, a password reset link will be sent')
      );
    } catch (error) {
      // Log error but don't expose to client
      console.error('[AuthController] forgotPassword error:', error);
      res.json(
        successResponse(null, 'If the email exists, a password reset link will be sent')
      );
    }
  }

  /**
   * POST /api/v2/auth/reset-password
   * Reset password using token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword }: IResetPasswordRequest = req.body;

      if (!token || !newPassword) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'Token and new password are required')
        );
        return;
      }

      await AuthService.resetPassword(token, newPassword);

      res.json(
        successResponse(null, 'Password reset successful')
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'INVALID_OR_EXPIRED_TOKEN') {
        res.status(400).json(
          errorResponse(ErrorCodes.INVALID_RESET_TOKEN, 'Invalid or expired reset token')
        );
        return;
      }

      if (errorMessage.startsWith('WEAK_PASSWORD:')) {
        res.status(400).json(
          errorResponse(ErrorCodes.WEAK_PASSWORD, errorMessage.replace('WEAK_PASSWORD:', ''))
        );
        return;
      }

      next(error);
    }
  }

  /**
   * GET /api/v2/auth/verify
   * Verify JWT token and return user info
   */
  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // User is attached by authenticateToken middleware
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        res.status(401).json(
          errorResponse(ErrorCodes.UNAUTHORIZED, 'Invalid token')
        );
        return;
      }

      // Get full user data
      const userData = await AuthService.getUserById(user.userId);

      if (!userData) {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        );
        return;
      }

      res.json(
        successResponse(userData, 'Token is valid')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v2/auth/refresh
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'Refresh token is required')
        );
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);

      res.json(
        successResponse(result, 'Token refreshed successfully')
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'INVALID_TOKEN' || errorMessage === 'USER_NOT_FOUND_OR_INACTIVE') {
        res.status(401).json(
          errorResponse(ErrorCodes.TOKEN_INVALID, 'Invalid refresh token')
        );
        return;
      }

      next(error);
    }
  }

  /**
   * POST /api/v2/auth/logout
   * Logout user (client should remove token)
   */
  async logout(req: Request, res: Response): Promise<void> {
    // JWT is stateless, so logout is handled client-side
    // This endpoint exists for logging/analytics purposes
    const user = (req as AuthenticatedRequest).user;

    if (user) {
      console.log(`[AuthController] User ${user.userId} logged out`);
    }

    res.json(
      successResponse(null, 'Logout successful')
    );
  }
}

export default new AuthController();
