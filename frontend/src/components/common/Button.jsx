/**
 * @file Button.jsx
 * @description ปุ่มกดมาตรฐาน (Standard Button)
 */

import React from 'react';

export default function Button({
    children,
    variant = 'primary',
    className = '',
    icon: Icon,
    disabled = false,
    ...props
}) {
    const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-rose-500 text-white hover:bg-rose-600 disabled:bg-rose-300",
        secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400",
        danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50",
        ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
        link: "text-rose-600 hover:text-rose-700 hover:underline p-0 h-auto",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${disabled ? 'cursor-not-allowed' : ''} ${className}`}
            disabled={disabled}
            {...props}
        >
            {Icon && <Icon className="w-5 h-5" />}
            {children}
        </button>
    );
}
