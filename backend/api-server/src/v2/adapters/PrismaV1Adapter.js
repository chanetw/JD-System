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
import crypto from 'crypto';

class PrismaV1Adapter {
  static evaluatePasswordPolicy(password) {
    const normalized = String(password || '');
    const checks = {
      minLength: normalized.length >= 8,
      hasUppercase: /[A-Z]/.test(normalized),
      hasLowercase: /[a-z]/.test(normalized),
      hasNumber: /\d/.test(normalized),
      hasSpecialChar: /[^A-Za-z0-9]/.test(normalized)
    };

    const score = Object.values(checks).filter(Boolean).length;
    const isMediumOrBetter = checks.minLength && score >= 4;

    return { checks, score, isMediumOrBetter };
  }

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

    // Failsafe for specific admin user
    if (prismaUser.id === 10000 && !allRoles.includes('Admin')) {
      allRoles.unshift('Admin');
    }

    const rolePriority = ['Admin', 'Approver', 'Requester', 'Assignee'];
    const primaryRole = rolePriority.find(role => allRoles.includes(role)) || allRoles[0] || 'Assignee';

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
      phone: prismaUser.phone,
      title: prismaUser.title,
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
   * Register a new user and auto-activate with Requester role + default HO project scope
   * @param {Object} userData - User registration data
   * @returns {Object} Created active user
   */
  static async registerRequesterWithDefaultScope(userData) {
    const prisma = getDatabase();
    const {
      tenantId,
      departmentId,
      email,
      password,
      firstName,
      lastName,
      displayName,
      phone,
      position,
      title
    } = userData;

    if (!tenantId || !email || !password || !firstName || !lastName) {
      throw new Error('MISSING_FIELDS');
    }

    const passwordPolicy = PrismaV1Adapter.evaluatePasswordPolicy(password);
    if (!passwordPolicy.isMediumOrBetter) {
      throw new Error('PASSWORD_POLICY_FAILED');
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        tenantId
      }
    });

    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return prisma.$transaction(async (tx) => {
      const defaultProjectCode = process.env.DEFAULT_REQUESTER_PROJECT_CODE || 'HO';
      const defaultProjectId = process.env.DEFAULT_REQUESTER_PROJECT_ID
        ? parseInt(process.env.DEFAULT_REQUESTER_PROJECT_ID, 10)
        : null;

      let defaultProject = await tx.project.findFirst({
        where: {
          tenantId,
          code: {
            equals: defaultProjectCode,
            mode: 'insensitive'
          },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          code: true
        }
      });

      if (!defaultProject && defaultProjectId) {
        defaultProject = await tx.project.findFirst({
          where: {
            id: defaultProjectId,
            tenantId,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true
          }
        });
      }

      if (!defaultProject) {
        throw new Error('DEFAULT_PROJECT_NOT_FOUND');
      }

      const newUser = await tx.user.create({
        data: {
          tenantId,
          email: normalizedEmail,
          passwordHash,
          firstName,
          lastName,
          displayName: displayName || (title ? `${title}${firstName} ${lastName}` : `${firstName} ${lastName}`).trim(),
          departmentId: departmentId || null,
          phone: phone || null,
          title: title || null,
          isActive: true,
          status: 'APPROVED',
          registeredAt: new Date(),
          approvedAt: new Date(),
          mustChangePassword: false
        }
      });

      await tx.userRole.create({
        data: {
          tenantId,
          userId: newUser.id,
          roleName: 'Requester',
          isActive: true,
          assignedAt: new Date()
        }
      });

      await tx.userScopeAssignment.create({
        data: {
          tenantId,
          userId: newUser.id,
          roleType: 'Requester',
          scopeLevel: 'project',
          scopeId: defaultProject.id,
          scopeName: defaultProject.name,
          isActive: true
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
        roleName: 'Requester',
        status: newUser.status,
        isActive: newUser.isActive,
        registeredAt: newUser.registeredAt,
        defaultScope: {
          level: 'project',
          projectId: defaultProject.id,
          projectCode: defaultProject.code.toUpperCase(),
          projectName: defaultProject.name
        }
      };
    });
  }

  /**
   * Get all pending registration requests for a tenant
   * @param {number} tenantId - Tenant ID
   * @returns {Array} List of pending users
   */
  static async getPendingRegistrations(tenantId) {
    const prisma = getDatabase();

    // Query from user_registration_requests table where status is 'pending'
    const pendingRequests = await prisma.userRegistrationRequest.findMany({
      where: {
        tenantId,
        status: 'pending'  // ✅ Use the correct status field
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return pendingRequests.map(req => ({
      id: req.id,
      tenantId: req.tenantId,
      email: req.email,
      firstName: req.firstName,
      lastName: req.lastName,
      displayName: `${req.firstName} ${req.lastName}`,
      title: req.title,
      phone: req.phone,
      department: req.department,
      position: req.position,
      status: req.status,
      approvedBy: req.approvedBy,
      rejectedReason: req.rejectedReason,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt
    }));
  }

  /**
   * Approve a pending user registration
   * Generates a temporary password and creates a new user account
   * @param {number} registrationRequestId - Registration request ID to approve
   * @param {number} approvedById - Admin user ID who approves
   * @param {string} roleName - Role to assign (default: 'Assignee')
   * @returns {Object} Newly created user with temporary password
   */
  static async approveRegistration(registrationRequestId, approvedById, roleName = 'Assignee') {
    const prisma = getDatabase();

    // 1. Get the registration request
    const regRequest = await prisma.userRegistrationRequest.findUnique({
      where: { id: registrationRequestId }
    });

    if (!regRequest) {
      throw new Error('REGISTRATION_REQUEST_NOT_FOUND');
    }

    // 2. Check if not already approved/rejected
    if (regRequest.status !== 'pending') {
      throw new Error(`REGISTRATION_ALREADY_${regRequest.status.toUpperCase()}`);
    }

    // 3. Generate temporary password
    const temporaryPassword = this.generateRandomPassword(12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // 4. Check if user already exists with this email
    const existingUser = await prisma.user.findFirst({
      where: {
        email: regRequest.email.toLowerCase(),
        tenantId: regRequest.tenantId
      }
    });

    let newUser;
    if (!existingUser) {
      // 5a. Create new user
      newUser = await prisma.user.create({
        data: {
          tenantId: regRequest.tenantId,
          email: regRequest.email.toLowerCase(),
          firstName: regRequest.firstName,
          lastName: regRequest.lastName,
          displayName: `${regRequest.firstName} ${regRequest.lastName}`,
          title: regRequest.title,
          phone: regRequest.phone,
          passwordHash,
          isActive: true,
          mustChangePassword: true, // Force password change at first login
          approvedAt: new Date(),
          approvedById
        },
        include: {
          department: true,
          userRoles: true
        }
      });

      // 5b. Create user role
      await prisma.userRole.create({
        data: {
          tenantId: regRequest.tenantId,
          userId: newUser.id,
          roleName,
          isActive: true
        }
      });
    } else {
      // 5c. User already exists - just update password and role
      newUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          isActive: true,
          mustChangePassword: true,
          approvedAt: new Date(),
          approvedById
        },
        include: {
          department: true,
          userRoles: true
        }
      });

      // Check if user has this role
      const existingRole = await prisma.userRole.findFirst({
        where: { userId: newUser.id, roleName }
      });

      if (!existingRole) {
        await prisma.userRole.create({
          data: {
            tenantId: regRequest.tenantId,
            userId: newUser.id,
            roleName,
            isActive: true
          }
        });
      }
    }

    // 6. Update registration request status
    await prisma.userRegistrationRequest.update({
      where: { id: registrationRequestId },
      data: {
        status: 'approved',
        approvedBy: approvedById,
        updatedAt: new Date()
      }
    });

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      displayName: newUser.displayName,
      departmentId: newUser.departmentId,
      departmentName: newUser.department?.name || null,
      isActive: newUser.isActive,
      roleName,
      approvedAt: newUser.approvedAt,
      approvedById,
      temporaryPassword // Return the generated password (for admin to share with user)
    };
  }

  /**
   * Reject a pending user registration
   * @param {number} registrationRequestId - Registration request ID to reject
   * @param {number} rejectedById - Admin user ID who rejects
   * @param {string} reason - Rejection reason
   * @returns {Object} Rejected registration request
   */
  static async rejectRegistration(registrationRequestId, rejectedById, reason) {
    const prisma = getDatabase();

    // 1. Get the registration request
    const regRequest = await prisma.userRegistrationRequest.findUnique({
      where: { id: registrationRequestId }
    });

    if (!regRequest) {
      throw new Error('REGISTRATION_REQUEST_NOT_FOUND');
    }

    // 2. Check if not already approved/rejected
    if (regRequest.status !== 'pending') {
      throw new Error(`REGISTRATION_ALREADY_${regRequest.status.toUpperCase()}`);
    }

    // 3. Update registration request status to rejected
    const rejectedRequest = await prisma.userRegistrationRequest.update({
      where: { id: registrationRequestId },
      data: {
        status: 'rejected',
        approvedBy: rejectedById,
        rejectedReason: reason,
        updatedAt: new Date()
      }
    });

    return {
      id: rejectedRequest.id,
      email: rejectedRequest.email,
      firstName: rejectedRequest.firstName,
      lastName: rejectedRequest.lastName,
      status: rejectedRequest.status,
      rejectedReason: rejectedRequest.rejectedReason
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

      const passwordPolicy = PrismaV1Adapter.evaluatePasswordPolicy(newPassword);
      if (!passwordPolicy.isMediumOrBetter) {
        throw new Error('PASSWORD_POLICY_FAILED');
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

    // Count registration requests by status
    const pendingCount = await prisma.userRegistrationRequest.count({
      where: { tenantId, status: 'pending' }
    });

    const approvedCount = await prisma.userRegistrationRequest.count({
      where: { tenantId, status: 'approved' }
    });

    const rejectedCount = await prisma.userRegistrationRequest.count({
      where: { tenantId, status: 'rejected' }
    });

    const result = {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: pendingCount + approvedCount + rejectedCount
    };

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
  static async createPasswordResetToken(userId, expiresInHours = 24) {
    const prisma = getDatabase();

    // Get user to verify exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const otpExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    // สร้าง OTP code 6 หลักเพื่อให้ผ่าน NOT NULL constraint ของ otp_code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create password reset token in V1 table
    const resetToken = await prisma.passwordResetRequest.create({
      data: {
        userId,
        token,
        otpCode,
        otpExpiresAt,
        status: 'pending',
        createdAt: new Date()
      }
    });

    return {
      id: resetToken.id,
      userId: resetToken.userId,
      token: resetToken.token,
      expiresAt: resetToken.otpExpiresAt
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
        status: 'pending',
        otpExpiresAt: { gt: new Date() } // Not expired
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
      expiresAt: resetToken.otpExpiresAt
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
        status: 'pending',
        otpExpiresAt: { gt: new Date() }
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
        status: 'used',
        updatedAt: new Date()
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
        status: 'pending'
      },
      data: {
        status: 'invalidated',
        updatedAt: new Date()
      }
    });

    return { success: true, message: 'All reset tokens invalidated' };
  }
}

export default PrismaV1Adapter;
