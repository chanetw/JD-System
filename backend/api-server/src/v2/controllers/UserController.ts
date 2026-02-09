/**
 * User Controller for V2 Auth System
 *
 * Handles HTTP requests for user CRUD operations.
 */

import { Request, Response, NextFunction } from 'express';
import UserService from '../services/UserService';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '../utils/responseUtils';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { isAdmin, isAdmin } from '../middleware/roleMiddleware';
import { IUserCreateRequest, IUserUpdateRequest } from '../interfaces/IUser';
import { RoleName } from '../interfaces/IRole';

class UserController {
  /**
   * GET /api/v2/users
   * List users with pagination and filters
   * Access: Admin (all), Requester (org users), Approver (org users read-only)
   */
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const {
        page = '1',
        limit = '20',
        search,
        roleId,
        isActive,
        organizationId,
      } = req.query;

      // Build filters
      const filters = {
        tenantId: user.tenantId,
        // Admin can filter by any org, others see only their org
        organizationId: isAdmin(user.role as RoleName)
          ? organizationId as string | undefined
          : user.organizationId,
        search: search as string | undefined,
        roleId: roleId ? parseInt(roleId as string, 10) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      };

      const result = await UserService.listUsers(filters, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      res.json(
        paginatedResponse(result.data, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/users/me
   * Get current authenticated user
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;

      const userData = await UserService.getUserById(user.userId, user.tenantId);

      if (!userData) {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        );
        return;
      }

      res.json(
        successResponse(userData)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/users/:id
   * Get single user by ID
   * Access: Admin (any), Requester/Approver (same org only)
   */
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;

      const userData = await UserService.getUserById(parseInt(id, 10), user.tenantId);

      if (!userData) {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        );
        return;
      }

      // Check organization access for non-Admins
      if (!isAdmin(user.role as RoleName) && userData.organizationId !== user.organizationId) {
        res.status(403).json(
          errorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
        );
        return;
      }

      res.json(
        successResponse(userData)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v2/users
   * Create a new user
   * Access: Admin, Requester
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const payload: IUserCreateRequest = req.body;

      // Validate required fields
      const { email, password, firstName, lastName, organizationId } = payload;
      if (!email || !password || !firstName || !lastName || !organizationId) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'All fields are required: email, password, firstName, lastName, organizationId')
        );
        return;
      }

      // Requester can only create users in their organization
      if (!isAdmin(user.role as RoleName)) {
        payload.organizationId = user.organizationId;
      }

      payload.tenantId = user.tenantId;

      const newUser = await UserService.createUser(payload);

      res.status(201).json(
        successResponse(newUser, 'User created successfully')
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

      next(error);
    }
  }

  /**
   * PUT /api/v2/users/:id
   * Update a user
   * Access: Admin (any), Requester (same org)
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;
      const payload: IUserUpdateRequest = req.body;

      // Verify target user exists and access is allowed
      const targetUser = await UserService.getUserById(parseInt(id, 10), user.tenantId);

      if (!targetUser) {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        );
        return;
      }

      // Check organization access for non-Admins
      if (!isAdmin(user.role as RoleName) && targetUser.organizationId !== user.organizationId) {
        res.status(403).json(
          errorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
        );
        return;
      }

      const updatedUser = await UserService.updateUser(parseInt(id, 10), payload);

      res.json(
        successResponse(updatedUser, 'User updated successfully')
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'EMAIL_EXISTS') {
        res.status(409).json(
          errorResponse(ErrorCodes.EMAIL_EXISTS, 'Email already exists')
        );
        return;
      }

      if (errorMessage === 'USER_NOT_FOUND') {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        );
        return;
      }

      next(error);
    }
  }

  /**
   * DELETE /api/v2/users/:id
   * Soft delete user (set isActive = false)
   * Access: Admin (any), Requester (same org)
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;
      const targetUserId = parseInt(id, 10);

      // Prevent self-deletion
      if (targetUserId === user.userId) {
        res.status(400).json(
          errorResponse(ErrorCodes.SELF_DELETE, 'Cannot delete your own account')
        );
        return;
      }

      // Verify target user exists
      const targetUser = await UserService.getUserById(targetUserId, user.tenantId);

      if (!targetUser) {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        );
        return;
      }

      // Check organization access for non-Admins
      if (!isAdmin(user.role as RoleName) && targetUser.organizationId !== user.organizationId) {
        res.status(403).json(
          errorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
        );
        return;
      }

      await UserService.deleteUser(targetUserId);

      res.json(
        successResponse(null, 'User deleted successfully')
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'USER_NOT_FOUND') {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        );
        return;
      }

      next(error);
    }
  }
}

export default new UserController();
