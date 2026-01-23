/**
 * @file index.js
 * @description Re-export ไฟล์จาก Core Stores เพื่อให้ compatible กับ path เดิม
 * 
 * ไฟล์นี้ทำหน้าที่เป็น Entry Point ของ Global State (Zustand Stores)
 */

// Authentication Store (Global State สำหรับ User Info)
export { useAuthStore } from './authStore';
