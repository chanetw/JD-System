
/**
 * @file apiService.js
 * @description API Service Layer - ตัวกลางระหว่าง UI และ API (Supabase Integration Updated)
 * 
 * Senior Programmer Notes:
 * - ปัจจุบัน: ใช้ Database จริง (Supabase) เป็นหลัก
 * - สามารถสลับกลับเป็น Mock ได้ (เผื่อ Dev Offline)
 */

import { mockApiService as mockApi } from './mockApi';
import apiDatabase from './apiDatabase';

// ============================================
// Configuration
// ============================================

/**
 * TOGGLE THIS FLAG
 * true  = ใช้ Supabase Database จริง 🟢
 * false = ใช้ Local Mock Data 🟡
 */
const USE_REAL_DB = true;
// const USE_REAL_DB = false; 

// ============================================
// API Service Selection
// ============================================

console.log(`[API Service] Selected Mode: ${USE_REAL_DB ? 'REAL DB (Supabase)' : 'MOCK DATA'}`);

// เลือก Service ตาม Config
export const api = USE_REAL_DB ? apiDatabase : mockApi;

// Export default เพื่อความสะดวกในการ import
export default api;
