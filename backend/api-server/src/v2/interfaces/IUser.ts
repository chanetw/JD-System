/**
 * User Interfaces for V2 Auth System
 */

import { IRole, RoleName } from './IRole';
import { IOrganization } from './IOrganization';

// User attributes stored in database
export interface IUserAttributes {
  id: number;
  tenantId: number;
  organizationId: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleId: number;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Attributes required for user creation (without auto-generated fields)
export interface IUserCreationAttributes {
  tenantId: number;
  organizationId: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleId: number;
  isActive?: boolean;
}

// User with related entities loaded
export interface IUserWithRelations extends IUserAttributes {
  role?: IRole;
  organization?: IOrganization;
}

// User response (without password hash)
export interface IUserResponse {
  id: number;
  tenantId: number;
  organizationId: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleId: number;
  roleName: RoleName;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  role?: IRole;
  organization?: Omit<IOrganization, 'settings'>;
}

// Request payload for creating a user
export interface IUserCreateRequest {
  tenantId?: number;
  organizationId: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: number;
}

// Request payload for updating a user
export interface IUserUpdateRequest {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleId?: number;
  isActive?: boolean;
}

// User list query filters
export interface IUserListFilters {
  tenantId: number;
  organizationId?: number | string;
  search?: string;
  roleId?: number;
  isActive?: boolean;
}

// Pagination options
export interface IPaginationOptions {
  page: number;
  limit: number;
}

// Paginated response
export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
