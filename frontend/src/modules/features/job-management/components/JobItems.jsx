/**
 * @file JobItems.jsx
 * @description แสดงรายการงานย่อย (Design Job Items) ที่ต้องส่งมอบ
 *
 * Features:
 * - แสดงรายการ items พร้อมจำนวน
 * - สรุปจำนวนทั้งหมด
 * - Status badge สำหรับแต่ละ item
 */

import React from 'react';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { CubeIcon } from '@heroicons/react/24/solid';

const STATUS_CONFIG = {
    pending: { label: 'รอดำเนินการ', color: 'gray', icon: ClockIcon },
    in_progress: { label: 'กำลังทำ', color: 'blue', icon: ClockIcon },
    completed: { label: 'เสร็จแล้ว', color: 'green', icon: CheckCircleIcon },
    cancelled: { label: 'ยกเลิก', color: 'red', icon: XCircleIcon }
};

export default function JobItems({ job }) {
    // Early return if no items
    if (!job?.items || job.items.length === 0) {
        return null;
    }

    // Only show for parent jobs
    if (!job.isParent) {
        return null;
    }

    const items = job.items;
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 px-4 py-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <CubeIcon className="w-5 h-5 text-rose-600" />
                        รายการงานที่ต้องส่งมอบ
                    </h3>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            รายการทั้งหมด: <span className="font-semibold text-rose-600">{items.length}</span>
                        </span>
                        <span className="text-sm text-gray-600">
                            จำนวนรวม: <span className="font-semibold text-rose-600">{totalQuantity}</span> ชิ้น
                        </span>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-gray-100">
                {items.map((item, index) => {
                    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;

                    return (
                        <div
                            key={item.id || index}
                            className="px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center justify-between gap-4">
                                {/* Item Detail: Name + Size + Quantity */}
                                <div className="flex-1 text-sm font-medium text-gray-900">
                                    {item.name}
                                    {item.size && (
                                        <span className="text-gray-500 font-normal">
                                            {' '}ขนาด: {item.size}
                                        </span>
                                    )}
                                    {' '}
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 ml-2">
                                        <CubeIcon className="w-3 h-3" />
                                        {item.quantity || 1} ชิ้น
                                    </span>
                                </div>

                                {/* Status Badge */}
                                <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0
                                        ${statusConfig.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                                        ${statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${statusConfig.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                                        ${statusConfig.color === 'red' ? 'bg-red-100 text-red-700' : ''}
                                    `}
                                >
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {statusConfig.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Summary (optional - shown for multiple items) */}
            {items.length > 3 && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-center">
                    <p className="text-xs text-gray-500">
                        รวมทั้งหมด {items.length} รายการ ({totalQuantity} ชิ้น)
                    </p>
                </div>
            )}
        </div>
    );
}
