/**
 * Response Utility Functions for V2 Auth System
 *
 * Standardized API response formatting.
 */

import { IApiResponse, IPaginatedApiResponse } from '../interfaces/IAuth';

/**
 * Create a success response
 */
export const successResponse = <T>(
  data: T,
  message?: string
): IApiResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

/**
 * Create an error response
 */
export const errorResponse = (
  errorCode: string,
  message: string
): IApiResponse => {
  return {
    success: false,
    error: message,
    errorCode,
  };
};

/**
 * Create a paginated response
 */
export const paginatedResponse = <T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): IPaginatedApiResponse<T> => {
  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
};

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',

  // Password reset errors
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  EXPIRED_RESET_TOKEN: 'EXPIRED_RESET_TOKEN',

  // User state errors
  USER_INACTIVE: 'USER_INACTIVE',
  SELF_DELETE: 'SELF_DELETE',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
