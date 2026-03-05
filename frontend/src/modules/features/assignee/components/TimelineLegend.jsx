/**
 * @file TimelineLegend.jsx
 * @description Legend แสดงความหมายของสีใน Timeline
 */

import React from 'react';

export default function TimelineLegend() {
    const priorityColors = [
        { label: 'Urgent', color: 'bg-red-500', border: 'border-red-500' },
        { label: 'High', color: 'bg-orange-500', border: 'border-orange-500' },
        { label: 'Normal', color: 'bg-blue-500', border: 'border-blue-500' },
        { label: 'Low', color: 'bg-green-500', border: 'border-green-500' },
    ];

    const statusIndicators = [
        { label: 'กำลังทำ', border: 'border-blue-500' },
        { label: 'เสร็จแล้ว', border: 'border-green-500' },
        { label: 'ปฏิเสธ', border: 'border-red-500' },
    ];

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-400 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Priority Colors */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase">ความสำคัญ:</span>
                    <div className="flex items-center gap-3">
                        {priorityColors.map((item) => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 ${item.color} rounded`}></div>
                                <span className="text-xs text-gray-600">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Indicators */}
                <div className="flex items-center gap-2 md:ml-4">
                    <span className="text-xs font-semibold text-gray-600 uppercase">สถานะ (ขอบ):</span>
                    <div className="flex items-center gap-3">
                        {statusIndicators.map((item) => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 bg-white border-2 ${item.border} rounded`}></div>
                                <span className="text-xs text-gray-600">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
