/**
 * User Routes for V2 Auth System
 *
 * Endpoints: /api/v2/users/*
 */

import { Router } from 'express';
import UserController from '../controllers/UserController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireOrgAdmin, requireTeamLead } from '../middleware/roleMiddleware';
import { scopeToOrganization } from '../middleware/organizationMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * User routes
 */

// GET /api/v2/users/me - Get current authenticated user
// Access: Any authenticated user
router.get('/me', UserController.getCurrentUser);

// GET /api/v2/users - List users with pagination
// Access: Approver+ (scoped to organization)
router.get('/', requireTeamLead, scopeToOrganization, UserController.listUsers);

// GET /api/v2/users/:id - Get single user
// Access: Approver+ (scoped to organization)
router.get('/:id', requireTeamLead, UserController.getUser);

// POST /api/v2/users - Create new user
// Access: Requester+
router.post('/', requireOrgAdmin, UserController.createUser);

// PUT /api/v2/users/:id - Update user
// Access: Requester+ (scoped to organization)
router.put('/:id', requireOrgAdmin, UserController.updateUser);

// DELETE /api/v2/users/:id - Soft delete user
// Access: Requester+ (scoped to organization)
router.delete('/:id', requireOrgAdmin, UserController.deleteUser);

export default router;
