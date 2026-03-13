/**
 * Forgot Password Page for V2 Auth System
 *
 * Email-based password reset initiation.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStoreV2 } from '../../stores/authStoreV2';

const ForgotPasswordV2: React.FC = () => {
  const { forgotPassword, isLoading, error, clearError } = useAuthStoreV2();

  // Form state
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Clear error on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      return;
    }

    try {
      await forgotPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Forgot password failed:', err);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-white">ตรวจสอบอีเมลของคุณ</h2>
            <p className="mt-2 text-base text-white/80">
              หากมีบัญชีใช้งานที่ตรงกับ <span className="font-medium text-white">{email}</span> ระบบได้ส่งลิงก์สำหรับเปลี่ยนรหัสผ่านไปเรียบร้อยแล้ว
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg space-y-4">
            <p className="text-base text-gray-700 text-center">
              ไม่ได้รับอีเมล? โปรดตรวจสอบกล่องข้อความขยะ (Spam) หรือลองอีกครั้ง
            </p>

            <button
              onClick={() => setIsSubmitted(false)}
              className="w-full py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
            >
              ลองอีกครั้ง
            </button>

            <Link
              to="/"
              className="block w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-center text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
            >
              กลับสู่หน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">DJ System</h1>
          <h2 className="mt-4 text-2xl font-semibold text-white">ลืมรหัสผ่าน</h2>
          <p className="mt-2 text-base text-white/80">
            กรุณากรอกอีเมลของคุณ แล้วเราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
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
              onChange={(e) => setEmail(e.target.value)}
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
              'ส่งลิงก์สำหรับเปลี่ยนรหัสผ่าน'
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center text-sm">
            <Link
              to="/"
              className="font-medium text-rose-600 hover:text-indigo-500"
            >
              กลับสู่หน้าเข้าสู่ระบบ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordV2;
