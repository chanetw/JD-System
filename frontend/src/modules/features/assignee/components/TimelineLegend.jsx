/**
 * @file TimelineLegend.jsx
 * @description Legend แสดงความหมายของสีใน Timeline
 */

import React from 'react';

export default function TimelineLegend({ holidays = [] }) {
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
        <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-400 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {/* Priority Colors */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">ความสำคัญ</span>
                    <div className="flex items-center gap-2.5">
                        {priorityColors.map((item) => (
                            <div key={item.label} className="flex items-center gap-1">
                                <div className={`w-3 h-3 ${item.color} rounded`}></div>
                                <span className="text-xs text-gray-600">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Indicators */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">สถานะ</span>
                    <div className="flex items-center gap-2.5">
                        {statusIndicators.map((item) => (
                            <div key={item.label} className="flex items-center gap-1">
                                <div className={`w-3 h-3 bg-white border-2 ${item.border} rounded`}></div>
                                <span className="text-xs text-gray-600">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Day Type Indicators */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">วัน</span>
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">วันนี้</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded" style={{ background: 'rgba(0,0,0,0.1)' }}></div>
                            <span className="text-xs text-gray-600">เสาร์-อาทิตย์</span>
                        </div>
                        {holidays.length > 0 && (
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-200 rounded"></div>
                                <span className="text-xs text-gray-600">วันหยุด ({holidays.length})</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
