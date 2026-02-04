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

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const httpClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
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
    const token = tokenV1 || tokenV2;

    // 🔍 DEBUG: Log token source for troubleshooting
    console.log('[httpClient] 🔐 Token Check:', {
      hasV1Token: !!tokenV1,
      hasV2Token: !!tokenV2,
      usingToken: token ? `${token.substring(0, 20)}...` : 'NONE',
      requestUrl: config.url
    });

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
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn('[HTTP Client] Unauthorized - token may be expired');
      // Could trigger logout here if needed
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('[HTTP Client] Forbidden - insufficient permissions');
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('[HTTP Client] Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default httpClient;
