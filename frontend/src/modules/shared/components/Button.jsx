/**
 * Button: คอมโพเน็นต์ปุ่มกดที่ใช้ซ้ำกันทั่วทั้งแอปพลิเคชัน
 * รองรับหลายรูปแบบ (Variant) เช่น Primary, Secondary, Danger
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children - ข้อความหรือเนื้อหาภายในปุ่ม
 * @param {'primary'|'secondary'|'danger'|'ghost'|'link'} [props.variant='primary'] - รูปแบบของปุ่ม
 * @param {string} [props.className] - คลาสเพิ่มเติมสำหรับ Tailwind CSS
 * @param {React.ElementType} [props.icon] - ไอคอนเสริมที่จะแสดงข้างข้อความ
 * @param {boolean} [props.disabled=false] - สถานะปิดการใช้งานปุ่ม
 */

import React from 'react';

export default function Button({
    children,
    variant = 'primary',
    className = '',
    icon: Icon,
    disabled = false,
    isLoading = false,
    ...props
}) {
    const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-rose-500 text-white hover:bg-rose-600 disabled:bg-rose-300",
        secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400",
        danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50",
        ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
        link: "text-rose-600 hover:text-rose-700 hover:underline p-0 h-auto",
        success: "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant] || variants.primary} ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
            ) : Icon ? (
                <Icon className="w-5 h-5" />
            ) : null}
            {children}
        </button>
    );
}
