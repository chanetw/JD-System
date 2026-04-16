/**
 * Forgot Password Page for V2 Auth System
 *
 * Email-based password reset initiation.
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '../../stores/authStoreV2';

const ForgotPasswordV2: React.FC = () => {
  const { forgotPassword, logout, isLoading, error, clearError } = useAuthStoreV2();
  const navigate = useNavigate();
  const location = useLocation();

  // Form state
  const [email, setEmail] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const locationMessage = (location.state as { message?: string } | null)?.message;

  // Clear error on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  const getMaskedEmail = (value: string) => {
    const normalized = String(value || '').trim();
    if (!normalized.includes('@')) return normalized;

    const [localPart, domain] = normalized.split('@');
    if (!localPart || !domain) return normalized;

    if (localPart.length <= 2) {
      return `${localPart[0] || '*'}*@${domain}`;
    }

    return `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
  };

  const sendForgotPasswordRequest = async () => {
    if (!email) return;

    try {
      await forgotPassword(email);
      setShowConfirmModal(false);
      logout();
      navigate('/login', {
        replace: true,
        state: {
          forgotPasswordSuccess: true,
          message: 'หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งรหัสผ่านชั่วคราวไปให้แล้ว กรุณาใช้ชื่อผู้ใช้ (อีเมล) เดิมและรหัสดังกล่าวเพื่อเข้าสู่ระบบ'
        }
      });
    } catch (err) {
      console.error('Forgot password failed:', err);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      return;
    }

    setShowConfirmModal(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">DJ System</h1>
          <h2 className="mt-4 text-2xl font-semibold text-white">ลืมรหัสผ่าน</h2>
          <p className="mt-2 text-base text-white/80">
            กรุณากรอกอีเมลของคุณ แล้วระบบจะส่งรหัสผ่านชั่วคราวไปให้เพื่อใช้เข้าสู่ระบบและเปลี่ยนรหัสผ่านใหม่
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          {locationMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              {locationMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1">
              อีเมล
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-indigo-500 sm:text-sm"
              placeholder="กรอกอีเมลของคุณ"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                กำลังส่ง...
              </span>
            ) : (
              'ส่งรหัสผ่านชั่วคราว'
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center text-sm">
            <Link
              to="/login"
              className="font-medium text-rose-600 hover:text-indigo-500"
            >
              กลับสู่หน้าเข้าสู่ระบบ
            </Link>
          </div>
        </form>

        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-slate-100">
                <h3 className="text-lg font-semibold text-gray-900">ยืนยันการส่งคำขอตั้งรหัสผ่านใหม่</h3>
                <p className="mt-1 text-sm text-gray-700">
                  กรุณาตรวจสอบข้อมูลก่อนดำเนินการ
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <p className="text-sm leading-6 text-gray-700">
                  ระบบจะรีเซ็ตรหัสผ่านของบัญชีนี้เป็นรหัสผ่านชั่วคราว และส่งไปยังอีเมลที่ท่านระบุ หากข้อมูลถูกต้องตามเงื่อนไขของระบบ
                </p>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  เมื่อได้รับอีเมลแล้ว ให้ใช้รหัสผ่านชั่วคราวเข้าสู่ระบบ จากนั้นระบบจะบังคับให้เปลี่ยนรหัสผ่านใหม่ทันที
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">อีเมลที่ระบุ</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{getMaskedEmail(email)}</p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="button"
                    onClick={sendForgotPasswordRequest}
                    disabled={isLoading}
                    className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-center text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'กำลังดำเนินการ...' : 'ยืนยันการส่งคำขอ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordV2;
