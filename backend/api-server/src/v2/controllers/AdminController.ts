/**
 * Admin Controller for V2 Auth System
 *
 * Handles admin operations including registration approval.
 */

import { Request, Response, NextFunction } from 'express';
import RegistrationRequestService from '../services/RegistrationRequestService';
import UserService from '../services/UserService';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '../utils/responseUtils';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { IApproveRegistrationRequest, IRejectRegistrationRequest } from '../interfaces/IRegistrationRequest';

class AdminController {
  /**
   * GET /api/v2/admin/registration-requests
   * List pending registration requests
   */
  async listRegistrationRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const {
        page = '1',
        limit = '20',
        status = 'PENDING',
        organizationId,
        search,
      } = req.query;

      const filters = {
        tenantId: user.tenantId,
        organizationId: organizationId ? parseInt(organizationId as string, 10) : undefined,
        status: status as string,
        search: search as string,
      };

      const result = await RegistrationRequestService.listRegistrationRequests(filters, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      res.json(paginatedResponse(result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/admin/registration-requests/:id
   * Get single registration request
   */
  async getRegistrationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;

      const registrationRequest = await RegistrationRequestService.getRegistrationRequestById(
        parseInt(id, 10),
        user.tenantId
      );

      if (!registrationRequest) {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Registration request not found')
        );
        return;
      }

      res.json(successResponse(registrationRequest));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v2/admin/registration-requests/:id/approve
   * Approve registration request and create user
   */
  async approveRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;
      const payload: IApproveRegistrationRequest = req.body;

      const result = await RegistrationRequestService.approveRegistration(
        parseInt(id, 10),
        user.userId,
        payload.roleId
      );

      // Send email notification to user
      const registrationRequest = result.registrationRequest as any;
      if (registrationRequest) {
        const loginUrl = `${process.env.FRONTEND_URL}/login-v2`;
        await RegistrationRequestService.notifyUserOfApproval(
          registrationRequest,
          loginUrl
        );
      }

      res.json(
        successResponse(result, 'Registration approved successfully')
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'REGISTRATION_REQUEST_NOT_FOUND') {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Registration request not found')
        );
        return;
      }

      next(error);
    }
  }

  /**
   * POST /api/v2/admin/registration-requests/:id/reject
   * Reject registration request
   */
  async rejectRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;
      const payload: IRejectRegistrationRequest = req.body;

      if (!payload.reason) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'Rejection reason is required')
        );
        return;
      }

      const registrationRequest = await RegistrationRequestService.rejectRegistration(
        parseInt(id, 10),
        user.userId,
        payload.reason
      );

      // Send email notification to user
      if (registrationRequest) {
        await RegistrationRequestService.notifyUserOfRejection(
          registrationRequest,
          payload.reason
        );
      }

      res.json(
        successResponse(registrationRequest, 'Registration rejected successfully')
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'REGISTRATION_REQUEST_NOT_FOUND') {
        res.status(404).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Registration request not found')
        );
        return;
      }

      next(error);
    }
  }

  /**
   * GET /api/v2/admin/registration-requests/statistics
   * Get registration statistics
   */
  async getRegistrationStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;

      const statistics = await RegistrationRequestService.getStatistics(user.tenantId);

      res.json(successResponse(statistics));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/admin/users
   * List all users (admin view)
   */
  async listAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const filters = {
        tenantId: user.tenantId,
        organizationId: organizationId as string | undefined,
        search: search as string | undefined,
        roleId: roleId ? parseInt(roleId as string, 10) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      };

      const result = await UserService.listUsers(filters, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      res.json(paginatedResponse(result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v2/admin/users/:id/role
   * Update user role (Admin only)
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      if (!roleId) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'Role ID is required')
        );
        return;
      }

      const updatedUser = await UserService.updateUser(parseInt(id, 10), { roleId });

      res.json(
        successResponse(updatedUser, 'User role updated successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v2/admin/users/:id/status
   * Activate/Deactivate user
   */
  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        res.status(400).json(
          errorResponse(ErrorCodes.MISSING_FIELDS, 'Status is required')
        );
        return;
      }

      const updatedUser = await UserService.updateUser(parseInt(id, 10), { isActive });

      res.json(
        successResponse(
          updatedUser,
          isActive ? 'User activated successfully' : 'User deactivated successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/admin/organizations
   * List all organizations (Admin only)
   */
  async listOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Implement organization listing
      res.json(successResponse([], 'Organizations list'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v2/admin/organizations
   * Create new organization (Admin only)
   */
  async createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Implement organization creation
      res.json(successResponse(null, 'Organization created'));
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
