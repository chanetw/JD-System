/**
 * JWT Token Utility Functions for V2 Auth System
 *
 * Handles JWT token generation and verification.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ITokenPayload } from '../interfaces/IAuth';
import { RoleName } from '../interfaces/IRole';

// Configuration from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for a user
 */
export const generateToken = (
  userId: number,
  tenantId: number,
  organizationId: number,
  email: string,
  roleId: number,
  role: RoleName
): string => {
  const payload: ITokenPayload = {
    sub: crypto.randomUUID(),
    userId,
    tenantId,
    organizationId,
    email,
    roleId,
    role,
  };

  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns The decoded token payload or null if invalid
 */
export const verifyToken = (token: string): ITokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ITokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Decode a token without verification (for expired token handling)
 * @param token - The JWT token to decode
 * @returns The decoded token payload or null if malformed
 */
export const decodeToken = (token: string): ITokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as ITokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Check if a token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (): string => {
  return JWT_EXPIRES_IN;
};

/**
 * Generate a secure random string (for reset tokens, etc.)
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};
