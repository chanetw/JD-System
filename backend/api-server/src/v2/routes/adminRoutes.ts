/**
 * Admin Routes for V2 Auth System
 *
 * Handles admin-only operations including registration approval.
 */

import { Router } from 'express';
import AdminController from '../controllers/AdminController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRoles } from '../middleware/roleMiddleware';
import { RoleName } from '../interfaces/IRole';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// All routes require at least Requester role (Admin, Requester)
router.use(requireRoles(RoleName.ADMIN, RoleName.REQUESTER));

// ============================================================================
// Registration Request Management
// ============================================================================

/**
 * GET /api/v2/admin/registration-requests
 * List pending registration requests with pagination
 */
router.get(
  '/registration-requests',
  AdminController.listRegistrationRequests
);

/**
 * GET /api/v2/admin/registration-requests/:id
 * Get single registration request by ID
 */
router.get(
  '/registration-requests/:id',
  AdminController.getRegistrationRequest
);

/**
 * POST /api/v2/admin/registration-requests/:id/approve
 * Approve registration request and create user
 */
router.post(
  '/registration-requests/:id/approve',
  AdminController.approveRegistration
);

/**
 * POST /api/v2/admin/registration-requests/:id/reject
 * Reject registration request
 */
router.post(
  '/registration-requests/:id/reject',
  AdminController.rejectRegistration
);

/**
 * GET /api/v2/admin/registration-requests/statistics
 * Get registration statistics
 */
router.get(
  '/registration-requests/statistics',
  AdminController.getRegistrationStatistics
);

// ============================================================================
// User Management (Admin)
// ============================================================================

/**
 * GET /api/v2/admin/users
 * List all users (admin can see all organizations)
 */
router.get('/users', AdminController.listAllUsers);

/**
 * PUT /api/v2/admin/users/:id/role
 * Update user role (Admin only)
 */
router.put(
  '/users/:id/role',
  requireRoles(RoleName.ADMIN),
  AdminController.updateUserRole
);

/**
 * PUT /api/v2/admin/users/:id/status
 * Activate/Deactivate user
 */
router.put('/users/:id/status', AdminController.updateUserStatus);

// ============================================================================
// Organization Management (Admin only)
// ============================================================================

/**
 * GET /api/v2/admin/organizations
 * List all organizations
 */
router.get(
  '/organizations',
  requireRoles(RoleName.ADMIN),
  AdminController.listOrganizations
);

/**
 * POST /api/v2/admin/organizations
 * Create new organization
 */
router.post(
  '/organizations',
  requireRoles(RoleName.ADMIN),
  AdminController.createOrganization
);

export default router;
