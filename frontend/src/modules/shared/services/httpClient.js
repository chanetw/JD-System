/**
 * @file httpClient.js
 * @description HTTP Client for Backend REST API calls
 *
 * Uses axios for HTTP requests with automatic:
 * - Authorization header injection
 * - Base URL configuration
 * - Error handling
 */

import axios from 'axios';

const SESSION_UPDATE_NOTICE_KEY = 'dj_session_update_notice';

let hasTriggeredAuthRedirect = false;

const clearStoredAuth = () => {
  localStorage.removeItem('auth_token_v2');
  localStorage.removeItem('token');
  localStorage.removeItem('dj-auth-v2-storage');
};

const invalidateSessionAndRedirect = (message) => {
  if (hasTriggeredAuthRedirect) {
    return;
  }

  hasTriggeredAuthRedirect = true;
  clearStoredAuth();

  if (message) {
    localStorage.setItem(SESSION_UPDATE_NOTICE_KEY, message);
  }

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const httpClient = axios.create({
  baseURL: API_URL,
  timeout: 60000, // ⚡ Increased from 15s to 60s for heavy queries (approver role)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Add authorization token
httpClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (Support both V1 and V2)
    const tokenV1 = localStorage.getItem('token');
    const tokenV2 = localStorage.getItem('auth_token_v2');

    // If both tokens exist but differ, prefer V2 and clear stale V1 token
    if (tokenV1 && tokenV2 && tokenV1 !== tokenV2) {
      localStorage.removeItem('token');
    }

    // Prioritize V2 token as it's the modern auth system
    const token = tokenV2 || tokenV1;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors
httpClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error;

    // Handle 401 Unauthorized
    if (status === 401) {
      console.warn('[HTTP Client] Unauthorized - token may be expired');
      invalidateSessionAndRedirect('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    // Handle 403 Forbidden
    if (status === 403) {
      const isInvalidSession = ['TOKEN_INVALID', 'INVALID_TOKEN_PAYLOAD', 'USER_NOT_FOUND'].includes(errorCode);

      if (isInvalidSession) {
        console.warn('[HTTP Client] Forbidden - invalid session');
        invalidateSessionAndRedirect('เซสชันไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      } else {
        console.warn('[HTTP Client] Forbidden - insufficient permissions');
      }
    }

    // Handle 500 Internal Server Error
    if (status === 500) {
      console.error('[HTTP Client] Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default httpClient;
