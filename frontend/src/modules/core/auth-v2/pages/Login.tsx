/**
 * Login Page for V2 Auth System (Replaces V1 Styling)
 *
 * Production-ready login with email/password authentication.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStoreV2 } from '../../stores/authStoreV2';
import { getDefaultHomeRoute } from '@shared/utils/permission.utils';
import { consumeSessionUpdateNotice } from '@shared/services/socketService';

const LoginV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated, isLoading, error, clearError } = useAuthStoreV2();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('dj_remember') !== 'false');
  const [showRememberConditions, setShowRememberConditions] = useState(false);

  const getAuthErrorType = (message?: string | null): 'user' | 'password' | 'credential' | null => {
    const normalized = String(message || '').toLowerCase();
    if (normalized.includes('ชื่อผู้ใช้') || normalized.includes('user_not_found')) {
      return 'user';
    }

    if (normalized.includes('รหัสผ่านไม่ถูกต้อง') || normalized.includes('invalid_password')) {
      return 'password';
    }

    if (normalized.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      || normalized.includes('invalid email or password')
      || normalized.includes('invalid credentials')) {
      return 'credential';
    }

    return null;
  };

  const validateForm = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'กรุณากรอกชื่อผู้ใช้ (อีเมล)';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    if (!password) {
      nextErrors.password = 'กรุณากรอกรหัสผ่าน';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Get redirect destination
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = from === '/' ? getDefaultHomeRoute(user) : from;
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  // Clear error on mount
  useEffect(() => {
    clearError();
    const sessionNotice = consumeSessionUpdateNotice();
    const locationState = location.state as { message?: string } | null;
    setLoginError(sessionNotice);
    setLoginNotice(locationState?.message || null);
    setFieldErrors({});
  }, [clearError, location.state]);

  const displayedError = loginError || error || null;
  const authErrorType = getAuthErrorType(displayedError);
  const isEmailErrorActive = Boolean(fieldErrors.email) || authErrorType === 'user' || authErrorType === 'credential';
  const isPasswordErrorActive = Boolean(fieldErrors.password) || authErrorType === 'password' || authErrorType === 'credential';

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginNotice(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      // Save remember-me preference
      localStorage.setItem('dj_remember', rememberMe ? 'true' : 'false');
      sessionStorage.setItem('dj_session_active', '1');

      const user = await login(email.trim(), password);

      // If user must change password (forced change after approval), redirect to that page
      if (user?.mustChangePassword) {
        navigate('/force-change-password', { replace: true });
      } else {
        const destination = from === '/' ? getDefaultHomeRoute(user) : from;
        navigate(destination, { replace: true });
      }
    } catch (err) {
      // Set local error state for guaranteed display
      const msg = err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ';
      setLoginError(msg);

      const errorType = getAuthErrorType(msg);
      if (errorType === 'user') {
        setFieldErrors({
          email: 'ชื่อผู้ใช้ (อีเมล) ไม่ถูกต้อง',
        });
      } else if (errorType === 'password') {
        setFieldErrors({
          password: 'รหัสผ่านไม่ถูกต้อง',
        });
      } else if (errorType === 'credential') {
        setFieldErrors({
          email: 'โปรดตรวจสอบชื่อผู้ใช้ (อีเมล) ของคุณอีกครั้ง',
          password: 'โปรดตรวจสอบรหัสผ่านแล้วลองใหม่อีกครั้ง',
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-rose-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">DJ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">DJ System</h1>
          <p className="mt-2 text-sm text-slate-500">
            SENA Development PCL
          </p>
        </div>

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {loginNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
              {loginNotice}
            </div>
          )}

          {/* Error Message */}
          {displayedError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium">{displayedError}</p>
              {authErrorType === 'user' && (
                <p className="mt-1 text-xs text-red-600">
                  กรุณาตรวจสอบชื่อผู้ใช้ (อีเมล) ให้ถูกต้อง
                </p>
              )}
              {authErrorType === 'password' && (
                <p className="mt-1 text-xs text-red-600">
                  พบชื่อผู้ใช้แล้ว แต่รหัสผ่านไม่ถูกต้อง
                </p>
              )}
              {authErrorType === 'credential' && (
                <p className="mt-1 text-xs text-red-600">
                  โปรดตรวจสอบชื่อผู้ใช้ (อีเมล) และรหัสผ่านของคุณอีกครั้ง หรือกด “ลืมรหัสผ่าน” เพื่อรับรหัสผ่านชั่วคราวทางอีเมล
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อผู้ใช้ (อีเมล)
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
                  setLoginError(null);
                  clearError();
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent bg-white text-slate-800 ${isEmailErrorActive
                  ? 'border-red-300 bg-red-50 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-rose-500'
                }`}
                placeholder="name@sena.co.th"
                aria-invalid={isEmailErrorActive}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">ใช้ชื่อผู้ใช้เป็นอีเมลที่ลงทะเบียนไว้ในระบบ</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(null);
                    clearError();
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent bg-white text-slate-800 pr-12 ${isPasswordErrorActive
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-rose-500'
                  }`}
                  placeholder="••••••••"
                    aria-invalid={isPasswordErrorActive}
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
              {fieldErrors.password ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">หากคุณได้รับรหัสผ่านชั่วคราวทางอีเมล ให้ใช้รหัสดังกล่าวเข้าสู่ระบบก่อน แล้วระบบจะให้เปลี่ยนรหัสผ่านใหม่ทันที</p>
              )}
            </div>
          </div>

          {/* Remember Login */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center min-w-0">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                  จำการเข้าสู่ระบบ
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowRememberConditions((prev) => !prev)}
                className="text-xs font-medium text-rose-700 hover:text-rose-800 underline underline-offset-2"
                aria-expanded={showRememberConditions}
                aria-controls="remember-conditions"
              >
                {showRememberConditions ? 'ซ่อนเงื่อนไข' : 'ดูเงื่อนไข'}
              </button>
            </div>

            {showRememberConditions && (
              <div
                id="remember-conditions"
                className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-slate-700"
              >
                <ul className="list-disc pl-4 space-y-1">
                  <li>ระบบจะจำการเข้าสู่ระบบของอุปกรณ์นี้ ไม่ได้เก็บรหัสผ่านจริง</li>
                  <li>ถ้าไม่เลือก ตัวระบบจะให้เข้าสู่ระบบใหม่เมื่อปิดเบราว์เซอร์</li>
                  <li>หากกดออกจากระบบ หรือเคลียร์ข้อมูลเบราว์เซอร์ ต้องเข้าสู่ระบบใหม่</li>
                  <li>เมื่อโทเค็นหมดอายุ ระบบอาจขอให้ยืนยันตัวตนอีกครั้ง</li>
                </ul>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                กำลังเข้าสู่ระบบ...
              </span>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>

          {/* Links */}
          <div className="flex justify-between text-sm pt-2">
            <Link
              to="/register"
              className="font-medium text-rose-600 hover:text-rose-500"
            >
              สมัครใช้งาน
            </Link>
            <Link
              to="/forgot-password"
              className="text-slate-500 hover:text-slate-700 font-medium"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>


        </form>
      </div>
    </div>
  );
};

export default LoginV2;
