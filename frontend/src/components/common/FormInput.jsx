/**
 * @file FormInput.jsx
 * @description ฟิลด์กรอกข้อมูลรูปแบบต่างๆ (Text, Select, Textarea)
 */

import React from 'react';

const baseInputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:bg-gray-50 disabled:text-gray-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export function FormInput({ label, required, error, className = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>}
            <input className={`${baseInputClass} ${error ? 'border-red-300 focus:ring-red-500' : ''}`} {...props} />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}

export function FormSelect({ label, required, children, error, className = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>}
            <select className={`${baseInputClass} ${error ? 'border-red-300 focus:ring-red-500' : ''}`} {...props}>
                {children}
            </select>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}

export function FormTextarea({ label, required, error, className = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>}
            <textarea className={`${baseInputClass} ${error ? 'border-red-300 focus:ring-red-500' : ''}`} {...props} />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}
