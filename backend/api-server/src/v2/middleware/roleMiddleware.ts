/**
 * Role-Based Access Control (RBAC) Middleware for V2 Auth System
 *
 * Checks user roles and permissions before allowing access.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { errorResponse, ErrorCodes } from '../utils/responseUtils';
import { RoleName, IPermissions } from '../interfaces/IRole';
import { Role } from '../models';

/**
 * Middleware to require specific roles
 * @param allowedRoles - Array of role names that are allowed
 */
export function requireRoles(...allowedRoles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required')
      );
      return;
    }

    if (!allowedRoles.includes(user.role as RoleName)) {
      res.status(403).json(
        errorResponse(
          ErrorCodes.FORBIDDEN,
          `Access denied. Required role: ${allowedRoles.join(' or ')}`
        )
      );
      return;
    }

    next();
  };
}

/**
 * Middleware to require Admin role
 */
export const requireAdmin = requireRoles(RoleName.ADMIN);

/**
 * Middleware to require at least Requester role (Admin or Requester)
 */
export const requireRequester = requireRoles(
  RoleName.ADMIN,
  RoleName.REQUESTER
);

/**
 * Middleware to require at least Approver role
 */
export const requireApprover = requireRoles(
  RoleName.ADMIN,
  RoleName.REQUESTER,
  RoleName.APPROVER
);

/**
 * Middleware to check specific permission
 * @param resource - The resource to check (users, organizations, jobs, etc.)
 * @param action - The action to check (create, read, update, delete, approve)
 */
export function requirePermission(
  resource: keyof IPermissions,
  action: string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required')
      );
      return;
    }

    try {
      // Get role with permissions
      const role = await Role.findByPk(user.roleId);

      if (!role) {
        res.status(403).json(
          errorResponse(ErrorCodes.FORBIDDEN, 'Role not found')
        );
        return;
      }

      // Check permission
      const hasPermission = role.hasPermission(resource, action);

      if (!hasPermission) {
        res.status(403).json(
          errorResponse(
            ErrorCodes.INSUFFICIENT_PERMISSIONS,
            `Permission denied for ${action} on ${resource}`
          )
        );
        return;
      }

      next();
    } catch (error) {
      console.error('[roleMiddleware] Error checking permission:', error);
      res.status(500).json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error checking permissions')
      );
    }
  };
}

/**
 * Check if user has admin-level access (Admin or Requester)
 */
export function isAdmin(role: RoleName): boolean {
  return role === RoleName.ADMIN || role === RoleName.REQUESTER;
}

/**
 * Check if user is Admin (highest level)
 */
export function isAdminRole(role: RoleName): boolean {
  return role === RoleName.ADMIN;
}

/**
 * Alias for isAdminRole - Check if user is Admin (highest level)
 */
export function isSuperAdmin(role: RoleName): boolean {
  return role === RoleName.ADMIN;
}

/**
 * Get role priority (higher = more access)
 * Admin > Requester > Approver > Assignee
 */
export function getRolePriority(role: RoleName): number {
  const priority: Record<RoleName, number> = {
    [RoleName.ADMIN]: 4,
    [RoleName.REQUESTER]: 3,
    [RoleName.APPROVER]: 2,
    [RoleName.ASSIGNEE]: 1,
  };
  return priority[role] || 0;
}

/**
 * Aliases for backward compatibility with V2 naming
 */
export const requireOrgAdmin = requireRequester; // OrgAdmin → Requester
export const requireTeamLead = requireApprover; // TeamLead → Approver

export default {
  requireRoles,
  requireAdmin,
  requireRequester,
  requireApprover,
  requireOrgAdmin,
  requireTeamLead,
  requirePermission,
  isAdmin,
  isAdminRole,
  isSuperAdmin,
  getRolePriority,
};
