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
 * Middleware to require SuperAdmin role
 */
export const requireSuperAdmin = requireRoles(RoleName.SUPER_ADMIN);

/**
 * Middleware to require at least OrgAdmin role
 */
export const requireOrgAdmin = requireRoles(
  RoleName.SUPER_ADMIN,
  RoleName.ORG_ADMIN
);

/**
 * Middleware to require at least TeamLead role
 */
export const requireTeamLead = requireRoles(
  RoleName.SUPER_ADMIN,
  RoleName.ORG_ADMIN,
  RoleName.TEAM_LEAD
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
 * Check if user has admin-level access (SuperAdmin or OrgAdmin)
 */
export function isAdmin(role: RoleName): boolean {
  return role === RoleName.SUPER_ADMIN || role === RoleName.ORG_ADMIN;
}

/**
 * Check if user is SuperAdmin
 */
export function isSuperAdmin(role: RoleName): boolean {
  return role === RoleName.SUPER_ADMIN;
}

/**
 * Get role priority (higher = more access)
 */
export function getRolePriority(role: RoleName): number {
  const priority: Record<RoleName, number> = {
    [RoleName.SUPER_ADMIN]: 4,
    [RoleName.ORG_ADMIN]: 3,
    [RoleName.TEAM_LEAD]: 2,
    [RoleName.MEMBER]: 1,
  };
  return priority[role] || 0;
}

export default {
  requireRoles,
  requireSuperAdmin,
  requireOrgAdmin,
  requireTeamLead,
  requirePermission,
  isAdmin,
  isSuperAdmin,
  getRolePriority,
};
