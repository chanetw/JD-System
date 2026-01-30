/**
 * Registration Request Interfaces for V2 Auth System
 */

// Registration Request Status
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

// Registration Request attributes
export interface IRegistrationRequest {
  id: number;
  tenantId: number;
  organizationId: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;

  // Status
  status: RegistrationStatus;

  // Email confirmation
  confirmationToken?: string;
  confirmationTokenExpiresAt?: Date;
  confirmedAt?: Date;

  // Admin review
  reviewedById?: number;
  reviewedAt?: Date;
  rejectionReason?: string;

  // Audit
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create registration request payload
export interface IRegistrationRequestCreate {
  tenantId: number;
  organizationId: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  ipAddress?: string;
  userAgent?: string;
}

// Update registration request payload
export interface IRegistrationRequestUpdate {
  status?: RegistrationStatus;
  reviewedById?: number;
  reviewedAt?: Date;
  rejectionReason?: string;
}

// List filters
export interface IRegistrationRequestFilters {
  tenantId: number;
  organizationId?: number;
  status?: RegistrationStatus;
  search?: string;
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

// Approve request payload
export interface IApproveRegistrationRequest {
  roleId?: number;
  notes?: string;
}

// Reject request payload
export interface IRejectRegistrationRequest {
  reason?: string;
}

// Registration request response
export interface IRegistrationRequestResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  status: RegistrationStatus;
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
}

// Admin registration request response
export interface IAdminRegistrationRequestResponse extends IRegistrationRequestResponse {
  reviewedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewedAt?: string;
  rejectionReason?: string;
}

// Registration statistics
export interface IRegistrationStatistics {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  byOrganization?: Array<{
    organizationId: number;
    organizationName: string;
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }>;
}

// Email notification payload
export interface IRegistrationEmailPayload {
  registrationRequestId: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  status: RegistrationStatus;
  approvalUrl?: string;
  rejectionUrl?: string;
  rejectionReason?: string;
  adminEmail?: string;
}
