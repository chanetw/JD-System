/**
 * Authentication Types for V2 Auth System
 */

// Role names enum
export type RoleName = 'SuperAdmin' | 'OrgAdmin' | 'TeamLead' | 'Member';

// Permission structure
export interface IResourcePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface IJobPermissions extends IResourcePermissions {
  approve: boolean;
}

export interface IReportPermissions {
  view: boolean;
  export: boolean;
}

export interface ISettingsPermissions {
  manage: boolean;
}

export interface IPermissions {
  users: IResourcePermissions;
  organizations: IResourcePermissions;
  jobs: IJobPermissions;
  reports: IReportPermissions;
  settings: ISettingsPermissions;
}

// Role interface
export interface IRole {
  id: number;
  name: RoleName;
  displayName: string;
  permissions: IPermissions;
  description?: string;
}

// Organization interface
export interface IOrganization {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// User interface (response from API)
export interface IUser {
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
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  role?: IRole;
  organization?: IOrganization;
}

// JWT Token Payload
export interface ITokenPayload {
  sub: string;
  userId: number;
  tenantId: number;
  organizationId: number;
  email: string;
  roleId: number;
  role: RoleName;
  iat?: number;
  exp?: number;
}

// Login request
export interface ILoginRequest {
  email: string;
  password: string;
  tenantId: number;
}

// Login response
export interface ILoginResponse {
  user: IUser;
  token: string;
  expiresIn: string;
}

// Register request
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
  user: IUser;
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

// API Response wrapper
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
}

// Paginated response
export interface IPaginatedResponse<T = unknown> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
