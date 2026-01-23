/**
 * @file index.js
 * @description Re-export ไฟล์จาก Shared Services เพื่อให้ compatible กับ path เดิม
 * 
 * ไฟล์นี้ทำหน้าที่เป็น Entry Point ของ Services Layer
 * ช่วยให้ Feature Modules import ได้ง่าย โดยไม่ต้องรู้ path ภายใน
 */

// Centralized API Service (เลือกใช้ Real DB หรือ Mock ตาม Config)
export { default as api } from './apiService';
export { api as apiService } from './apiService';
