/**
 * Authentication Interfaces for V2 Auth System
 */

import { IUserResponse } from './IUser';
import { RoleName } from './IRole';

// JWT Token Payload
export interface ITokenPayload {
  sub: string;           // UUID for token identification
  userId: number;
  tenantId: number;
  organizationId: number;
  email: string;
  roleId: number;
  role: RoleName;
  iat?: number;          // Issued at (added by JWT)
  exp?: number;          // Expiration (added by JWT)
}

// Login request payload
export interface ILoginRequest {
  email: string;
  password: string;
  tenantId: number;
}

// Login response
export interface ILoginResponse {
  user: IUserResponse;
  token: string;
  expiresIn: string;
}

// Register request payload
export interface IRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId: number;
  tenantId?: number;
  roleId?: number;
}

// Register response
export interface IRegisterResponse {
  user: IUserResponse;
  token: string;
}

// Forgot password request
export interface IForgotPasswordRequest {
  email: string;
}

// Reset password request
export interface IResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Verify token response
export interface IVerifyTokenResponse {
  user: IUserResponse;
  valid: boolean;
}

// Refresh token request
export interface IRefreshTokenRequest {
  refreshToken: string;
}

// Refresh token response
export interface IRefreshTokenResponse {
  token: string;
  expiresIn: string;
}

// Password reset token attributes
export interface IPasswordResetTokenAttributes {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

// API Response wrapper
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
}

// Paginated API Response
export interface IPaginatedApiResponse<T = unknown> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
