/**
 * @file Card.jsx
 * @description การ์ดแสดงผลข้อมูล (Standard Card)
 */

import React from 'react';

export function Card({ children, className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '', title, badge }) {
    return (
        <div className={`px-4 py-3 border-b border-gray-200 bg-gray-50 sm:px-5 lg:px-6 lg:py-4 ${className}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {title && (
                    <h2 className="font-semibold text-gray-900 flex min-w-0 items-center gap-2">
                        {badge && (
                            <span className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-sm shrink-0">
                                {badge}
                            </span>
                        )}
                        <span className="min-w-0 truncate">{title}</span>
                    </h2>
                )}
                {children}
            </div>
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={`p-4 sm:p-5 lg:p-6 ${className}`}>
            {children}
        </div>
    );
}
