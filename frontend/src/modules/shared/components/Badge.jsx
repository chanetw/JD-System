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

export default function Badge({ status, variant, count, className = '', isApprovalStatus = false, children }) {
    // 1. Text Mapping - แปลงรหัสสถานะเป็นคำภาษาไทย
    const getStatusText = (s) => {
        if (!s) return '-';
        
        // กรณีเป็นสถานะอนุมัติ (Approval Status)
        if (isApprovalStatus) {
            const approvalTexts = {
                draft: 'แบบร่าง',
                pending_approval: 'รออนุมัติ',
                pending_level_1: 'รออนุมัติ',
                pending_level_2: 'รออนุมัติ L2',
                pending_level_3: 'รออนุมัติ L3',
                approved: 'อนุมัติแล้ว',
                assigned: 'อนุมัติแล้ว', // งานมีคนรับแล้ว แปลว่าผ่านอนุมัติแล้ว
                in_progress: 'อนุมัติแล้ว',
                completed: 'อนุมัติแล้ว',
                rejected: 'ไม่อนุมัติ',
                rejected_by_assignee: 'อนุมัติแล้ว', // อนุมัติให้ทำแล้ว แต่คนทำปฏิเสธ
                cancelled: 'ยกเลิก'
            };
            return approvalTexts[s] || String(s).replace(/_/g, ' ');
        }

        // กรณีเป็นสถานะงาน (Work Status)
        const workTexts = {
            draft: '-',
            pending_approval: '-',
            pending_level_1: '-',
            pending_level_2: '-',
            pending_level_3: '-',
            pending_dependency: 'รอคิวก่อนหน้า',
            approved: 'ยังไม่มอบหมาย',
            assigned: 'ได้รับมอบหมาย',
            in_progress: 'กำลังดำเนินการ',
            rework: 'แก้ไขใหม่',
            correction: 'รอตรวจ/แก้',
            returned: 'รอตรวจ/แก้',
            completed: 'เสร็จสมบูรณ์',
            rejected: '-',
            rejected_by_assignee: 'ถูกปฏิเสธ',
            assignee_rejected: 'ถูกปฏิเสธ (รอพิจารณา)',
            cancelled: '-'
        };
        return workTexts[s] || String(s).replace(/_/g, ' ');
    };

    // 2. Color Mapping - แปลงรหัสสถานะเป็นสี
    const getColor = (s) => {
        if (!s) return 'bg-gray-100 text-gray-500'; // Fallback
        
        // ถ้าเป็น "-" ให้เป็นสีเทาจางๆ
        if (getStatusText(s) === '-') return 'bg-gray-50 text-gray-400 border border-gray-200';

        // กรณีเป็นสถานะอนุมัติ (Approval Status)
        if (isApprovalStatus) {
            const approvalColors = {
                draft: 'bg-gray-100 text-gray-700',
                pending_approval: 'bg-amber-100 text-amber-700',
                pending_level_1: 'bg-amber-100 text-amber-700',
                pending_level_2: 'bg-orange-100 text-orange-700',
                pending_level_3: 'bg-orange-100 text-orange-700',
                approved: 'bg-green-100 text-green-700',
                assigned: 'bg-green-100 text-green-700',
                in_progress: 'bg-green-100 text-green-700',
                completed: 'bg-green-100 text-green-700',
                rejected: 'bg-red-100 text-red-700',
                rejected_by_assignee: 'bg-green-100 text-green-700',
                cancelled: 'bg-gray-200 text-gray-700'
            };
            return approvalColors[s] || 'bg-gray-100 text-gray-700';
        }

        // กรณีเป็นสถานะงาน (Work Status)
        const statusColors = {
            draft: 'bg-gray-100 text-gray-700',
            scheduled: 'bg-violet-100 text-violet-700',
            submitted: 'bg-blue-100 text-blue-700',
            pending_approval: 'bg-amber-100 text-amber-700',
            pending_level_1: 'bg-amber-100 text-amber-700',
            pending_level_2: 'bg-orange-100 text-orange-700',
            pending_level_3: 'bg-orange-100 text-orange-700',
            pending_dependency: 'bg-purple-100 text-purple-700',
            assignee_rejected: 'bg-orange-100 text-orange-700',
            returned: 'bg-yellow-100 text-yellow-700',
            approved: 'bg-amber-100 text-amber-700', // ยังไม่มอบหมาย = เหลือง
            assigned: 'bg-blue-100 text-blue-700', // ได้รับมอบหมาย = ฟ้า
            in_progress: 'bg-purple-100 text-purple-700', // กำลังดำเนินการ = ม่วง
            rework: 'bg-yellow-100 text-yellow-700',
            rejected: 'bg-red-100 text-red-700',
            rejected_by_assignee: 'bg-orange-100 text-orange-700', // ถูกปฏิเสธ (คนทำ) = ส้ม
            completed: 'bg-green-100 text-green-700',
            overdue: 'bg-red-100 text-red-700',
            normal: 'bg-gray-100 text-gray-700',
            error: 'bg-red-100 text-red-700',
            indigo: 'bg-indigo-100 text-indigo-700',
        };

        return statusColors[s] || 'bg-gray-100 text-gray-700';
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
