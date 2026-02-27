/**
 * Type definitions for PrismaV1Adapter
 *
 * These types define the return values of the JavaScript adapter
 * to provide type safety in TypeScript code that uses it.
 */

import { RoleName } from '../interfaces/IRole';

// ===========================================
// User Types
// ===========================================

/**
 * User object returned from adapter methods
 */
export interface IV1User {
  id: number;
  tenantId: number;
  organizationId: number | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl?: string | null; // ✅ NEW: User avatar URL
  title: string | null;
  phone: string | null;
  departmentId: number | null;
  roleId: number | null;
  roleName: RoleName | null;
  roles?: (RoleName | string)[]; // ✅ NEW: Array of all user roles for multi-role support
  isActive: boolean;
  lastLoginAt: Date | null;
  registeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User with password hash (for authentication)
 */
export interface IV1UserWithPassword extends IV1User {
  passwordHash: string;
}

/**
 * Create user input
 */
export interface IV1CreateUserInput {
  tenantId: number;
  organizationId?: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  title?: string;
  phone?: string;
  departmentId?: number;
  roleId?: number;
  isActive?: boolean;
}

// ===========================================
// Password Reset Types
// ===========================================

/**
 * Password reset token
 */
export interface IV1PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

/**
 * Result of using a password reset token
 */
export interface IV1UsePasswordResetTokenResult {
  success: boolean;
  user: IV1User;
  message?: string;
}

// ===========================================
// Registration Types
// ===========================================

/**
 * Pending registration
 */
export interface IV1PendingRegistration {
  id: number;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  registeredAt: Date | null;
  createdAt: Date;
}

// ===========================================
// Adapter Class Definition
// ===========================================

declare class PrismaV1Adapter {
  // User Methods
  static findUserByEmail(email: string, tenantId: number): Promise<IV1User | null>;
  static findUserById(userId: number): Promise<IV1User | null>;
  static findUserByIdWithPassword(userId: number, tenantId: number): Promise<IV1UserWithPassword | null>;
  static createUser(data: IV1CreateUserInput): Promise<IV1User>;
  static updateLastLogin(userId: number): Promise<void>;

  // Password Reset Methods
  static invalidatePasswordResetTokens(userId: number): Promise<{ success: boolean; message: string }>;
  static createPasswordResetToken(userId: number, expiresInHours?: number): Promise<IV1PasswordResetToken>;
  static usePasswordResetToken(token: string, newPassword: string): Promise<IV1UsePasswordResetTokenResult>;

  // Registration Methods
  static getPendingRegistrations(tenantId: number): Promise<IV1PendingRegistration[]>;
  static approveRegistration(userId: number, approvedById: number, roleName?: string): Promise<{ user: IV1User; temporaryPassword: string }>;
  static rejectRegistration(userId: number, rejectedById: number, reason?: string): Promise<IV1User>;
}

export default PrismaV1Adapter;
