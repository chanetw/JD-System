/**
 * Registration Service for V2 Auth System
 *
 * Handles pending registration requests for admin approval.
 */

import type {
  IApiResponse,
  IPaginatedResponse,
} from '../../../../types/auth.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_V2_ADMIN = `${API_URL}/api/v2/admin`;

/**
 * Get authorization header with token
 */
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token_v2');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Registration Request interface
export interface IRegistrationRequest {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
  reviewedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewedAt?: string;
  rejectionReason?: string;
}

// List filters
export interface IRegistrationFilters {
  status?: string;
  organizationId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

// Approve payload
export interface IApprovePayload {
  roleId?: number;
  notes?: string;
}

// Reject payload
export interface IRejectPayload {
  reason?: string;
}

/**
 * Registration Service V2 for Admin
 */
export const registrationServiceV2 = {
  /**
   * List pending registration requests
   */
  async listRegistrationRequests(
    filters: IRegistrationFilters = {}
  ): Promise<IPaginatedResponse<IRegistrationRequest>> {
    const queryParams = new URLSearchParams();

    if (filters.status) queryParams.append('status', filters.status);
    if (filters.organizationId) queryParams.append('organizationId', String(filters.organizationId));
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', String(filters.page));
    if (filters.limit) queryParams.append('limit', String(filters.limit));

    const response = await fetch(
      `${API_V2_ADMIN}/registration-requests?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      }
    );

    return response.json();
  },

  /**
   * Get registration request by ID
   */
  async getRegistrationRequest(id: number): Promise<IApiResponse<IRegistrationRequest>> {
    const response = await fetch(`${API_V2_ADMIN}/registration-requests/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    return response.json();
  },

  /**
   * Approve registration request
   */
  async approveRegistration(
    id: number,
    payload: IApprovePayload = {}
  ): Promise<IApiResponse<{ user: any; registrationRequest: IRegistrationRequest }>> {
    const response = await fetch(`${API_V2_ADMIN}/registration-requests/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  },

  /**
   * Reject registration request
   */
  async rejectRegistration(
    id: number,
    payload: IRejectPayload
  ): Promise<IApiResponse<{ registrationRequest: IRegistrationRequest }>> {
    const response = await fetch(`${API_V2_ADMIN}/registration-requests/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  },

  /**
   * Get registration statistics
   */
  async getStatistics(): Promise<
    IApiResponse<{
      pending: number;
      approved: number;
      rejected: number;
      total: number;
    }>
  > {
    const response = await fetch(`${API_V2_ADMIN}/registration-requests/statistics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    return response.json();
  },
};

export default registrationServiceV2;
