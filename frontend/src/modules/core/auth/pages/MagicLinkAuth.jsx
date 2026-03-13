/**
 * @file MagicLinkAuth.jsx
 * @description Magic Link Authentication Page
 * 
 * Flow:
 * 1. รับ token จาก URL query parameter
 * 2. ส่ง token ไป verify ที่ backend
 * 3. รับ access token + user data กลับมา
 * 4. บันทึก token ลง localStorage
 * 5. Redirect ไปยัง target URL
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import httpClient from "../../../shared/services/httpClient";
import { useAuthStore } from "../../stores/authStore";

export default function MagicLinkAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('กำลังตรวจสอบ Magic Link...');

  useEffect(() => {
    const verifyMagicLink = async () => {
      try {
        const token = searchParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('ไม่พบ token กรุณาตรวจสอบลิงก์');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Verify magic link with backend
        const response = await httpClient.post('/api/magic-link/verify', { token });

        if (response.data.success) {
          const { user, accessToken, targetUrl, action } = response.data;

          // Save auth data
          setUser(user);
          setToken(accessToken);
          localStorage.setItem('token', accessToken);
          localStorage.setItem('user', JSON.stringify(user));

          setStatus('success');
          setMessage('เข้าสู่ระบบสำเร็จ กำลังนำคุณไปยังหน้าที่ต้องการ...');

          // Redirect to target URL
          setTimeout(() => {
            navigate(targetUrl || '/dashboard', { 
              state: { action, fromMagicLink: true } 
            });
          }, 1500);
        } else {
          throw new Error(response.data.message || 'Verification failed');
        }
      } catch (error) {
        console.error('[MagicLink] Verification error:', error);
        setStatus('error');
        
        // Handle specific error messages
        if (error.response?.data?.error === 'TOKEN_EXPIRED') {
          setMessage('Magic Link หมดอายุแล้ว กรุณาขอลิงก์ใหม่');
        } else if (error.response?.data?.error === 'TOKEN_ALREADY_USED') {
          setMessage('Magic Link นี้ถูกใช้งานไปแล้ว');
        } else if (error.response?.data?.error === 'USER_INACTIVE') {
          setMessage('บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ');
        } else {
          setMessage(error.response?.data?.message || 'ไม่สามารถตรวจสอบ Magic Link ได้');
        }

        // Redirect to login after 5 seconds
        setTimeout(() => navigate('/login'), 5000);
      }
    };

    verifyMagicLink();
  }, [searchParams, navigate, setUser, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            {status === 'verifying' && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full">
                <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {status === 'success' && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'verifying' && 'กำลังตรวจสอบ'}
            {status === 'success' && 'สำเร็จ!'}
            {status === 'error' && 'เกิดข้อผิดพลาด'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {/* Progress Bar */}
          {status === 'verifying' && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          )}

          {/* Error Action */}
          {status === 'error' && (
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              กลับไปหน้า Login
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>🔐 Magic Link Authentication</p>
          <p className="mt-1">เข้าสู่ระบบอัตโนมัติอย่างปลอดภัย</p>
        </div>
      </div>
    </div>
  );
}
