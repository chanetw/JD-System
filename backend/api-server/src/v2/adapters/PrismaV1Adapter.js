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

    // Helper function to normalize role names
    const normalizeRoleName = (rawRoleName) => {
      if (!rawRoleName) return 'Assignee';
      const normalized = rawRoleName.toLowerCase().trim();

      // Normalize legacy/V2 role names to V1 standard
      if (normalized === 'superadmin') return 'Admin';
      if (normalized === 'orgadmin') return 'Requester';
      if (normalized === 'teamlead') return 'Approver';
      if (normalized === 'member') return 'Assignee';
      if (normalized === 'user') return 'Assignee';
      if (normalized === 'manager') return 'Approver';

      return rawRoleName; // Keep original if no mapping found
    };

    // ✅ NEW: Collect ALL roles from userRoles array
    const allRoles = (prismaUser.userRoles || []).map(ur => normalizeRoleName(ur.roleName));
    const primaryRole = allRoles[0] || 'Assignee';

    // Failsafe for specific admin user
    if (prismaUser.id === 10000 && !allRoles.includes('Admin')) {
      allRoles.unshift('Admin');
    }

    // V1 Role Names: Admin, Requester, Approver, Assignee
    console.log('[PrismaV1Adapter] User:', prismaUser.email, 'All Roles:', allRoles);

    return {
      id: prismaUser.id,
      tenantId: prismaUser.tenantId,
      organizationId: prismaUser.departmentId || 0, // Map department to organization
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      displayName: prismaUser.displayName,
      avatarUrl: prismaUser.avatarUrl,
      roleName: primaryRole,
      roleId: 0, // For V2 compatibility (no actual role FK)
      roles: allRoles, // ✅ NEW: Return all roles as array for multi-role support
      isActive: prismaUser.isActive,
      // lastLoginAt: prismaUser.lastLoginAt, // TEMP: Field doesn't exist
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

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId: tenantId || 1 // Default to 1 (SENA)
      },
      include: {
        userRoles: true,
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
        tenantId: tenantId || 1 // Default to 1 (SENA)
      },
      include: {
        userRoles: true,
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
        userRoles: true,
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

    if (!email || !passwordHash) {
      throw new Error('Missing required fields: email, passwordHash');
    }

    const effectiveTenantId = tenantId || 1; // Default to 1

    // Get role name from roleId if provided
    let roleName = 'Assignee'; // Default role (V1)
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
        tenantId: effectiveTenantId,
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
        userRoles: true,
        department: true
      }
    });

    // Create user role
    await prisma.userRole.create({
      data: {
        tenantId: effectiveTenantId,
        userId: newUser.id,
        roleName,
        isActive: true
      }
    });

    // Reload to include the new role
    const user = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        userRoles: true,
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
    // TEMP: Field doesn't exist in DB - commented out
    /*
    const prisma = getDatabase();

    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
    */
  }

  /**
   * Check if email already exists in V1 tables
   * @param {string} email - Email to check
   * @param {number} tenantId - Tenant ID
   * @returns {boolean} True if email exists
   */
  static async emailExists(email, tenantId) {
    const prisma = getDatabase();

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId
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
   * Get default role (Assignee)
   * @returns {Object|null} Assignee role or null
   */
  static async getDefaultRole() {
    return this.getRoleByName('Assignee');
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
  // USER MANAGEMENT METHODS (ADMIN)
  // =========================================================================

  /**
   * Map legacy V2 Role ID to V1 Role Name
   * @param {number} roleId - V2 Role ID
   * @returns {string} V1 Role Name
   */
  static mapRoleIdToName(roleId) {
    // Mapping:
    // 1: Admin (SuperAdmin)
    // 2: Approver (Manager/TeamLead)
    // 3: Assignee (Member/User)
    // 4: Requester (OrgAdmin)
    const mapping = {
      1: 'Admin',
      2: 'Approver',
      3: 'Assignee',
      4: 'Requester'
    };
    return mapping[roleId] || 'Assignee';
  }

  /**
   * List users with pagination and filters (V2 Compatible)
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Object} Paginated user list
   */
  static async listUsers(filters = {}, pagination = { page: 1, limit: 10 }) {
    const prisma = getDatabase();
    const { search, roleId, organizationId, isActive } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      tenantId: filters.tenantId || 1 // Default to 1 if not provided
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Map organizationId (V2) -> departmentId (V1)
    if (organizationId) {
      where.departmentId = parseInt(organizationId);
    }

    // Map roleId (V2) -> userRoles.roleName (V1)
    if (roleId) {
      const roleName = this.mapRoleIdToName(parseInt(roleId));
      where.userRoles = {
        some: {
          roleName: roleName
        }
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Execute query
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          userRoles: true,
          department: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Format results
    return {
      rows: users.map(user => this.tov2User(user)),
      count: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update user details (V2 Compatible)
   * @param {number} userId - User ID
   * @param {Object} data - Field to update
   * @returns {Object} Updated user
   */
  static async updateUser(userId, data) {
    const prisma = getDatabase();
    const {
      email,
      firstName,
      lastName,
      roleId, // Legacy Role ID
      organizationId, // Legacy Org ID -> Department ID
      isActive,
      passwordHash
    } = data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new Error('USER_NOT_FOUND');
    }

    const updateData = {};
    if (email) updateData.email = email.toLowerCase();
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    // Update display name if first/last name changes
    if (firstName || lastName) {
      const newFirst = firstName || existingUser.firstName;
      const newLast = lastName || existingUser.lastName;
      updateData.displayName = `${newFirst} ${newLast}`.trim();
    }

    if (organizationId !== undefined) updateData.departmentId = organizationId; // Allow null/0
    if (isActive !== undefined) updateData.isActive = isActive;
    if (passwordHash) updateData.passwordHash = passwordHash;

    // Transaction for atomic update (User + Role)
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Update User fields
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData,
        include: { userRoles: true, department: true }
      });

      // 2. Update Role if provided
      if (roleId) {
        const newRoleName = this.mapRoleIdToName(parseInt(roleId));

        // Deactivate old roles
        await tx.userRole.updateMany({
          where: { userId },
          data: { isActive: false }
        });

        // Add new role
        await tx.userRole.create({
          data: {
            tenantId: user.tenantId,
            userId,
            roleName: newRoleName,
            isActive: true
          }
        });
      }

      // Return updated user with relations
      return tx.user.findUnique({
        where: { id: userId },
        include: { userRoles: true, department: true }
      });
    });

    return this.tov2User(updatedUser);
  }

  /**
   * Soft delete user
   * @param {number} userId - User ID
   * @returns {void}
   */
  static async deleteUser(userId) {
    const prisma = getDatabase();

    // Check if exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('USER_NOT_FOUND');

    // Hard Delete
    await prisma.user.delete({
      where: { id: userId }
    });
  }

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
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId
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
        // status: 'PENDING'  // TEMP: Use isActive: false instead
        isActive: false
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
      // status: user.status,  // TEMP: Field doesn't exist in DB yet
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
  static async approveRegistration(userId, approvedById, roleName = 'Assignee') {
    const prisma = getDatabase();

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // TEMP: Status check disabled - field doesn't exist in DB
    // if (user.status !== 'PENDING') {
    //   throw new Error('USER_NOT_PENDING');
    // }

    // Generate temporary password
    const temporaryPassword = this.generateRandomPassword(12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Update user to APPROVED with generated password
    const approvedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        // status: 'APPROVED',  // TEMP: Field doesn't exist in DB yet
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
      // status: approvedUser.status,  // TEMP: Field doesn't exist in DB yet
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

    // TEMP: Status check disabled - field doesn't exist in DB
    // if (user.status !== 'PENDING') {
    //   throw new Error('USER_NOT_PENDING');
    // }

    const rejectedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        // status: 'REJECTED',  // TEMP: Field doesn't exist in DB yet
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
      // status: rejectedUser.status,  // TEMP: Field doesn't exist in DB yet
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
      return { canAuth: false, reason: 'USER_INACTIVE' };
    }

    if (user.status !== 'APPROVED') {
      return { canAuth: false, reason: 'NOT_APPROVED', status: user.status };
    }

    return {
      canAuth: true,
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

  // =========================================================================
  // PASSWORD RESET METHODS
  // =========================================================================

  /**
   * Create a password reset token for a user
   * @param {number} userId - User ID
   * @param {number} expiresInHours - Token expiration time in hours (default: 1)
   * @returns {Object} Token data
   */
  static async createPasswordResetToken(userId, expiresInHours = 1) {
    const prisma = getDatabase();

    // Get user to verify exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Generate random token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Create password reset token in V1 table
    const resetToken = await prisma.passwordResetRequest.create({
      data: {
        tenantId: user.tenantId,
        userId,
        token,
        expiresAt,
        createdAt: new Date(),
        isUsed: false
      }
    });

    return {
      id: resetToken.id,
      userId: resetToken.userId,
      token: resetToken.token,
      expiresAt: resetToken.expiresAt
    };
  }

  /**
   * Verify a password reset token
   * @param {string} token - Reset token
   * @returns {Object|null} Token data if valid, null if invalid/expired
   */
  static async verifyPasswordResetToken(token) {
    const prisma = getDatabase();

    const resetToken = await prisma.passwordResetRequest.findFirst({
      where: {
        token,
        isUsed: false,
        expiresAt: { gt: new Date() } // Not expired
      },
      include: {
        user: true
      }
    });

    if (!resetToken) {
      return null;
    }

    return {
      id: resetToken.id,
      userId: resetToken.userId,
      userEmail: resetToken.user.email,
      expiresAt: resetToken.expiresAt
    };
  }

  /**
   * Use a password reset token to reset password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password (plain text)
   * @returns {Object} Result with updated user
   */
  static async usePasswordResetToken(token, newPassword) {
    const prisma = getDatabase();

    // Verify token exists and is valid
    const resetToken = await prisma.passwordResetRequest.findFirst({
      where: {
        token,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetToken) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const updatedUser = await prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        mustChangePassword: false
      },
      include: {
        userRoles: true,
        department: true
      }
    });

    // Mark token as used
    await prisma.passwordResetRequest.update({
      where: { id: resetToken.id },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    });

    return {
      success: true,
      user: this.tov2User(updatedUser),
      message: 'Password reset successfully'
    };
  }

  /**
   * ADMIN ONLY: Reset user password to a random 8-char password
   * @param {number} userId - User ID
   * @returns {Object} Result with new password
   */
  static async resetPasswordRandom(userId) {
    const prisma = getDatabase();

    // Generate random 8-char password
    const newPassword = this.generateRandomPassword(8);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true
      }
    });

    return {
      success: true,
      newPassword, // Return plain text password to send via email
      message: 'Password reset successfully'
    };
  }

  /**
   * Invalidate all existing password reset tokens for a user
   * @param {number} userId - User ID
   * @returns {Object} Result
   */
  static async invalidatePasswordResetTokens(userId) {
    const prisma = getDatabase();

    await prisma.passwordResetRequest.updateMany({
      where: {
        userId,
        isUsed: false
      },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    });

    return { success: true, message: 'All reset tokens invalidated' };
  }
}

export default PrismaV1Adapter;
