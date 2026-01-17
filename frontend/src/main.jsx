/**
 * @file main.jsx
 * @description Entry Point ของ React App
 * 
 * Senior Programmer Notes:
 * - StrictMode = โหมดตรวจสอบปัญหาใน Development
 * - Import CSS ที่นี่เพื่อให้ใช้ได้ทั้งแอป
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Import CSS
import './index.css';

// ============================================
// Render App
// ============================================

// createRoot = วิธีใหม่ของ React 18 ในการ render
// (แทน ReactDOM.render แบบเก่า)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
