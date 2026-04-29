/**
 * @file apiService.js
 * @description API Service Layer - ใช้ Backend REST API
 *
 * Senior Programmer Notes:
 * - ใช้ Database จริงผ่าน Backend API เป็นหลัก
 * - Mock Data ถูกลบออกแล้ว (v1.0.0-before-senx-cleanup)
 */

import apiDatabase from './apiDatabase';

// ============================================
// API Service - Real Database Only
// ============================================

console.log('[API Service] Mode: BACKEND API');

// Export API Service
export const api = apiDatabase;
export default api;
