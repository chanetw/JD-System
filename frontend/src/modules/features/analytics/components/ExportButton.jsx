/**
 * @file ExportButton.jsx
 * @description Component สำหรับปุ่ม Export ข้อมูล
 * 
 * วัตถุประสงค์:
 * - ให้ผู้ใช้ Export ข้อมูลเป็น PDF, Excel, CSV
 * - แสดง Dropdown เมื่อคลิก
 * - แสดง Loading state ระหว่าง Export
 */

import { useState, useRef, useEffect } from 'react';

/**
 * @component ExportButton
 * @description ปุ่ม Export ข้อมูล
 * @param {object} props
 * @param {function} props.onExportPDF - Callback เมื่อ Export PDF
 * @param {function} props.onExportExcel - Callback เมื่อ Export Excel
 * @param {function} props.onExportCSV - Callback เมื่อ Export CSV
 * @param {boolean} props.isExporting - สถานะ Export
 */
export default function ExportButton({ onExportPDF, onExportExcel, onExportCSV, isExporting = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    /**
     * ปิด Dropdown เมื่อคลิกภายนอก
     * แก้ไข: ใช้ useEffect เพื่อจัดการ event listener อย่างถูกต้อง
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        // เพิ่ม event listener เมื่อ dropdown เปิด
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup function
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    /**
     * จัดการเมื่อคลิก Export
     */
    const handleExport = async (type) => {
        setIsOpen(false);

        try {
            switch (type) {
                case 'pdf':
                    if (onExportPDF) await onExportPDF();
                    break;
                case 'excel':
                    if (onExportExcel) await onExportExcel();
                    break;
                case 'csv':
                    if (onExportCSV) await onExportCSV();
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="Export options"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isExporting ? (
                    <>
                        <LoadingSpinner />
                        <span>กำลัง Export...</span>
                    </>
                ) : (
                    <>
                        <ExportIcon />
                        <span>Export</span>
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && !isExporting && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                        <button
                            onClick={() => handleExport('pdf')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                            <PDFIcon />
                            <span>Export PDF</span>
                        </button>
                        <button
                            onClick={() => handleExport('excel')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                            <ExcelIcon />
                            <span>Export Excel</span>
                        </button>
                        <button
                            onClick={() => handleExport('csv')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                            <CSVIcon />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Icons
// ============================================

function ExportIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

function PDFIcon() {
    return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h2v2h-2v-2zm0 4h2v2h-2v-2zm-4-4h2v2H6v-2zm0 4h2v2H6v-2z" />
        </svg>
    );
}

function ExcelIcon() {
    return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h2v2H8v-2zm0 4h2v2H8v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2z" />
        </svg>
    );
}

function CSVIcon() {
    return (
        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h2v2H8v-2zm0 4h2v2H8v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2z" />
        </svg>
    );
}

function LoadingSpinner() {
    return (
        <svg className="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
}
