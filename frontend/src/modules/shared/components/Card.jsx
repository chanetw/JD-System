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
        <div className={`px-6 py-4 border-b border-gray-200 bg-gray-50 ${className}`}>
            <div className="flex items-center justify-between">
                {title && (
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        {badge && (
                            <span className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-sm">
                                {badge}
                            </span>
                        )}
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={`p-6 ${className}`}>
            {children}
        </div>
    );
}
