/**
 * Authentication Service for V2 Auth System
 *
 * Handles user authentication, registration, and password management.
 * Uses PrismaV1Adapter to work with V1 database tables (users, user_roles, password_reset_requests)
 * instead of V2 models (v2_users, v2_roles, v2_password_reset_tokens).
 */

import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/passwordUtils';
import { generateToken, getTokenExpiration, decodeToken } from '../utils/tokenUtils';
import {
  ILoginRequest,
  ILoginResponse,
  IRegisterRequest,
  IRegisterResponse,
} from '../interfaces/IAuth';
import { IUserResponse } from '../interfaces/IUser';
import { RoleName } from '../interfaces/IRole';
import PrismaV1Adapter, { IV1User, IV1UserWithPassword } from '../adapters/PrismaV1Adapter';

export class AuthService {
  /**
   * Register a new user using V1 tables
   */
  async register(data: IRegisterRequest): Promise<IRegisterResponse> {
    const { email, password, firstName, lastName, organizationId, tenantId, roleId } = data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(`WEAK_PASSWORD:${passwordValidation.errors.join(', ')}`);
    }

    const effectiveTenantId = tenantId || 1; // Default to SENA Group (1)

    // Check if email already exists for this tenant
    const existingUser = await PrismaV1Adapter.findUserByEmail(email, effectiveTenantId);
    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with V1 adapter
    const user = await PrismaV1Adapter.createUser({
      tenantId: effectiveTenantId,
      organizationId,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      roleId: roleId || undefined,
      isActive: true,
    });

    // Generate JWT token
    const token = generateToken(
      user.id,
      user.tenantId,
      user.organizationId || 0, // Fallback for token payload
      user.email,
      user.roleId || 0,
      (user.roleName as RoleName) || RoleName.ASSIGNEE
    );

    // Format user response
    const userResponse = this.formatUserResponse(user);

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Authenticate user and return token using V1 tables
   */
  async login(data: ILoginRequest): Promise<ILoginResponse> {
    const { email, password, tenantId } = data;

    // Default to Tenant 1 (SENA Group) if not provided
    const targetTenantId = tenantId || 1;

    // Find user with password using V1 adapter
    const user = await PrismaV1Adapter.findUserByEmail(email, targetTenantId);

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new Error('USER_INACTIVE');
    }

    // Get user with password hash for verification
    const userWithPassword = await PrismaV1Adapter.findUserByIdWithPassword(user.id, targetTenantId);
    if (!userWithPassword) {
      throw new Error('USER_NOT_FOUND');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, userWithPassword.passwordHash);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update last login
    await PrismaV1Adapter.updateLastLogin(user.id);

    // Generate JWT token
    const token = generateToken(
      user.id,
      user.tenantId,
      user.organizationId || 0,
      user.email,
      user.roleId || 0,
      (user.roleName as RoleName) || RoleName.ASSIGNEE
    );

    // Format user response
    const userResponse = this.formatUserResponse(user);

    return {
      user: userResponse,
      token,
      expiresIn: getTokenExpiration(),
    };
  }

  /**
   * Initiate password reset flow using V1 tables
   */
  async forgotPassword(email: string): Promise<void> {
    // Find user by email (don't reveal if not found)
    const user = await PrismaV1Adapter.findUserByEmail(email, 1); // Default to tenant 1

    if (!user || !user.isActive) {
      // Don't reveal that email doesn't exist (security best practice)
      console.log(`[AuthService] Password reset requested for non-existent or inactive email: ${email}`);
      return;
    }

    // Invalidate existing tokens for this user
    await PrismaV1Adapter.invalidatePasswordResetTokens(user.id);

    // Create new reset token (expires in 1 hour)
    const resetToken = await PrismaV1Adapter.createPasswordResetToken(user.id, 1);

    // TODO: Send email with reset link
    // For now, log the token (remove in production)
    console.log(`[AuthService] Password reset token for ${email}: ${resetToken.token}`);
    console.log(`[AuthService] Reset URL: /reset-password?token=${resetToken.token}`);
  }

  /**
   * Reset password using token and V1 tables
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`WEAK_PASSWORD:${passwordValidation.errors.join(', ')}`);
    }

    // Use password reset token with V1 adapter
    const result = await PrismaV1Adapter.usePasswordResetToken(token, newPassword);

    if (!result.success) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN');
    }

    console.log(`[AuthService] Password reset successful for user ID: ${result.user.id}`);
  }

  /**
   * Refresh access token
   */
  async refreshToken(oldToken: string): Promise<{ token: string; expiresIn: string }> {
    // Decode old token (even if expired)
    const decoded = decodeToken(oldToken);
    if (!decoded) {
      throw new Error('INVALID_TOKEN');
    }

    // Get fresh user data using V1 adapter
    const user = await PrismaV1Adapter.findUserById(decoded.userId);

    if (!user || !user.isActive) {
      throw new Error('USER_NOT_FOUND_OR_INACTIVE');
    }

    // Generate new token
    const token = generateToken(
      user.id,
      user.tenantId,
      user.organizationId || 0,
      user.email,
      user.roleId || 0,
      (user.roleName as RoleName) || RoleName.ASSIGNEE
    );

    return {
      token,
      expiresIn: getTokenExpiration(),
    };
  }

  /**
   * Get user by ID using V1 adapter
   */
  async getUserById(userId: number): Promise<IUserResponse | null> {
    const user = await PrismaV1Adapter.findUserById(userId);

    if (!user) return null;

    return this.formatUserResponse(user);
  }

  /**
   * Format user to response object
   */
  private formatUserResponse(user: IV1User): IUserResponse {
    return {
      id: user.id,
      tenantId: user.tenantId,
      organizationId: user.organizationId || 0,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      roleId: user.roleId || 0,
      roleName: (user.roleName as RoleName) || RoleName.ASSIGNEE,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export default new AuthService();
