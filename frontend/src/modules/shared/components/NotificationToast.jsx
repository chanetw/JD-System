/**
 * @file NotificationToast.jsx
 * @description Notification Toast Component
 * 
 * Component นี้แสดง:
 * - Toast message สำหรับ Notifications ใหม่
 * - Auto-dismiss หลัง 5-10 วินาที
 * - Color-coded by priority (RED = CRITICAL, ORANGE = HIGH)
 * - สามารถปิดได้ด้วยปุ่ม X
 */

import React, { useState, useEffect } from 'react';

/**
 * @constant TOAST_DURATION
 * @description เวลา (ms) ที่ Toast จะแสดง ก่อนปิดอัตโนมัติ
 */
const TOAST_DURATION = 6000; // 6 seconds

/**
 * @constant PRIORITY_COLORS
 * @description สีของ Toast ตามระดับ Priority
 */
const PRIORITY_COLORS = {
  CRITICAL: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    title: 'text-red-900',
    message: 'text-red-700',
    icon: 'text-red-600',
    button: 'hover:bg-red-100'
  },
  HIGH: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    title: 'text-orange-900',
    message: 'text-orange-700',
    icon: 'text-orange-600',
    button: 'hover:bg-orange-100'
  },
  MEDIUM: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    title: 'text-blue-900',
    message: 'text-blue-700',
    icon: 'text-blue-600',
    button: 'hover:bg-blue-100'
  },
  LOW: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    title: 'text-gray-900',
    message: 'text-gray-700',
    icon: 'text-gray-600',
    button: 'hover:bg-gray-100'
  }
};

/**
 * @component NotificationToast
 * @description แสดง Toast notification
 * 
 * Props:
 * @param {Object} notification - ข้อมูล Notification
 * @param {number} notification.id - ID ของ Notification
 * @param {string} notification.title - ชื่อ Notification
 * @param {string} notification.message - ข้อความ Notification
 * @param {string} notification.priority - Priority level (CRITICAL, HIGH, MEDIUM, LOW)
 * @param {Object} notification.data - ข้อมูลเพิ่มเติม (เช่น jobId, djId)
 * 
 * @param {Function} onClose - Callback เมื่อ Toast ปิด
 * @param {Function} onClick - Callback เมื่อคลิก Toast (navigate to job detail)
 * 
 * @returns {JSX.Element|null} Toast component หรือ null ถ้าปิดแล้ว
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * <NotificationToast
 *   notification={{
 *     id: 1,
 *     title: 'DJ-2026-0005 assigned',
 *     message: 'Banner Design - Q1 Campaign',
 *     priority: 'HIGH',
 *     data: { jobId: 5, djId: 'DJ-2026-0005' }
 *   }}
 *   onClose={() => handleToastClose()}
 *   onClick={() => navigate(`/jobs/5`)}
 * />
 */
const NotificationToast = ({ notification, onClose, onClick }) => {
  // =====================================
  // ขั้นตอนที่ 1: ตั้งค่า State
  // =====================================

  /**
   * @state isVisible
   * แสดงว่า Toast มองเห็นได้หรือไม่
   * (ใช้สำหรับ animation fade-out)
   */
  const [isVisible, setIsVisible] = useState(true);

  // =====================================
  // ขั้นตอนที่ 2: Auto-dismiss ตอน Mount
  // =====================================
  useEffect(() => {
    // ตั้ง Timer เพื่อปิด Toast อัตโนมัติ
    const timer = setTimeout(() => {
      // Fade out animation
      setIsVisible(false);

      // เรียก onClose callback หลัง animation
      setTimeout(() => {
        onClose?.();
      }, 300); // รอให้ animation เสร็จ (0.3s)
    }, TOAST_DURATION);

    // Cleanup: ยกเลิก Timer ถ้า Component Unmount
    return () => clearTimeout(timer);
  }, [onClose]);

  // =====================================
  // ขั้นตอนที่ 3: ดึงสีตามระดับ Priority
  // =====================================
  const colors = PRIORITY_COLORS[notification.priority] || PRIORITY_COLORS.MEDIUM;

  // =====================================
  // ขั้นตอนที่ 4: หลีกเลี่ยง Unread Icon ที่เหมาะสม
  // =====================================
  const getIcon = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M12 2a10 10 0 100 20 10 10 0 000-20zM8.263 7.263a1 1 0 111.414-1.414L12 10.586l2.323-2.323a1 1 0 111.414 1.414L13.414 12l2.323 2.323a1 1 0 11-1.414 1.414L12 13.414l-2.323 2.323a1 1 0 11-1.414-1.414L10.586 12 8.263 9.677z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'HIGH':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M9.401 3.003c1.492-1.666 4.106-1.666 5.598 0l7.355 8.179c1.47 1.638 1.235 4.108-.461 5.449a3.5 3.5 0 01-2.624.987H4.131a3.5 3.5 0 01-2.624-.987c-1.696-1.34-1.931-3.811-.461-5.449L9.401 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-6.215 5.034-11.25 11.25-11.25s11.25 5.035 11.25 11.25S19.715 23.25 12 23.25 2.25 18.215 2.25 12zm9-4.5a.75.75 0 01.75.75v4.94l1.72-1.72a.75.75 0 111.06 1.061l-2.5 2.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 111.06-1.061l1.72 1.72V8.25a.75.75 0 01.75-.75z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  // =====================================
  // ขั้นตอนที่ 5: Render Toast
  // =====================================
  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        w-96 max-w-[calc(100vw-2rem)]
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}
      `}
    >
      {/* Toast Container */}
      <div
        onClick={onClick}
        className={`
          ${colors.bg} ${colors.border}
          border rounded-lg shadow-lg
          p-4 flex items-start gap-3
          cursor-pointer
          hover:shadow-xl transition-shadow duration-200
        `}
      >
        {/* Icon */}
        <div className={`flex-shrink-0 ${colors.icon} mt-0.5`}>
          {getIcon(notification.priority)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className={`${colors.title} font-semibold text-sm truncate`}>
            {notification.title}
          </h3>

          {/* Message */}
          {notification.message && (
            <p className={`${colors.message} text-sm mt-1 line-clamp-2`}>
              {notification.message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className={`
            flex-shrink-0 p-1.5 rounded
            ${colors.button}
            text-gray-400 hover:text-gray-600
            transition-colors duration-200
          `}
          aria-label="Close notification"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
