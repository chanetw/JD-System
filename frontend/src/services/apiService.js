/**
 * @file apiService.js
 * @description API Service Layer - ตัวกลางระหว่าง UI และ API
 * 
 * Senior Programmer Notes:
 * - ไฟล์นี้ทำหน้าที่เป็น Abstraction Layer
 * - สามารถสลับระหว่าง Mock API และ Real API ได้
 * - เพียงแค่เปลี่ยน USE_MOCK เป็น false เมื่อต้องการใช้ Backend จริง
 */

import { mockApiService } from './mockApi';
// import { realApiService } from './realApi'; // เปิดใช้เมื่อมี Backend จริง

// ============================================
// Configuration - การตั้งค่า
// ============================================

/**
 * @constant USE_MOCK
 * @description กำหนดว่าจะใช้ Mock API หรือ Real API
 * 
 * - true = Demo Mode (ใช้ localStorage)
 * - false = Production Mode (ใช้ Backend จริง)
 * 
 * เมื่อต้องการเปลี่ยนเป็น Production เพียงแค่:
 * 1. เปลี่ยน USE_MOCK = false
 * 2. สร้าง realApi.js ที่มี function เหมือนกับ mockApi.js
 */
const USE_MOCK = true;

// ============================================
// API Service Export
// ============================================

/**
 * @constant api
 * @description API Service ที่ใช้งานจริง
 * 
 * เลือกระหว่าง:
 * - mockApiService: สำหรับ Demo (ใช้ localStorage)
 * - realApiService: สำหรับ Production (เรียก Backend)
 */
export const api = USE_MOCK ? mockApiService : mockApiService; // เปลี่ยนเป็น realApiService เมื่อพร้อม

export default api;
