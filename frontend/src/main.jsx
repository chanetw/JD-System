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

// Handle stale Vite chunks after deploy (old tab requests removed hash file like PortalSettings-xxxx.js)
if (typeof window !== 'undefined') {
  const PRELOAD_RELOAD_KEY = 'dj_vite_preload_reload_once';

  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Stale chunk detected, reloading page...', event);
    event?.preventDefault?.();

    if (sessionStorage.getItem(PRELOAD_RELOAD_KEY) === '1') {
      return;
    }

    sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1');
    window.location.reload();
  });

  window.addEventListener('pageshow', () => {
    sessionStorage.removeItem(PRELOAD_RELOAD_KEY);
  });
}

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
