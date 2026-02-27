/**
 * Authentication Service for V2 Auth System
 *
 * Handles API calls to /api/v2/auth/* endpoints.
 */

import type {
  IApiResponse,
  ILoginRequest,
  ILoginResponse,
  IRegisterRequest,
  IRegisterResponse,
  IUser,
} from '../../../../types/auth.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_V2_AUTH = `${API_URL}/api/v2/auth`;
const API_V2_USERS = `${API_URL}/api/v2/users`;
const API_V2_ADMIN = `${API_URL}/api/v2/admin`;

// Registration request data type
export interface IRegisterRequestData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  departmentId?: number;
  tenantId: number;
}

// Pending user type
export interface IPendingUser {
  id: number;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;

  departmentId: number | null;
  departmentName: string | null;
  status: string;
  registeredAt: string;
  createdAt: string;
}

// Registration counts type
export interface IRegistrationCounts {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  INACTIVE: number;
  total: number;
}

/**
 * Get authorization header with token
 */
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token_v2');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Authentication Service V2
 */
export const authServiceV2 = {
  /**
   * Login with email and password
   */
  async login(credentials: ILoginRequest): Promise<IApiResponse<ILoginResponse>> {
    try {
      const response = await fetch(`${API_V2_AUTH}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      // If response is not ok (4xx, 5xx), the data will contain error info
      // but we still return it so the store can extract the error message
      return data;
    } catch (error) {
      // Network error or JSON parse error
      console.error('[authServiceV2] Login error:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
      };
    }
  },

  /**
   * Register new user
   */
  async register(data: IRegisterRequest): Promise<IApiResponse<IRegisterResponse>> {
    const response = await fetch(`${API_V2_AUTH}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Verify token and get user info
   */
  async verifyToken(token: string): Promise<IApiResponse<IUser>> {
    const response = await fetch(`${API_V2_AUTH}/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },

  /**
   * Forgot password - initiate reset
   */
  async forgotPassword(email: string): Promise<IApiResponse<null>> {
    const response = await fetch(`${API_V2_AUTH}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<IApiResponse<null>> {
    const response = await fetch(`${API_V2_AUTH}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    return response.json();
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<IApiResponse<{ token: string; expiresIn: string }>> {
    const response = await fetch(`${API_V2_AUTH}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return response.json();
  },

  /**
   * Logout
   */
  async logout(): Promise<IApiResponse<null>> {
    const response = await fetch(`${API_V2_AUTH}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return response.json();
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<IApiResponse<IUser>> {
    const response = await fetch(`${API_V2_USERS}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return response.json();
  },

  // =========================================================================
  // REGISTRATION APPROVAL WORKFLOW METHODS
  // =========================================================================

  /**
   * Submit registration request (requires admin approval)
   */
  async registerRequest(data: IRegisterRequestData): Promise<IApiResponse<{ id: number; email: string; status: string }>> {
    const response = await fetch(`${API_V2_AUTH}/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Get pending registration requests (Admin only)
   */
  async getPendingRegistrations(): Promise<IApiResponse<IPendingUser[]>> {
    const response = await fetch(`${API_V2_ADMIN}/pending-registrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return response.json();
  },

  /**
   * Get registration counts by status (Admin only)
   */
  async getRegistrationCounts(): Promise<IApiResponse<IRegistrationCounts>> {
    const response = await fetch(`${API_V2_ADMIN}/registration-counts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return response.json();
  },

  /**
   * Approve a pending registration (Admin only)
   */
  async approveRegistration(userId: number, roleName?: string): Promise<IApiResponse<IPendingUser>> {
    const response = await fetch(`${API_V2_ADMIN}/approve-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ userId, roleName }),
    });
    return response.json();
  },

  /**
   * Reject a pending registration (Admin only)
   */
  async rejectRegistration(userId: number, reason?: string): Promise<IApiResponse<IPendingUser>> {
    const response = await fetch(`${API_V2_ADMIN}/reject-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ userId, reason }),
    });
    return response.json();
  },
};

export default authServiceV2;
