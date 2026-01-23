/**
 * @file Badge.jsx
 * @description ป้ายกำกับสถานะ (Status Badge)
 * 
 * การใช้งาน:
 * - <Badge status="pending_approval" /> แสดงสถานะตาม key
 * - <Badge variant="error">ข้อความ</Badge> แสดง Badge แบบกำหนดเองพร้อม children
 * 
 * @param {string} [status] - รหัสสถานะที่จะแสดง (e.g., 'pending_approval', 'approved')
 * @param {string} [variant] - รูปแบบสีพิเศษ (e.g., 'error', 'indigo') มีความสำคัญมากกว่า status
 * @param {number} [count] - จำนวนที่จะแสดงเพิ่มเติม (e.g., +5)
 * @param {string} [className] - คลาส Tailwind เพิ่มเติม
 * @param {React.ReactNode} [children] - ข้อความกำหนดเอง (ถ้ามีจะใช้แทน status text)
 */

import React from 'react';

export default function Badge({ status, variant, count, className = '', children }) {
    // Map สถานะเป็นสี (Status Color Mapping)
    const statusColors = {
        draft: 'bg-gray-100 text-gray-700',
        scheduled: 'bg-violet-100 text-violet-700',
        submitted: 'bg-blue-100 text-blue-700',
        pending_approval: 'bg-amber-100 text-amber-700',
        approved: 'bg-green-100 text-green-700',
        assigned: 'bg-cyan-100 text-cyan-700',
        in_progress: 'bg-blue-100 text-blue-700',
        rework: 'bg-yellow-100 text-yellow-700',
        rejected: 'bg-red-100 text-red-700',
        completed: 'bg-green-100 text-green-700',
        overdue: 'bg-red-100 text-red-700',
        normal: 'bg-gray-100 text-gray-700',
        // เพิ่มสีสำหรับ variant ที่ใช้ใน HolidayCalendar
        error: 'bg-red-100 text-red-700',
        indigo: 'bg-indigo-100 text-indigo-700',
    };

    /**
     * ดึงคลาสสีตามสถานะหรือ variant
     * @param {string} s - สถานะหรือ variant
     * @returns {string} คลาส Tailwind สำหรับสี
     */
    const getColor = (s) => {
        if (!s) return 'bg-gray-100 text-gray-700'; // Fallback สำหรับค่าว่าง
        if (statusColors[s]) return statusColors[s];
        return 'bg-gray-100 text-gray-700';
    };

    // ใช้ variant ก่อน ถ้าไม่มีจึงใช้ status
    const colorKey = variant || status;

    // ถ้ามี children ให้แสดง children (ใช้กับ variant)
    // ถ้าไม่มี ให้แสดง status text โดยแปลง underscore เป็น space
    const displayText = children || (status ? String(status).replace(/_/g, ' ') : '');

    return (
        <span className={`px-2 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1 ${getColor(colorKey)} ${className}`}>
            {displayText}
            {count !== undefined && <span className="ml-1 opacity-75">+{count}</span>}
        </span>
    );
}
