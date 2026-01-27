/**
 * @file NotificationBadge.jsx
 * @description Notification Badge Component
 * 
 * Component นี้แสดง:
 * - จำนวน Unread notifications (HIGH + CRITICAL priority only)
 * - Red badge ถ้ามี Unread
 * - สามารถคลิกเพื่อดูรายการ Notifications
 */

import React from 'react';
import { useNotifications } from '@shared/hooks';

/**
 * @component NotificationBadge
 * @description แสดง Unread notification count badge
 * 
 * Props:
 * @param {Function} onClick - Callback เมื่อคลิก Badge
 * @param {string} className - Additional CSS classes
 * 
 * @returns {JSX.Element} Badge component
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * <NotificationBadge onClick={() => setShowNotifications(true)} />
 */
const NotificationBadge = ({ onClick, className = '' }) => {
  // =====================================
  // ขั้นตอนที่ 1: ดึงข้อมูล Notifications
  // =====================================
  const { unreadHighPriority } = useNotifications();

  // =====================================
  // ขั้นตอนที่ 2: Render Badge
  // =====================================

  // ถ้า unreadCount = 0 ให้ไม่แสดง Badge
  if (unreadHighPriority === 0) {
    return (
      <button
        onClick={onClick}
        className={`
          relative p-2 text-gray-600 hover:text-gray-900
          transition-colors duration-200
          ${className}
        `}
        aria-label="Notifications"
        title="No new notifications"
      >
        {/* Bell Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
      </button>
    );
  }

  // ถ้ามี Unread notifications ให้แสดง Badge พร้อม count
  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 text-rose-600 hover:text-rose-700
        transition-colors duration-200
        ${className}
      `}
      aria-label={`${unreadHighPriority} unread notifications`}
      title={`${unreadHighPriority} unread notifications`}
    >
      {/* Bell Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-6 h-6"
      >
        <path
          d="M5.85 3.5a.75.75 0 00-1.117-1.007A8.25 8.25 0 1012 22.5a8.243 8.243 0 007.267-4.007.75.75 0 10-1.116 1.007A6.75 6.75 0 1112 21a6.751 6.751 0 01-6.15-3.5z"
        />
      </svg>

      {/* Badge - แสดง Count */}
      <span
        className={`
          absolute top-0 right-0
          w-5 h-5
          bg-red-500 text-white
          rounded-full
          text-xs font-bold
          flex items-center justify-center
          animate-pulse
        `}
      >
        {unreadHighPriority > 9 ? '9+' : unreadHighPriority}
      </span>
    </button>
  );
};

export default NotificationBadge;
