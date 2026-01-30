/**
 * @file PrismaV1Adapter.js
 * @description Adapter layer that bridges V2 auth system to use existing V1 tables
 *
 * This adapter translates between:
 * - V2 schema expectations (v2_users, v2_organizations, v2_roles)
 * - V1 actual tables (users, departments, user_roles, roles)
 *
 * Key Mappings:
 * - v2_users.id → users.id
 * - v2_users.organizationId → users.departmentId
 * - v2_users.roleId → user_roles.roleName (string-based in V1)
 * - v2_organizations → departments (V1 has no separate org table)
 */

import { getDatabase } from '../../config/database.js';
import bcrypt from 'bcrypt';

class PrismaV1Adapter {
  /**
   * Convert V1 Prisma User to V2 format
   * @param {Object} prismaUser - User object from Prisma (users table)
   * @returns {Object} User in V2 format
   */
  static tov2User(prismaUser) {
    if (!prismaUser) return null;

    const primaryRole = prismaUser.userRoles?.[0];

    return {
      id: prismaUser.id,
      tenantId: prismaUser.tenantId,
      organizationId: prismaUser.departmentId || 0, // Map department to organization
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      displayName: prismaUser.displayName,
      avatarUrl: prismaUser.avatarUrl,
      roleName: primaryRole?.roleName || 'Member',
      roleId: primaryRole?.id || 0, // For V2 compatibility
      isActive: prismaUser.isActive,
      lastLoginAt: prismaUser.lastLoginAt,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt
    };
  }

  /**
   * Find user by email and tenant ID using V1 tables
   * @param {string} email - User email
   * @param {number} tenantId - Tenant ID
   * @returns {Object|null} User object or null if not found
   */
  static async findUserByEmail(email, tenantId) {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: {
        email_tenantId: {
          email: email.toLowerCase(),
          tenantId
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        department: true
      }
    });

    return user ? this.tov2User(user) : null;
  }

  /**
   * Find user by ID with password hash (for authentication)
   * @param {number} userId - User ID
   * @param {number} tenantId - Tenant ID
   * @returns {Object|null} User object with password hash or null
   */
  static async findUserByIdWithPassword(userId, tenantId) {
    const prisma = getDatabase();

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        department: true
      }
    });

    if (!user) return null;

    // Return with password hash included for auth verification
    return {
      ...this.tov2User(user),
      passwordHash: user.passwordHash
    };
  }

  /**
   * Find user by ID (without password)
   * @param {number} userId - User ID
   * @returns {Object|null} User object or null
   */
  static async findUserById(userId) {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        department: true
      }
    });

    return user ? this.tov2User(user) : null;
  }

  /**
   * Create new user in V1 tables (for registration)
   * @param {Object} userData - User data to create
   * @returns {Object} Created user in V2 format
   */
  static async createUser(userData) {
    const prisma = getDatabase();
    const {
      tenantId,
      organizationId, // Maps to departmentId in V1
      email,
      passwordHash,
      firstName,
      lastName,
      displayName,
      avatarUrl,
      roleId, // This will be used to set the role name
      isActive = true
    } = userData;

    if (!tenantId || !email || !passwordHash) {
      throw new Error('Missing required fields: tenantId, email, passwordHash');
    }

    // Get role name from roleId if provided
    let roleName = 'Member'; // Default role
    if (roleId) {
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      });
      if (role) {
        roleName = role.name;
      }
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        tenantId,
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        displayName: displayName || `${firstName} ${lastName}`.trim(),
        avatarUrl: avatarUrl || null,
        departmentId: organizationId || null,
        isActive
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        department: true
      }
    });

    // Create user role
    await prisma.userRole.create({
      data: {
        tenantId,
        userId: newUser.id,
        roleName,
        isActive: true
      }
    });

    // Reload to include the new role
    const user = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        department: true
      }
    });

    return this.tov2User(user);
  }

  /**
   * Update last login time
   * @param {number} userId - User ID
   * @returns {void}
   */
  static async updateLastLogin(userId) {
    const prisma = getDatabase();

    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  /**
   * Check if email already exists in V1 tables
   * @param {string} email - Email to check
   * @param {number} tenantId - Tenant ID
   * @returns {boolean} True if email exists
   */
  static async emailExists(email, tenantId) {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: {
        email_tenantId: {
          email: email.toLowerCase(),
          tenantId
        }
      }
    });

    return !!user;
  }

  /**
   * Get all roles for V2 compatibility
   * @returns {Array} Array of role objects
   */
  static async getAllRoles() {
    const prisma = getDatabase();

    const roles = await prisma.role.findMany({
      where: {
        tenantId: null // System roles that are shared across tenants
      }
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions || { read: true, create: false, update: false, delete: false }
    }));
  }

  /**
   * Get role by name
   * @param {string} roleName - Role name
   * @returns {Object|null} Role object or null
   */
  static async getRoleByName(roleName) {
    const prisma = getDatabase();

    const role = await prisma.role.findFirst({
      where: { name: roleName }
    });

    return role ? {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions || { read: true, create: false, update: false, delete: false }
    } : null;
  }

  /**
   * Get default role (Member)
   * @returns {Object|null} Member role or null
   */
  static async getDefaultRole() {
    return this.getRoleByName('Member');
  }

  /**
   * Check if user is active
   * @param {number} userId - User ID
   * @returns {boolean} True if user is active
   */
  static async isUserActive(userId) {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true }
    });

    return user?.isActive || false;
  }

  /**
   * Get user's primary role name
   * @param {number} userId - User ID
   * @returns {string|null} Role name or null
   */
  static async getUserRoleName(userId) {
    const prisma = getDatabase();

    const userRole = await prisma.userRole.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    return userRole?.roleName || null;
  }

  /**
   * Format user response for API (removes sensitive data)
   * @param {Object} user - User object in V2 format
   * @returns {Object} Formatted user object
   */
  static formatUserResponse(user) {
    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // =========================================================================
  // REGISTRATION APPROVAL WORKFLOW METHODS
  // =========================================================================

  /**
   * Generate a random password
   * @param {number} length - Password length (default: 12)
   * @returns {string} Generated password
   */
  static generateRandomPassword(length = 12) {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '@#$%&*';
    const allChars = uppercase + lowercase + numbers + special;

    // Ensure at least one of each type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Register a new user with PENDING status (for approval workflow)
   * NO PASSWORD REQUIRED - Admin will generate password on approval
   * @param {Object} userData - User registration data
   * @returns {Object} Created user (pending approval)
   */
  static async registerPendingUser(userData) {
    const prisma = getDatabase();
    const {
      tenantId,
      departmentId,
      email,
      firstName,
      lastName,
      displayName,
      phone,
      position,
      title
    } = userData;

    if (!tenantId || !email || !firstName || !lastName) {
      throw new Error('Missing required fields: tenantId, email, firstName, lastName');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email_tenantId: {
          email: email.toLowerCase(),
          tenantId
        }
      }
    });

    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    // Create user with PENDING status, isActive = false, and NO password
    // Password will be generated when admin approves
    const newUser = await prisma.user.create({
      data: {
        tenantId,
        email: email.toLowerCase(),
        passwordHash: '', // Empty - will be set on approval
        firstName,
        lastName,
        displayName: displayName || (title ? `${title}${firstName} ${lastName}` : `${firstName} ${lastName}`).trim(),
        departmentId: departmentId || null,
        isActive: false,
        status: 'PENDING',
        registeredAt: new Date(),
        mustChangePassword: false // Will be set TRUE when admin generates password
      },
      include: {
        department: true,
        tenant: true
      }
    });

    return {
      id: newUser.id,
      tenantId: newUser.tenantId,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      displayName: newUser.displayName,
      departmentId: newUser.departmentId,
      departmentName: newUser.department?.name || null,
      status: newUser.status,
      isActive: newUser.isActive,
      registeredAt: newUser.registeredAt,
      createdAt: newUser.createdAt
    };
  }

  /**
   * Get all pending registration requests for a tenant
   * @param {number} tenantId - Tenant ID
   * @returns {Array} List of pending users
   */
  static async getPendingRegistrations(tenantId) {
    const prisma = getDatabase();

    const pendingUsers = await prisma.user.findMany({
      where: {
        tenantId,
        status: 'PENDING'
      },
      include: {
        department: true
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    return pendingUsers.map(user => ({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      departmentId: user.departmentId,
      departmentName: user.department?.name || null,
      status: user.status,
      registeredAt: user.registeredAt,
      createdAt: user.createdAt
    }));
  }

  /**
   * Approve a pending user registration
   * Generates a temporary password and sets mustChangePassword = true
   * @param {number} userId - User ID to approve
   * @param {number} approvedById - Admin user ID who approves
   * @param {string} roleName - Role to assign (default: 'Member')
   * @returns {Object} Approved user with temporary password
   */
  static async approveRegistration(userId, approvedById, roleName = 'Member') {
    const prisma = getDatabase();

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user.status !== 'PENDING') {
      throw new Error('USER_NOT_PENDING');
    }

    // Generate temporary password
    const temporaryPassword = this.generateRandomPassword(12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Update user to APPROVED with generated password
    const approvedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'APPROVED',
        isActive: true,
        approvedAt: new Date(),
        approvedById,
        passwordHash,
        mustChangePassword: true // Force password change on first login
      },
      include: {
        department: true,
        userRoles: true
      }
    });

    // Create user role if not exists
    const existingRole = await prisma.userRole.findFirst({
      where: { userId }
    });

    if (!existingRole) {
      await prisma.userRole.create({
        data: {
          tenantId: user.tenantId,
          userId,
          roleName,
          isActive: true
        }
      });
    }

    return {
      id: approvedUser.id,
      email: approvedUser.email,
      firstName: approvedUser.firstName,
      lastName: approvedUser.lastName,
      displayName: approvedUser.displayName,
      departmentId: approvedUser.departmentId,
      departmentName: approvedUser.department?.name || null,
      status: approvedUser.status,
      isActive: approvedUser.isActive,
      roleName,
      approvedAt: approvedUser.approvedAt,
      approvedById,
      temporaryPassword // Return the generated password (for admin to share with user)
    };
  }

  /**
   * Reject a pending user registration
   * @param {number} userId - User ID to reject
   * @param {number} rejectedById - Admin user ID who rejects
   * @param {string} reason - Rejection reason
   * @returns {Object} Rejected user
   */
  static async rejectRegistration(userId, rejectedById, reason) {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user.status !== 'PENDING') {
      throw new Error('USER_NOT_PENDING');
    }

    const rejectedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'REJECTED',
        isActive: false,
        approvedAt: new Date(), // Use approvedAt as the decision timestamp
        approvedById: rejectedById,
        rejectionReason: reason
      }
    });

    return {
      id: rejectedUser.id,
      email: rejectedUser.email,
      firstName: rejectedUser.firstName,
      lastName: rejectedUser.lastName,
      status: rejectedUser.status,
      rejectionReason: rejectedUser.rejectionReason
    };
  }

  /**
   * Check if user can authenticate (status and isActive check)
   * @param {number} userId - User ID
   * @returns {Object} Auth status check result
   */
  static async checkUserAuthStatus(userId) {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        isActive: true,
        mustChangePassword: true
      }
    });

    if (!user) {
      return { canAuth: false, reason: 'USER_NOT_FOUND' };
    }

    if (user.status === 'PENDING') {
      return { canAuth: false, reason: 'PENDING_APPROVAL', status: user.status };
    }

    if (user.status === 'REJECTED') {
      return { canAuth: false, reason: 'REGISTRATION_REJECTED', status: user.status };
    }

    if (!user.isActive) {
      return { canAuth: false, reason: 'USER_INACTIVE', status: user.status };
    }

    if (user.status !== 'APPROVED') {
      return { canAuth: false, reason: 'NOT_APPROVED', status: user.status };
    }

    return {
      canAuth: true,
      status: user.status,
      mustChangePassword: user.mustChangePassword || false
    };
  }

  /**
   * Change user password (for first login or password reset)
   * @param {number} userId - User ID
   * @param {string} newPassword - New password (plain text)
   * @param {boolean} clearMustChange - Clear mustChangePassword flag (default: true)
   * @returns {Object} Result
   */
  static async changePassword(userId, newPassword, clearMustChange = true) {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: clearMustChange ? false : user.mustChangePassword
      }
    });

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Get registration counts by status for admin dashboard
   * @param {number} tenantId - Tenant ID
   * @returns {Object} Counts by status
   */
  static async getRegistrationCounts(tenantId) {
    const prisma = getDatabase();

    const counts = await prisma.user.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true }
    });

    const result = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      INACTIVE: 0,
      total: 0
    };

    counts.forEach(item => {
      const status = item.status || 'APPROVED'; // Legacy users without status
      result[status] = item._count.id;
      result.total += item._count.id;
    });

    return result;
  }
}

export default PrismaV1Adapter;
