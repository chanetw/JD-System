/**
 * Reset Password Page for V2 Auth System
 *
 * Token-based password reset form.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStoreV2 } from '../../stores/authStoreV2';

const ResetPasswordV2: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { resetPassword, isLoading, error, clearError } = useAuthStoreV2();

  // Get token from URL
  const token = searchParams.get('token');

  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Clear error on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Validate form
  const validateForm = (): boolean => {
    if (!newPassword || !confirmPassword) {
      setValidationError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return false;
    }

    if (newPassword.length < 8) {
      setValidationError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return false;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setValidationError('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
      return false;
    }

    if (!/[a-z]/.test(newPassword)) {
      setValidationError('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
      return false;
    }

    if (!/[0-9]/.test(newPassword)) {
      setValidationError('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setValidationError('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรืออาจหมดอายุแล้ว');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      console.log('เริ่มทำการส่งคำขอเปลี่ยนรหัสผ่านสำหรับ token:', token.substring(0, 10) + '...');
      await resetPassword(token, newPassword);
      console.log('เปลี่ยนรหัสผ่านสำเร็จ!');
      setIsSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        console.log('กำลัง Redirect ไปหน้าหลัก...');
        window.location.href = '/';
      }, 2000);
      
    } catch (err) {
      console.error('ตั้งรหัสผ่านใหม่ล้มเหลว:', err);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (): { strength: number; label: string; color: string } => {
    const password = newPassword;
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'อ่อน', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'ปานกลาง', color: 'bg-yellow-500' };
    return { strength, label: 'แข็งแรง', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-white">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h2>
            <p className="mt-2 text-sm text-white/80">
              ลิงก์สำหรับเปลี่ยนรหัสผ่านนี้ไม่สามารถใช้งานได้หรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่อีกครั้ง
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <Link
              to="/forgot-password"
              className="block w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-center text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
            >
              ขอลิงก์รีเซ็ตรหัสผ่านใหม่
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state (Modal style)
  if (isSuccess) {
    console.log('Rendering Success Modal');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Success Modal */}
        <div className="max-w-md w-full relative z-10">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">เปลี่ยนรหัสผ่านสำเร็จ!</h2>
            <p className="text-base text-gray-600 mb-8">
              รหัสผ่านใหม่ของคุณถูกบันทึกเรียบร้อยแล้ว<br/>
              ระบบกำลังพากลับไปหน้าเข้าสู่ระบบ...
            </p>

            <div className="flex justify-center mb-6">
               <svg className="animate-spin h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>

            <button
              onClick={() => { window.location.href = '/'; }}
              className="block w-full py-3 px-4 border border-transparent text-base font-medium rounded-xl text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors shadow-lg"
            >
              คลิกที่นี่หากระบบไม่เปลี่ยนหน้าอัตโนมัติ
            </button>
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
          <h2 className="mt-4 text-2xl font-semibold text-white">ตั้งรหัสผ่านใหม่</h2>
          <p className="mt-2 text-sm text-white/80">
            โปรดตั้งรหัสผ่านใหม่ของคุณด้านล่าง
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          {/* Error Message */}
          {(error || validationError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {validationError || error}
            </div>
          )}

          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-base font-medium text-gray-700 mb-1">
                รหัสผ่านใหม่
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setValidationError(null);
                  }}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-indigo-500 sm:text-sm pr-12"
                  placeholder="กรอกรหัสผ่านใหม่"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{passwordStrength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-base font-medium text-gray-700 mb-1">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setValidationError(null);
                }}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-indigo-500 sm:text-sm"
                placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
              />
            </div>
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
                กำลังบันทึก...
              </span>
            ) : (
              'ตั้งรหัสผ่านใหม่'
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

export default ResetPasswordV2;
