/**
 * Authentication Middleware for V2 Auth System
 *
 * Verifies JWT tokens and attaches user info to requests.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/tokenUtils';
import { errorResponse, ErrorCodes } from '../utils/responseUtils';
import { ITokenPayload } from '../interfaces/IAuth';

/**
 * Extended Express Request with user payload
 */
export interface AuthenticatedRequest extends Request {
  user: ITokenPayload;
}

/**
 * Middleware to authenticate JWT token
 * Required for protected routes
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    res.status(401).json(
      errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required')
    );
    return;
  }

  // Verify token
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(403).json(
      errorResponse(ErrorCodes.TOKEN_INVALID, 'Invalid or expired token')
    );
    return;
  }

  // Attach user to request
  (req as AuthenticatedRequest).user = decoded;

  next();
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      (req as AuthenticatedRequest).user = decoded;
    }
  }

  next();
}

/**
 * Get user from request (utility function)
 */
export function getAuthUser(req: Request): ITokenPayload | undefined {
  return (req as AuthenticatedRequest).user;
}

export default {
  authenticateToken,
  optionalAuth,
  getAuthUser,
};
