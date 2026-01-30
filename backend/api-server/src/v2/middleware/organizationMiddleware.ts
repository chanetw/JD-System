/**
 * Organization Middleware for V2 Auth System
 *
 * Handles organization-scoped access control.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { errorResponse, ErrorCodes } from '../utils/responseUtils';
import { RoleName } from '../interfaces/IRole';

/**
 * Middleware to scope queries to user's organization
 * SuperAdmins can access all organizations
 * Others are restricted to their own organization
 */
export function scopeToOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json(
      errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required')
    );
    return;
  }

  // SuperAdmins can access any organization
  if (user.role === RoleName.SUPER_ADMIN) {
    next();
    return;
  }

  // For other roles, enforce organization scope
  // Add organizationId to query params if not already set
  if (!req.query.organizationId) {
    req.query.organizationId = String(user.organizationId);
  }

  next();
}

/**
 * Middleware to verify user belongs to requested organization
 * For routes that accept organizationId as a parameter
 */
export function verifyOrganizationAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as AuthenticatedRequest).user;
  const requestedOrgId = parseInt(
    req.params.organizationId || (req.query.organizationId as string),
    10
  );

  if (!user) {
    res.status(401).json(
      errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required')
    );
    return;
  }

  // SuperAdmins can access any organization
  if (user.role === RoleName.SUPER_ADMIN) {
    next();
    return;
  }

  // Check if user belongs to requested organization
  if (requestedOrgId && requestedOrgId !== user.organizationId) {
    res.status(403).json(
      errorResponse(
        ErrorCodes.FORBIDDEN,
        'Cannot access resources from other organizations'
      )
    );
    return;
  }

  next();
}

/**
 * Middleware to verify user belongs to same tenant
 */
export function verifyTenantAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as AuthenticatedRequest).user;
  const requestedTenantId = parseInt(
    req.params.tenantId || (req.query.tenantId as string),
    10
  );

  if (!user) {
    res.status(401).json(
      errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required')
    );
    return;
  }

  // SuperAdmins might need cross-tenant access in future
  // For now, everyone is restricted to their tenant
  if (requestedTenantId && requestedTenantId !== user.tenantId) {
    res.status(403).json(
      errorResponse(
        ErrorCodes.FORBIDDEN,
        'Cannot access resources from other tenants'
      )
    );
    return;
  }

  next();
}

/**
 * Check if user can access resources in a specific organization
 * @param userOrgId - User's organization ID
 * @param targetOrgId - Target organization ID
 * @param userRole - User's role
 */
export function canAccessOrganization(
  userOrgId: number,
  targetOrgId: number,
  userRole: RoleName
): boolean {
  // SuperAdmins can access any organization
  if (userRole === RoleName.SUPER_ADMIN) {
    return true;
  }

  // Others can only access their own organization
  return userOrgId === targetOrgId;
}

export default {
  scopeToOrganization,
  verifyOrganizationAccess,
  verifyTenantAccess,
  canAccessOrganization,
};
