/**
 * @file FormInput.jsx
 * @description กลุ่มคอมโพเน็นต์พื้นฐานสำหรับแบบฟอร์ม (Text Input, Select, Textarea)
 * ใช้สำหรับรับข้อมูลจากผู้ใช้ในรูปแบบต่างๆ พร้อมการแสดงผลข้อความแจ้งเตือนข้อผิดพลาด (Validation Error)
 */

import React from 'react';

const baseInputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:bg-gray-50 disabled:text-gray-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

/**
 * FormInput: ช่องกรอกข้อมูลประเภทข้อความทั่วไป (Text/Email/Password)
 * @param {object} props
 * @param {string} props.label - หัวข้อฟิลด์
 * @param {boolean} [props.required] - ระบุว่าเป็นฟิลด์ที่จำเป็นต้องกรอกหรือไม่
 * @param {string} [props.error] - ข้อความแสดงข้อผิดพลาด
 * @param {string} [props.className] - คลาสเพิ่มเติมสำหรับ Tailwind
 */
export function FormInput({ label, required, error, className = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>}
            <input className={`${baseInputClass} ${error ? 'border-red-300 focus:ring-red-500' : ''}`} {...props} />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}

/**
 * FormSelect: ช่องเลือกข้อมูล (Dropdown Selector)
 * @param {object} props
 * @param {string} props.label - หัวข้อฟิลด์
 * @param {boolean} [props.required] - ระบุว่าเป็นฟิลด์ที่จำเป็นต้องมีค่าหรือไม่
 * @param {React.ReactNode} props.children - รายการ <option> ต่างๆ
 * @param {string} [props.error] - ข้อความแสดงข้อผิดพลาด
 * @param {string} [props.className] - คลาสเพิ่มเติมสำหรับ Tailwind
 */
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

/**
 * FormTextarea: ช่องกรอกข้อมูลข้อความแบบหลายบรรทัด
 * @param {object} props
 * @param {string} props.label - หัวข้อฟิลด์
 * @param {boolean} [props.required] - ระบุว่าเป็นฟิลด์ที่จำเป็นต้องกรอกหรือไม่
 * @param {string} [props.error] - ข้อความแสดงข้อผิดพลาด
 * @param {string} [props.className] - คลาสเพิ่มเติมสำหรับ Tailwind
 */
export function FormTextarea({ label, required, error, className = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>}
            <textarea className={`${baseInputClass} ${error ? 'border-red-300 focus:ring-red-500' : ''}`} {...props} />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}
