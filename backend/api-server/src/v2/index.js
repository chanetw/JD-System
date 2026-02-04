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
import { Sequelize, DataTypes, Model, Op } from 'sequelize';
import PrismaV1Adapter from './adapters/PrismaV1Adapter.js';
import EmailService from '../services/emailService.js';

// Email service instance
const emailService = new EmailService();

// ============================================================================
// Sequelize Configuration
// ============================================================================

const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      url: databaseUrl,
      dialectOptions: {
        ssl: databaseUrl.includes('supabase') ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    };
  }

  return {
    database: process.env.DB_NAME || 'dj_system',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialectOptions: {}
  };
};

const config = getDatabaseConfig();

const sequelize = 'url' in config && config.url
  ? new Sequelize(config.url, {
    dialect: 'postgres',
    dialectOptions: config.dialectOptions,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  })
  : new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: 'postgres',
    dialectOptions: config.dialectOptions,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });

// ============================================================================
// Models
// ============================================================================

// Role Model
const Role = sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  displayName: { type: DataTypes.STRING(100), allowNull: false, field: 'display_name' },
  permissions: { type: DataTypes.JSONB, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'v2_roles', timestamps: true, underscored: true });

// Organization Model
const Organization = sequelize.define('Organization', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
}, { tableName: 'v2_organizations', timestamps: true, underscored: true });

// User Model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  organizationId: { type: DataTypes.INTEGER, allowNull: false, field: 'organization_id' },
  email: { type: DataTypes.STRING(255), allowNull: false },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  firstName: { type: DataTypes.STRING(100), allowNull: false, field: 'first_name' },
  lastName: { type: DataTypes.STRING(100), allowNull: false, field: 'last_name' },
  roleId: { type: DataTypes.INTEGER, allowNull: false, field: 'role_id' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  lastLoginAt: { type: DataTypes.DATE, field: 'last_login_at', allowNull: true },
}, {
  tableName: 'v2_users',
  timestamps: true,
  underscored: true,
  defaultScope: { attributes: { exclude: ['passwordHash'] } },
  scopes: { withPassword: { attributes: { include: ['passwordHash'] } } }
});

// Password Reset Token Model
const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  usedAt: { type: DataTypes.DATE, allowNull: true, field: 'used_at' },
}, { tableName: 'v2_password_reset_tokens', timestamps: true, updatedAt: false, underscored: true });

// Associations
User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(PasswordResetToken, { foreignKey: 'userId', as: 'passwordResetTokens' });

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
  roleName: user.role?.name || user.roleName || 'Member',
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

const requireOrgAdmin = requireRoles('SuperAdmin', 'OrgAdmin');
const requireTeamLead = requireRoles('SuperAdmin', 'OrgAdmin', 'TeamLead');

const scopeToOrganization = (req, res, next) => {
  if (!req.user) return res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
  if (req.user.role !== 'SuperAdmin' && !req.query.organizationId) {
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
    let roleName = 'Member'; // Default role

    if (!effectiveRoleId) {
      const defaultRole = await PrismaV1Adapter.getDefaultRole();
      if (defaultRole) {
        effectiveRoleId = defaultRole.id;
        roleName = defaultRole.name;
      }
    } else {
      // Get role name from roleId
      const role = await PrismaV1Adapter.getRoleByName('Member'); // In production, fetch by ID
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
      roleName: newUser.roleName || 'Member',
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
      roleName: user.roleName || 'Member',
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
      roleName || 'Member'
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
    const user = await User.findOne({ where: { email: email.toLowerCase(), isActive: true } });
    if (user) {
      await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null } });
      const token = crypto.randomBytes(32).toString('hex');
      await PasswordResetToken.create({ userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
      console.log(`[V2 Auth] Password reset token for ${email}: ${token}`);
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

    const resetToken = await PasswordResetToken.findOne({
      where: { token, usedAt: null, expiresAt: { [Op.gt]: new Date() } }
    });

    if (!resetToken) return res.status(400).json(errorResponse('INVALID_RESET_TOKEN', 'Invalid or expired token'));

    const passwordHashValue = await hashPassword(newPassword);
    await User.update({ passwordHash: passwordHashValue }, { where: { id: resetToken.userId } });
    await resetToken.update({ usedAt: new Date() });

    res.json(successResponse(null, 'Password reset successful'));
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

    const token = generateToken(user.id, user.tenantId, user.organizationId, user.email, user.roleId, user.roleName || 'Member');
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
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { tenantId: req.user.tenantId };
    if (organizationId) where.organizationId = parseInt(organizationId);
    if (roleId) where.roleId = parseInt(roleId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Role, as: 'role' }, { model: Organization, as: 'organization' }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json(paginatedResponse(rows.map(formatUserResponse), { page: parseInt(page), limit: parseInt(limit), total: count }));
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/users/:id
router.get('/users/:id', authenticateToken, requireTeamLead, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: parseInt(req.params.id), tenantId: req.user.tenantId },
      include: [{ model: Role, as: 'role' }, { model: Organization, as: 'organization' }]
    });

    if (!user) return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    if (req.user.role !== 'SuperAdmin' && user.organizationId !== req.user.organizationId) {
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

    if (req.user.role !== 'SuperAdmin') organizationId = req.user.organizationId;

    const existingUser = await User.findOne({ where: { email: email.toLowerCase(), tenantId: req.user.tenantId } });
    if (existingUser) return res.status(409).json(errorResponse('EMAIL_EXISTS', 'Email already exists'));

    if (!roleId) {
      const defaultRole = await Role.findOne({ where: { name: 'Member' } });
      roleId = defaultRole?.id;
    }

    const passwordHashValue = await hashPassword(password);
    const user = await User.create({
      tenantId: req.user.tenantId,
      organizationId,
      email: email.toLowerCase(),
      passwordHash: passwordHashValue,
      firstName,
      lastName,
      roleId,
      isActive: true
    });

    await user.reload({ include: [{ model: Role, as: 'role' }, { model: Organization, as: 'organization' }] });
    res.status(201).json(successResponse(formatUserResponse(user), 'User created successfully'));
  } catch (error) {
    next(error);
  }
});

// PUT /api/v2/users/:id
router.put('/users/:id', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findOne({ where: { id: userId, tenantId: req.user.tenantId } });

    if (!user) return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    if (req.user.role !== 'SuperAdmin' && user.organizationId !== req.user.organizationId) {
      return res.status(403).json(errorResponse('FORBIDDEN', 'Access denied'));
    }

    const updateData = {};
    if (req.body.email) {
      const existing = await User.findOne({
        where: { email: req.body.email.toLowerCase(), tenantId: req.user.tenantId, id: { [Op.ne]: userId } }
      });
      if (existing) return res.status(409).json(errorResponse('EMAIL_EXISTS', 'Email already exists'));
      updateData.email = req.body.email.toLowerCase();
    }
    if (req.body.password) updateData.passwordHash = await hashPassword(req.body.password);
    if (req.body.firstName) updateData.firstName = req.body.firstName;
    if (req.body.lastName) updateData.lastName = req.body.lastName;
    if (req.body.roleId) updateData.roleId = req.body.roleId;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    await user.update(updateData);
    await user.reload({ include: [{ model: Role, as: 'role' }, { model: Organization, as: 'organization' }] });

    res.json(successResponse(formatUserResponse(user), 'User updated successfully'));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v2/users/:id
router.delete('/users/:id', authenticateToken, requireOrgAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.userId) return res.status(400).json(errorResponse('SELF_DELETE', 'Cannot delete yourself'));

    const user = await User.findOne({ where: { id: userId, tenantId: req.user.tenantId } });
    if (!user) return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    if (req.user.role !== 'SuperAdmin' && user.organizationId !== req.user.organizationId) {
      return res.status(403).json(errorResponse('FORBIDDEN', 'Access denied'));
    }

    await user.update({ isActive: false });
    res.json(successResponse(null, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Export
// ============================================================================

export default router;
export { sequelize, User, Organization, Role, PasswordResetToken };
