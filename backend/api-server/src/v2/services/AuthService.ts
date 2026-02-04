/**
 * Authentication Service for V2 Auth System
 *
 * Handles user authentication, registration, and password management.
 */

import { Op } from 'sequelize';
import { User, Organization, Role, PasswordResetToken } from '../models';
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

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: IRegisterRequest): Promise<IRegisterResponse> {
    const { email, password, firstName, lastName, organizationId, tenantId, roleId } = data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(`WEAK_PASSWORD:${passwordValidation.errors.join(', ')}`);
    }

    // Verify organization exists
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }

    const effectiveTenantId = tenantId || 1; // Default to SENA Group (1)

    // Check if email already exists for this tenant
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase(),
        tenantId: effectiveTenantId,
      },
    });

    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    // Get default role (Member) if not specified
    let effectiveRoleId = roleId;
    if (!effectiveRoleId) {
      const defaultRole = await Role.findOne({
        where: { name: RoleName.MEMBER },
      });
      if (!defaultRole) {
        throw new Error('DEFAULT_ROLE_NOT_FOUND');
      }
      effectiveRoleId = defaultRole.id;
    }

    // Get role for token generation
    const role = await Role.findByPk(effectiveRoleId);
    if (!role) {
      throw new Error('ROLE_NOT_FOUND');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      tenantId: effectiveTenantId,
      organizationId,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      roleId: effectiveRoleId,
      isActive: true,
    });

    // Reload user with associations
    await user.reload({
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' },
      ],
    });

    // Generate JWT token
    const token = generateToken(
      user.id,
      user.tenantId,
      user.organizationId,
      user.email,
      user.roleId,
      role.name
    );

    // Format user response
    const userResponse = this.formatUserResponse(user);

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Authenticate user and return token
   */
  async login(data: ILoginRequest): Promise<ILoginResponse> {
    const { email, password, tenantId } = data;

    // Default to Tenant 1 (SENA Group) if not provided
    const targetTenantId = tenantId || 1;

    // Find user with password (using scope)
    const user = await User.scope('withPassword').findOne({
      where: {
        email: email.toLowerCase(),
        tenantId: targetTenantId,
      },
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' },
      ],
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new Error('USER_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Generate JWT token
    const token = generateToken(
      user.id,
      user.tenantId,
      user.organizationId,
      user.email,
      user.roleId,
      user.role!.name
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
   * Initiate password reset flow
   */
  async forgotPassword(email: string): Promise<void> {
    // Find user by email (don't reveal if not found)
    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    });

    if (!user) {
      // Don't reveal that email doesn't exist
      console.log(`[AuthService] Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Invalidate existing tokens for this user
    await PasswordResetToken.update(
      { usedAt: new Date() },
      {
        where: {
          userId: user.id,
          usedAt: null,
        },
      }
    );

    // Create new reset token (expires in 1 hour)
    const resetToken = await PasswordResetToken.create({
      userId: user.id,
      token: PasswordResetToken.generateToken(),
      expiresAt: PasswordResetToken.getExpiryTime(1),
    });

    // TODO: Send email with reset link
    // For now, log the token (remove in production)
    console.log(`[AuthService] Password reset token for ${email}: ${resetToken.token}`);
    console.log(`[AuthService] Reset URL: /reset-password?token=${resetToken.token}`);
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`WEAK_PASSWORD:${passwordValidation.errors.join(', ')}`);
    }

    // Find valid reset token
    const resetToken = await PasswordResetToken.findOne({
      where: {
        token,
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [{ model: User, as: 'user' }],
    });

    if (!resetToken) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password
    await User.update(
      { passwordHash },
      { where: { id: resetToken.userId } }
    );

    // Mark token as used
    await resetToken.markAsUsed();

    console.log(`[AuthService] Password reset successful for user ID: ${resetToken.userId}`);
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

    // Get fresh user data
    const user = await User.findByPk(decoded.userId, {
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' },
      ],
    });

    if (!user || !user.isActive) {
      throw new Error('USER_NOT_FOUND_OR_INACTIVE');
    }

    // Generate new token
    const token = generateToken(
      user.id,
      user.tenantId,
      user.organizationId,
      user.email,
      user.roleId,
      user.role!.name
    );

    return {
      token,
      expiresIn: getTokenExpiration(),
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<IUserResponse | null> {
    const user = await User.findByPk(userId, {
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' },
      ],
    });

    if (!user) return null;

    return this.formatUserResponse(user);
  }

  /**
   * Format user model to response object
   */
  private formatUserResponse(user: User): IUserResponse {
    return {
      id: user.id,
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      roleId: user.roleId,
      roleName: user.role?.name || RoleName.MEMBER,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        permissions: user.role.permissions,
        description: user.role.description,
      } : undefined,
      organization: user.organization ? {
        id: user.organization.id,
        tenantId: user.organization.tenantId,
        name: user.organization.name,
        slug: user.organization.slug,
        isActive: user.organization.isActive,
        createdAt: user.organization.createdAt,
        updatedAt: user.organization.updatedAt,
      } : undefined,
    };
  }
}

export default new AuthService();
