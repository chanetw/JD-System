/**
 * @file Badge.jsx
 * @description ป้ายกำกับสถานะ (Status Badge)
 * 
 * การใช้งาน:
 * - <Badge status="pending_approval" /> แสดงสถานะตาม key
 * - <Badge variant="error">ข้อความ</Badge> แสดง Badge แบบกำหนดเองพร้อม children
 * - <Badge status="approved" isApprovalStatus={true} /> แสดงสถานะอนุมัติ (แยกจากสถานะงาน)
 * 
 * @param {string} [status] - รหัสสถานะที่จะแสดง (e.g., 'pending_approval', 'approved')
 * @param {string} [variant] - รูปแบบสีพิเศษ (e.g., 'error', 'indigo') มีความสำคัญมากกว่า status
 * @param {number} [count] - จำนวนที่จะแสดงเพิ่มเติม (e.g., +5)
 * @param {string} [className] - คลาส Tailwind เพิ่มเติม
 * @param {boolean} [isApprovalStatus] - ใช้สำหรับ Column "สถานะอนุมัติ" เพื่อแยกคำศัพท์กับ "สถานะงาน"
 * @param {React.ReactNode} [children] - ข้อความกำหนดเอง (ถ้ามีจะใช้แทน status text)
 */

import React from 'react';
import {
    WORK_STATUS_LABEL,
    APPROVAL_STATUS_LABEL,
    STATUS_COLOR,
    APPROVAL_STATUS_COLOR,
} from '../constants/jobStatus';

export default function Badge({ status, variant, count, className = '', isApprovalStatus = false, children }) {
    // 1. Text Mapping - แปลงรหัสสถานะเป็นคำภาษาไทย (ใช้จาก constants)
    const getStatusText = (s) => {
        if (!s) return '-';
        if (isApprovalStatus) {
            return APPROVAL_STATUS_LABEL[s] || String(s).replace(/_/g, ' ');
        }
        return WORK_STATUS_LABEL[s] || String(s).replace(/_/g, ' ');
    };

    // 2. Color Mapping - แปลงรหัสสถานะเป็นสี (ใช้จาก constants)
    const getColor = (s) => {
        if (!s) return 'bg-gray-100 text-gray-500';
        if (getStatusText(s) === '-') return 'bg-gray-50 text-gray-400 border border-gray-200';
        if (isApprovalStatus) return APPROVAL_STATUS_COLOR[s] || 'bg-gray-100 text-gray-700';
        return STATUS_COLOR[s] || 'bg-gray-100 text-gray-700';
    };

    // ใช้ variant ก่อน ถ้าไม่มีจึงใช้ status
    const colorKey = variant || status;
    const colorClass = getColor(colorKey);

    // ถ้ามี children ให้แสดง children (ใช้กับ variant)
    // ถ้าไม่มี ให้แสดง status text ที่ผ่านฟังก์ชัน
    const displayText = children || getStatusText(status);

    return (
        <span className={`px-2 py-1 text-xs rounded-full font-medium inline-flex items-center justify-center gap-1 ${colorClass} ${className} min-w-[60px]`}>
            {displayText}
            {count !== undefined && <span className="ml-1 opacity-75">+{count}</span>}
        </span>
    );
}
