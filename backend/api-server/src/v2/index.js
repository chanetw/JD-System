/**
 * V2 Auth System Routes (JavaScript Entry Point)
 *
 * This file provides a JavaScript interface to the TypeScript v2 auth system.
 * It can be imported directly by the main Express app.
 *
 * NOTE: This file serves as a bridge until the entire backend is migrated to TypeScript.
 * For production, compile the TypeScript files first using: npm run build:v2
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import PrismaV1Adapter from './adapters/PrismaV1Adapter.js';
import EmailService from '../services/emailService.js';

// Email service instance
const emailService = new EmailService();

// ============================================================================
// Utility Functions
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

const generateToken = (userId, tenantId, organizationId, email, roleId, roleName) => {
  return jwt.sign({
    sub: crypto.randomUUID(),
    userId, tenantId, organizationId, email, roleId, role: roleName
  }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const successResponse = (data, message) => ({ success: true, data, message });
const errorResponse = (errorCode, message) => ({ success: false, error: message, errorCode });
const paginatedResponse = (data, pagination) => ({
  success: true,
  data,
  pagination: { ...pagination, totalPages: Math.ceil(pagination.total / pagination.limit) }
});

const formatUserResponse = (user) => ({
  id: user.id,
  tenantId: user.tenantId,
  organizationId: user.organizationId,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: `${user.firstName} ${user.lastName}`,
  roleId: user.roleId,
  // Use role object if available, otherwise check roleName property, or default to Member
  roleName: user.role?.name || user.roleName || 'Assignee',
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  role: user.role,
  organization: user.organization
});

// ============================================================================
// Middleware
// ============================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
  const decoded = verifyToken(token);
  if (!decoded) return res.status(403).json(errorResponse('TOKEN_INVALID', 'Invalid or expired token'));
  req.user = decoded;
  next();
};

const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json(errorResponse('FORBIDDEN', `Required role: ${allowedRoles.join(' or ')}`));
  }
  next();
};

const requireOrgAdmin = requireRoles('Admin', 'Requester');
const requireTeamLead = requireRoles('Admin', 'Requester', 'Approver');

const scopeToOrganization = (req, res, next) => {
  if (!req.user) return res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
  if (req.user.role !== 'Admin' && !req.query.organizationId) {
    req.query.organizationId = String(req.user.organizationId);
  }
  next();
};

// ============================================================================
// Routes
// ============================================================================

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'V2 Auth API is running', version: '2.0.0', timestamp: new Date().toISOString() });
});


// ---- AUTH ROUTES ----

// POST /api/v2/auth/register
// Uses PrismaV1Adapter to create users in V1 users table
router.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, organizationId, tenantId, roleId } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'Email, password, firstName, and lastName are required'));
    }

    // Check if email already exists in V1 tables
    const emailExists = await PrismaV1Adapter.emailExists(email, tenantId);
    if (emailExists) {
      return res.status(409).json(errorResponse('EMAIL_EXISTS', 'Email already exists'));
    }

    // Hash password
    const passwordHashValue = await hashPassword(password);

    // Get role information
    let effectiveRoleId = roleId;
    let roleName = 'Assignee'; // Default role (V1 naming)

    if (!effectiveRoleId) {
      const defaultRole = await PrismaV1Adapter.getDefaultRole();
      if (defaultRole) {
        effectiveRoleId = defaultRole.id;
        roleName = defaultRole.name;
      }
    } else {
      // Get role name from roleId
      const role = await PrismaV1Adapter.getRoleByName('Assignee'); // In production, fetch by ID
      if (role) {
        roleName = role.name;
      }
    }

    // Create user in V1 users table via adapter
    const newUser = await PrismaV1Adapter.createUser({
      tenantId,
      organizationId: organizationId || null,
      email,
      passwordHash: passwordHashValue,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      roleId: effectiveRoleId,
      isActive: true
    });

    // Generate token
    const token = generateToken(newUser.id, newUser.tenantId, newUser.organizationId, newUser.email, newUser.roleId, newUser.roleName);

    // Format response
    const responseUser = {
      id: newUser.id,
      tenantId: newUser.tenantId,
      organizationId: newUser.organizationId,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      fullName: `${newUser.firstName} ${newUser.lastName}`,
      roleId: newUser.roleId || 0,
      roleName: newUser.roleName || 'Assignee',
      displayName: newUser.displayName,
      avatarUrl: newUser.avatarUrl,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    res.status(201).json(successResponse({ user: responseUser, token }, 'Registration successful'));
  } catch (error) {
    console.error('[V2 Auth] Registration error:', error);
    next(error);
  }
});

// POST /api/v2/auth/login
// Uses PrismaV1Adapter to authenticate against V1 users table
// Includes registration approval status check
router.post('/auth/login', async (req, res, next) => {
  try {

    const { email, password, tenantId } = req.body;
    if (!email || !password) {
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'Email and password are required'));
    }

    // Find user in V1 users table via adapter
    const user = await PrismaV1Adapter.findUserByEmail(email, tenantId);
    if (!user) return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password'));

    // Check user registration/approval status
    const authStatus = await PrismaV1Adapter.checkUserAuthStatus(user.id);
    if (!authStatus.canAuth) {
      const statusMessages = {
        'PENDING_APPROVAL': 'Your account is pending approval. Please wait for admin review.',
        'REGISTRATION_REJECTED': 'Your registration has been rejected. Please contact support.',
        'USER_INACTIVE': 'Your account has been deactivated. Please contact support.',
        'NOT_APPROVED': 'Your account is not approved. Please contact support.'
      };
      const message = statusMessages[authStatus.reason] || 'Account access denied';
      return res.status(403).json(errorResponse(authStatus.reason, message, { status: authStatus.status }));
    }

    // Get password hash for verification
    const userWithPassword = await PrismaV1Adapter.findUserByIdWithPassword(user.id, tenantId);
    if (!userWithPassword || !userWithPassword.passwordHash) {
      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    // Verify password
    const isValid = await verifyPassword(password, userWithPassword.passwordHash);
    if (!isValid) return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password'));

    // Update last login time
    await PrismaV1Adapter.updateLastLogin(user.id);

    // Generate JWT token with user data
    const token = generateToken(user.id, user.tenantId, user.organizationId, user.email, user.roleId, user.roleName);

    // Format response (ensure consistent format with V2 expectations)
    const responseUser = {
      id: user.id,
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      roleId: user.roleId || 0,
      roleName: user.roleName || 'Assignee',
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      mustChangePassword: authStatus.mustChangePassword || false
    };

    res.json(successResponse({
      user: responseUser,
      token,
      expiresIn: JWT_EXPIRES_IN,
      mustChangePassword: authStatus.mustChangePassword || false
    }, 'Login successful'));
  } catch (error) {
    console.error('[V2 Auth] Login error:', error);
    next(error);
  }
});

// ============================================================================
// REGISTRATION APPROVAL WORKFLOW ROUTES
// ============================================================================

// POST /api/v2/auth/register-request
// Submit a registration request (status = PENDING, requires admin approval)
// NO PASSWORD REQUIRED - Admin generates password on approval
router.post('/auth/register-request', async (req, res, next) => {
  try {
    const { email, firstName, lastName, departmentId, tenantId, phone, position, title } = req.body;

    // Validation
    if (!email || !firstName || !lastName || !tenantId) {
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'Email, firstName, lastName, and tenantId are required'));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(errorResponse('INVALID_EMAIL', 'Invalid email format'));
    }

    // Register user with PENDING status (NO password - will be generated on approval)
    const newUser = await PrismaV1Adapter.registerPendingUser({
      tenantId: parseInt(tenantId),
      departmentId: departmentId ? parseInt(departmentId) : null,
      email,
      firstName,
      lastName,
      displayName: (title ? `${title}${firstName} ${lastName}` : `${firstName} ${lastName}`).trim(),
      phone: phone || null,
      position: position || null,
      title: title || null
    });

    // TODO: Send notification to admin (email + in-app)
    console.log(`[V2 Auth] New registration request: ${email} (ID: ${newUser.id})`);

    res.status(201).json(successResponse({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      status: newUser.status,
      registeredAt: newUser.registeredAt
    }, 'Registration request submitted successfully. Please wait for admin approval.'));

  } catch (error) {
    console.error('[V2 Auth] Register request error:', error);

    if (error.message === 'EMAIL_EXISTS') {
      return res.status(409).json(errorResponse('EMAIL_EXISTS', 'This email is already registered'));
    }

    next(error);
  }
});

// GET /api/v2/admin/pending-registrations
// Get all pending registration requests (Admin only)
router.get('/admin/pending-registrations', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const pendingUsers = await PrismaV1Adapter.getPendingRegistrations(tenantId);

    res.json(successResponse(pendingUsers, `Found ${pendingUsers.length} pending registration(s)`));
  } catch (error) {
    console.error('[V2 Admin] Get pending registrations error:', error);
    next(error);
  }
});

// GET /api/v2/admin/registration-counts
// Get registration counts by status for dashboard (Admin only)
router.get('/admin/registration-counts', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const counts = await PrismaV1Adapter.getRegistrationCounts(tenantId);

    res.json(successResponse(counts, 'Registration counts retrieved'));
  } catch (error) {
    console.error('[V2 Admin] Get registration counts error:', error);
    next(error);
  }
});

// POST /api/v2/admin/approve-registration
// Approve a pending registration (Admin only)
// Generates a temporary password that admin must share with user
router.post('/admin/approve-registration', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const { userId, roleName } = req.body;

    if (!userId) {
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'userId is required'));
    }

    const approvedUser = await PrismaV1Adapter.approveRegistration(
      parseInt(userId),
      req.user.userId,
      roleName || 'Assignee'
    );

    console.log(`[V2 Admin] User approved: ${approvedUser.email} by Admin ID: ${req.user.userId}`);

    // Send approval email with temporary password
    const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : null;
    const emailResult = await emailService.notifyRegistrationApproved({
      userEmail: approvedUser.email,
      userName: approvedUser.displayName || `${approvedUser.firstName} ${approvedUser.lastName}`,
      temporaryPassword: approvedUser.temporaryPassword,
      loginUrl
    });

    if (emailResult.success) {
      console.log(`[V2 Admin] Approval email sent to ${approvedUser.email}`);
    } else {
      console.error(`[V2 Admin] Failed to send approval email to ${approvedUser.email}:`, emailResult.error);
    }

    // Return result (include temporaryPassword as backup if email fails)
    res.json(successResponse({
      id: approvedUser.id,
      email: approvedUser.email,
      firstName: approvedUser.firstName,
      lastName: approvedUser.lastName,
      displayName: approvedUser.displayName,
      departmentId: approvedUser.departmentId,
      departmentName: approvedUser.departmentName,
      status: approvedUser.status,
      isActive: approvedUser.isActive,
      roleName: approvedUser.roleName,
      approvedAt: approvedUser.approvedAt,
      temporaryPassword: approvedUser.temporaryPassword, // Backup if email fails
      emailSent: emailResult.success
    }, emailResult.success
      ? 'User approved! Temporary password has been sent to their email.'
      : 'User approved! But email failed to send. Please share the temporary password manually.'));

  } catch (error) {
    console.error('[V2 Admin] Approve registration error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
    if (error.message === 'USER_NOT_PENDING') {
      return res.status(400).json(errorResponse('USER_NOT_PENDING', 'User is not in pending status'));
    }

    next(error);
  }
});

// POST /api/v2/admin/reject-registration
// Reject a pending registration (Admin only)
router.post('/admin/reject-registration', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'userId is required'));
    }

    const rejectedUser = await PrismaV1Adapter.rejectRegistration(
      parseInt(userId),
      req.user.userId,
      reason || 'Registration rejected by admin'
    );

    console.log(`[V2 Admin] User rejected: ${rejectedUser.email} by Admin ID: ${req.user.userId}`);

    // Send rejection email
    const emailResult = await emailService.notifyRegistrationRejected({
      userEmail: rejectedUser.email,
      userName: `${rejectedUser.firstName} ${rejectedUser.lastName}`,
      reason: rejectedUser.rejectionReason
    });

    if (emailResult.success) {
      console.log(`[V2 Admin] Rejection email sent to ${rejectedUser.email}`);
    } else {
      console.error(`[V2 Admin] Failed to send rejection email:`, emailResult.error);
    }

    res.json(successResponse(rejectedUser, 'User registration rejected'));

  } catch (error) {
    console.error('[V2 Admin] Reject registration error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
    if (error.message === 'USER_NOT_PENDING') {
      return res.status(400).json(errorResponse('USER_NOT_PENDING', 'User is not in pending status'));
    }

    next(error);
  }
});

// POST /api/v2/auth/change-password
// Change password (for first login after admin approval or voluntary change)
router.post('/auth/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'New password is required'));
    }

    if (newPassword.length < 8) {
      return res.status(400).json(errorResponse('WEAK_PASSWORD', 'Password must be at least 8 characters'));
    }

    // Get user with password for verification (if currentPassword provided)
    const userWithPassword = await PrismaV1Adapter.findUserByIdWithPassword(req.user.userId, req.user.tenantId);
    if (!userWithPassword) {
      return res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }

    // If currentPassword is provided, verify it (for voluntary password change)
    // If not provided, assume it's a forced change after admin approval
    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword, userWithPassword.passwordHash);
      if (!isValid) {
        return res.status(401).json(errorResponse('INVALID_PASSWORD', 'Current password is incorrect'));
      }
    }

    // Change the password
    await PrismaV1Adapter.changePassword(req.user.userId, newPassword, true);

    console.log(`[V2 Auth] Password changed for user ${req.user.email}`);

    res.json(successResponse(null, 'Password changed successfully'));

  } catch (error) {
    console.error('[V2 Auth] Change password error:', error);

    if (error.message === 'PASSWORD_TOO_SHORT') {
      return res.status(400).json(errorResponse('WEAK_PASSWORD', 'Password must be at least 8 characters'));
    }

    next(error);
  }
});

// ============================================================================
// PASSWORD RESET ROUTES
// ============================================================================

// POST /api/v2/auth/forgot-password
router.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json(errorResponse('MISSING_FIELDS', 'Email is required'));

  try {
    // Use Adapter
    // Note: Defaulting tenantId to 1 (SENA) if not specified, as this is a public endpoint
    const user = await PrismaV1Adapter.findUserByEmail(email, 1);

    if (user && user.isActive) {
      const resetToken = await PrismaV1Adapter.createPasswordResetToken(user.id);
      console.log(`[V2 Auth] Password reset token for ${email}: ${resetToken.token}`);

      // TODO: Send email
    }
  } catch (e) {
    console.error('[V2 Auth] forgot-password error:', e);
  }

  res.json(successResponse(null, 'If the email exists, a password reset link will be sent'));
});

// POST /api/v2/auth/reset-password
router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json(errorResponse('MISSING_FIELDS', 'Token and new password required'));

    // Use Adapter to verify and use token
    try {
      await PrismaV1Adapter.usePasswordResetToken(token, newPassword);
      res.json(successResponse(null, 'Password reset successful'));
    } catch (error) {
      if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return res.status(400).json(errorResponse('INVALID_RESET_TOKEN', 'Invalid or expired token'));
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/auth/verify
router.get('/auth/verify', authenticateToken, async (req, res, next) => {
  try {
    // Use Adapter instead of Sequelize Model
    const user = await PrismaV1Adapter.findUserById(req.user.userId);

    if (!user) return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));

    res.json(successResponse(formatUserResponse(user), 'Token is valid'));
  } catch (error) {
    next(error);
  }
});

// POST /api/v2/auth/refresh
router.post('/auth/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json(errorResponse('MISSING_FIELDS', 'Refresh token required'));

    let decoded;
    try {
      decoded = jwt.decode(refreshToken);
    } catch {
      return res.status(401).json(errorResponse('TOKEN_INVALID', 'Invalid token'));
    }

    // Use Adapter instead of Sequelize Model
    const user = await PrismaV1Adapter.findUserById(decoded?.userId);

    if (!user || !user.isActive) return res.status(401).json(errorResponse('TOKEN_INVALID', 'Invalid token'));

    const token = generateToken(user.id, user.tenantId, user.organizationId, user.email, user.roleId, user.roleName || 'Assignee');
    res.json(successResponse({ token, expiresIn: JWT_EXPIRES_IN }, 'Token refreshed'));
  } catch (error) {
    next(error);
  }
});

// POST /api/v2/auth/logout
router.post('/auth/logout', authenticateToken, (req, res) => {
  console.log(`[V2 Auth] User ${req.user.userId} logged out`);
  res.json(successResponse(null, 'Logout successful'));
});

// ---- USER ROUTES ----

// GET /api/v2/users/me
router.get('/users/me', authenticateToken, async (req, res, next) => {
  try {
    // Use Adapter instead of Sequelize Model
    const user = await PrismaV1Adapter.findUserById(req.user.userId);

    if (!user) return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    res.json(successResponse(formatUserResponse(user)));
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/users
router.get('/users', authenticateToken, requireTeamLead, scopeToOrganization, async (req, res, next) => {
  try {
    const { page = '1', limit = '20', search, roleId, isActive, organizationId } = req.query;

    const result = await PrismaV1Adapter.listUsers({
      tenantId: req.user.tenantId,
      organizationId: organizationId,
      roleId: roleId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search
    }, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.rows.map(formatUserResponse),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.count,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/users/:id
router.get('/users/:id', authenticateToken, requireTeamLead, async (req, res, next) => {
  try {
    const user = await PrismaV1Adapter.findUserById(parseInt(req.params.id));

    if (!user || user.tenantId !== req.user.tenantId) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    }

    if (req.user.role !== 'Admin' && user.organizationId !== req.user.organizationId) {
      return res.status(403).json(errorResponse('FORBIDDEN', 'Access denied'));
    }

    res.json(successResponse(formatUserResponse(user)));
  } catch (error) {
    next(error);
  }
});

// POST /api/v2/users
router.post('/users', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    let { email, password, firstName, lastName, organizationId, roleId } = req.body;
    if (!email || !password || !firstName || !lastName || !organizationId) {
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'All fields required'));
    }

    if (req.user.role !== 'Admin') organizationId = req.user.organizationId;

    const emailExists = await PrismaV1Adapter.emailExists(email, req.user.tenantId);
    if (emailExists) return res.status(409).json(errorResponse('EMAIL_EXISTS', 'Email already exists'));

    const passwordHashValue = await hashPassword(password);
    const user = await PrismaV1Adapter.createUser({
      tenantId: req.user.tenantId,
      organizationId: parseInt(organizationId),
      email,
      passwordHash: passwordHashValue,
      firstName,
      lastName,
      roleId: parseInt(roleId) || 3, // Default 3 (Assignee) if not provided
      isActive: true
    });

    res.status(201).json(successResponse(formatUserResponse(user), 'User created successfully'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/v2/users/:id
router.put('/users/:id', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await PrismaV1Adapter.findUserById(userId);

    if (!user || user.tenantId !== req.user.tenantId) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    }

    if (req.user.role !== 'Admin' && user.organizationId !== req.user.organizationId) {
      return res.status(403).json(errorResponse('FORBIDDEN', 'Access denied'));
    }

    const updateData = {};
    if (req.body.email) {
      const existing = await PrismaV1Adapter.findUserByEmail(req.body.email, req.user.tenantId);
      if (existing && existing.id !== userId) {
        return res.status(409).json(errorResponse('EMAIL_EXISTS', 'Email already exists'));
      }
      updateData.email = req.body.email;
    }

    if (req.body.password) updateData.passwordHash = await hashPassword(req.body.password);
    if (req.body.firstName) updateData.firstName = req.body.firstName;
    if (req.body.lastName) updateData.lastName = req.body.lastName;
    if (req.body.roleId) updateData.roleId = parseInt(req.body.roleId);
    if (req.body.organizationId !== undefined) updateData.organizationId = parseInt(req.body.organizationId);
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const updatedUser = await PrismaV1Adapter.updateUser(userId, updateData);

    res.json(successResponse(formatUserResponse(updatedUser), 'User updated successfully'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/v2/users/:id/reset-password
// ADMIN ONLY: Reset password to default '123456'
router.put('/users/:id/reset-password', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await PrismaV1Adapter.findUserById(userId);

    if (!user || user.tenantId !== req.user.tenantId) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    }

    if (req.user.role !== 'Admin' && user.organizationId !== req.user.organizationId) {
      return res.status(403).json(errorResponse('FORBIDDEN', 'Access denied'));
    }

    // 1. Reset password to random
    const result = await PrismaV1Adapter.resetPasswordRandom(userId);

    // 2. Send email to user
    await emailService.notifyPasswordReset({
      userEmail: user.email,
      userName: user.firstName,
      newPassword: result.newPassword,
      loginUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    });

    res.json(successResponse(null, 'Password reset to random and email sent successfully'));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v2/users/:id
router.delete('/users/:id', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.userId) return res.status(400).json(errorResponse('SELF_DELETE', 'Cannot delete yourself'));

    const user = await PrismaV1Adapter.findUserById(userId);
    if (!user || user.tenantId !== req.user.tenantId) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    }

    if (req.user.role !== 'Admin' && user.organizationId !== req.user.organizationId) {
      return res.status(403).json(errorResponse('FORBIDDEN', 'Access denied'));
    }

    await PrismaV1Adapter.deleteUser(userId);
    res.json(successResponse(null, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Export
// ============================================================================

export default router;
