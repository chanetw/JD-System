/**
 * @file QuickActions.jsx
 * @description Quick Action Cards (Shared Component)
 * Config ตาม Role ที่ส่งมา
 */

import React from 'react';
import { Link } from 'react-router-dom';

export default function QuickActions({ actions = [] }) {
    return (
        <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {actions.map((action, idx) => (
                    <Link
                        key={idx}
                        to={action.to}
                        className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition text-center group border border-slate-100"
                    >
                        <div className={`w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center transition ${action.bgColor}`}>
                            {action.icon}
                        </div>
                        <h3 className="font-semibold text-slate-800 mb-1">{action.title}</h3>
                        <p className="text-sm text-slate-500">{action.desc}</p>
                        {action.badge && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-rose-500 text-white text-xs rounded-full">
                                {action.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
