/**
 * @file apiService.js
 * @description API Service Layer - ใช้ Supabase Database เท่านั้น
 *
 * Senior Programmer Notes:
 * - ใช้ Database จริง (Supabase) เป็นหลัก
 * - Mock Data ถูกลบออกแล้ว (v1.0.0-before-senx-cleanup)
 */

import apiDatabase from './apiDatabase';

// ============================================
// API Service - Real Database Only
// ============================================

console.log('[API Service] Mode: REAL DB (Supabase)');

// Export API Service
export const api = apiDatabase;
export default api;
