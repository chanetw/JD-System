/**
 * @file Badge.jsx
 * @description ป้ายกำกับสถานะ (Status Badge)
 */

import React from 'react';

export default function Badge({ status, count, className = '' }) {
    // Map สถานะเป็นสี
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
    };

    // ถ้าส่ง color มาเอง (เช่น 'green') ก็จัดการให้
    const getColor = (s) => {
        if (statusColors[s]) return statusColors[s];
        // กรณี custom หรือไม่เจอใน map
        return 'bg-gray-100 text-gray-700';
    };

    return (
        <span className={`px-2 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1 ${getColor(status)} ${className}`}>
            {status.replace('_', ' ')}
            {count !== undefined && <span className="ml-1 opacity-75">+{count}</span>}
        </span>
    );
}
