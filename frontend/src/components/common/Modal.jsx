/**
 * @file Modal.jsx
 * @description Modal Popup Component แบบ Custom - สวยงาม ใช้งานง่าย
 * 
 * Features:
 * - รองรับ Success, Error, Warning, Info
 * - Animation เข้า-ออกแบบ smooth
 * - ปิดได้ทั้ง backdrop และปุ่ม X
 * - รองรับ callback เมื่อกดปุ่ม OK
 */

import React, { useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

/**
 * @component Modal
 * @param {boolean} isOpen - เปิด/ปิด Modal
 * @param {function} onClose - Callback เมื่อปิด Modal
 * @param {function} onConfirm - Callback เมื่อกดปุ่ม OK (optional)
 * @param {string} type - ประเภท: 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - หัวข้อ Modal
 * @param {string} message - ข้อความใน Modal
 * @param {string} confirmText - ข้อความปุ่ม OK (default: 'ตรงไป')
 * @param {boolean} showCancel - แสดงปุ่มยกเลิกหรือไม่ (default: false)
 */
export default function Modal({
    isOpen,
    onClose,
    onConfirm,
    type = 'info',
    title = 'แจ้งเตือน',
    message = '',
    confirmText = 'ตกลง',
    showCancel = false
}) {
    // ป้องกันการ scroll เมื่อ modal เปิด
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // ปิด Modal เมื่อกด ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // กำหนดสีและไอคอนตาม type
    const typeConfig = {
        success: {
            icon: CheckCircleIcon,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            buttonBg: 'bg-green-500 hover:bg-green-600',
            borderColor: 'border-green-200'
        },
        error: {
            icon: XCircleIcon,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            buttonBg: 'bg-red-500 hover:bg-red-600',
            borderColor: 'border-red-200'
        },
        warning: {
            icon: ExclamationTriangleIcon,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            buttonBg: 'bg-amber-500 hover:bg-amber-600',
            borderColor: 'border-amber-200'
        },
        info: {
            icon: InformationCircleIcon,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            buttonBg: 'bg-blue-500 hover:bg-blue-600',
            borderColor: 'border-blue-200'
        }
    };

    const config = typeConfig[type] || typeConfig.info;
    const IconComponent = config.icon;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-6 border-b ${config.borderColor} flex justify-between items-start`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${config.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-700 text-base leading-relaxed whitespace-pre-line">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            ยกเลิก
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`px-6 py-2.5 ${config.buttonBg} text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }

                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
