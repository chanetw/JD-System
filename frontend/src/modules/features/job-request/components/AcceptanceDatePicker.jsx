/**
 * AcceptanceDatePicker Component (Calendar UI)
 *
 * Interactive calendar for selecting job due date with:
 * - Calendar grid with month/year navigation
 * - Clickable dates for selection
 * - Visual indicators (today, selected, start date, holidays)
 * - Priority-based validation (Normal vs Urgent)
 * - Rose color theme
 * - Backward calculation: Due Date → Start Date (automatic)
 */

import { useState, useEffect } from 'react';
import { addWorkDays, subtractWorkDays, formatDate } from '@shared/utils/slaCalculator';

const AcceptanceDatePicker = ({
    jobType,
    priority = 'Normal',
    selectedDate,
    onChange,
    holidays = [],
    disabled = false
}) => {
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [calculatedStartDate, setCalculatedStartDate] = useState(null);
    const [minSelectableDate, setMinSelectableDate] = useState(null);

    // คำนวณ Start Date และ Min Selectable Due Date
    useEffect(() => {
        if (!jobType || !jobType.sla) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // คำนวณ Min Due Date ตาม Priority
        let minDueDate;
        if (priority === 'Urgent') {
            // งานด่วน: เลือกได้เลยตั้งแต่พรุ่งนี้ (ไม่ต้องคำนวณ SLA)
            // Example: วันนี้ 18 ก.พ. → เลือกได้ตั้งแต่ 19 ก.พ. เป็นต้นไป (แทรกคิวได้เลย)
            minDueDate = new Date(today);
            minDueDate.setDate(minDueDate.getDate() + 1); // พรุ่งนี้
            minDueDate.setHours(0, 0, 0, 0);
        } else {
            // งานปกติ: Due Date ≥ วันนี้ + SLA + 1
            // Example: วันนี้ 17, SLA 2 วัน → Due = 19 → Due Date เลือกได้ตั้งแต่ 20 เป็นต้นไป
            const urgentMinDueDate = addWorkDays(today, jobType.sla, holidays);
            minDueDate = new Date(urgentMinDueDate);
            minDueDate.setDate(minDueDate.getDate() + 1);
            minDueDate.setHours(0, 0, 0, 0);
        }
        setMinSelectableDate(minDueDate);

        // ถ้ามีการเลือก Due Date แล้ว คำนวณย้อนกลับหา Start Date
        if (selectedDate) {
            const startDate = subtractWorkDays(new Date(selectedDate), jobType.sla, holidays);
            setCalculatedStartDate(startDate);

            // Auto-jump calendar to selected month
            const selected = new Date(selectedDate);
            setCalendarMonth(selected.getMonth());
            setCalendarYear(selected.getFullYear());
        } else {
            // ✅ Auto-jump to month with selectable dates (if different from current month)
            if (minDueDate.getMonth() !== today.getMonth() || minDueDate.getFullYear() !== today.getFullYear()) {
                setCalendarMonth(minDueDate.getMonth());
                setCalendarYear(minDueDate.getFullYear());
            }
        }
    }, [jobType, selectedDate, holidays, priority]);

    // สร้าง holiday set สำหรับ quick lookup
    const holidaySet = new Set(
        holidays.map(h => {
            const date = new Date(h.date);
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        })
    );

    // ฟังก์ชันสร้าง Calendar Grid
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();

    // สร้าง Array วันในเดือน
    const daysInMonth = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        daysInMonth.push(null);
    }
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        daysInMonth.push(day);
    }

    // ฟังก์ชันตรวจสอบประเภทวัน
    const isToday = (day) => {
        return day === today.getDate() &&
            calendarMonth === today.getMonth() &&
            calendarYear === today.getFullYear();
    };

    const isSelected = (day) => {
        if (!selectedDate) return false;
        const selected = new Date(selectedDate);
        return day === selected.getDate() &&
            calendarMonth === selected.getMonth() &&
            calendarYear === selected.getFullYear();
    };

    const isWeekend = (day) => {
        const date = new Date(calendarYear, calendarMonth, day);
        return date.getDay() === 0 || date.getDay() === 6;
    };

    const isHolidayDay = (day) => {
        return holidaySet.has(`${calendarYear}-${calendarMonth}-${day}`);
    };

    const isSelectable = (day) => {
        if (!minSelectableDate) return false;
        const date = new Date(calendarYear, calendarMonth, day);
        date.setHours(0, 0, 0, 0);
        return date >= minSelectableDate;
    };

    // ฟังก์ชันเลื่อนเดือน
    const goToPrevMonth = () => {
        if (calendarMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(calendarYear - 1);
        } else {
            setCalendarMonth(calendarMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (calendarMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(calendarYear + 1);
        } else {
            setCalendarMonth(calendarMonth + 1);
        }
    };

    // ฟังก์ชัน Handle Date Click
    const handleDateClick = (day) => {
        if (disabled) return;
        if (!isSelectable(day)) return;

        // ✅ FIX: ใช้ manual format เพื่อหลีก timezone offset
        const dateString = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateString);
    };

    // ชื่อเดือนภาษาไทย
    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    return (
        <div className="acceptance-date-picker">
            {/* Priority Info */}
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-rose-800">เลือกวันส่งงาน (Due Date)</span>
                    {priority === 'Urgent' && (
                        <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            งานด่วน
                        </span>
                    )}
                </div>
                <p className="text-xs text-rose-700">
                    {priority === 'Urgent'
                        ? `งานด่วน: เลือกได้ตั้งแต่พรุ่งนี้ (แทรกคิวได้เลย)`
                        : `งานปกติ: เลือกได้ตั้งแต่ (วันนี้+${jobType?.sla || 0}+1 วัน)`
                    }
                </p>
            </div>

            {/* Next Month Notice */}
            {minSelectableDate && !selectedDate &&
             minSelectableDate.getMonth() !== calendarMonth && (
                <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <p className="text-xs text-blue-700 leading-relaxed">
                        วันส่งงานที่เร็วที่สุดอยู่ในเดือน <strong>{thaiMonthsShort[minSelectableDate.getMonth()]} {minSelectableDate.getFullYear() + 543}</strong> - กดลูกศรด้านบนเพื่อเลื่อนดูปฏิทินเดือนถัดไป
                    </p>
                </div>
            )}

            {/* Calendar */}
            <div className="border border-rose-300 rounded-lg p-3 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={goToPrevMonth}
                        disabled={disabled}
                        className="w-7 h-7 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                        title="เดือนก่อนหน้า"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <p className="text-sm text-rose-800 font-semibold">
                        {thaiMonthsShort[calendarMonth]} {calendarYear + 543}
                    </p>
                    <button
                        type="button"
                        onClick={goToNextMonth}
                        disabled={disabled}
                        className="w-7 h-7 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                        title="เดือนถัดไป"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                    <span className="text-rose-400 font-medium">อา</span>
                    <span className="text-gray-500 font-medium">จ</span>
                    <span className="text-gray-500 font-medium">อ</span>
                    <span className="text-gray-500 font-medium">พ</span>
                    <span className="text-gray-500 font-medium">พฤ</span>
                    <span className="text-gray-500 font-medium">ศ</span>
                    <span className="text-rose-400 font-medium">ส</span>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {daysInMonth.map((day, index) => {
                        if (day === null) {
                            return <span key={index} className="p-2"></span>;
                        }

                        const selectable = isSelectable(day);
                        const weekend = isWeekend(day);
                        const holiday = isHolidayDay(day);
                        const todayDate = isToday(day);
                        const selectedDueDate = isSelected(day);

                        let className = "p-2 rounded transition-all ";

                        if (selectedDueDate) {
                            // วันส่งงาน (Due Date) ที่เลือก - Rose-500 (Bold)
                            className += "bg-rose-500 text-white font-bold cursor-pointer hover:bg-rose-600";
                        } else if (todayDate) {
                            // วันนี้ - Green
                            className += "bg-green-500 text-white font-medium";
                        } else if (!selectable) {
                            // ห้ามเลือก - สีจางมาก + disabled
                            className += "text-gray-200 bg-gray-50 cursor-not-allowed opacity-40";
                        } else if (weekend || holiday) {
                            // วันหยุด (แต่เลือกได้) - เลือกได้
                            className += "text-gray-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer border border-transparent hover:border-rose-200";
                        } else {
                            // วันธรรมดา เลือกได้ - สีปกติ + Clickable
                            className += "text-gray-800 hover:bg-rose-100 hover:text-rose-700 cursor-pointer font-medium border border-transparent hover:border-rose-300";
                        }

                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleDateClick(day)}
                                disabled={disabled || !selectable}
                                className={className}
                                title={
                                    selectedDueDate ? 'วันส่งงาน (Due Date)' :
                                        todayDate ? 'วันนี้' :
                                            !selectable ? 'ไม่สามารถเลือกได้' :
                                                'คลิกเพื่อเลือกวันนี้'
                                }
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex gap-3 mt-3 pt-3 border-t border-rose-100 text-xs justify-center flex-wrap">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-green-500 rounded"></span>
                        <span className="text-gray-600">วันนี้</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-rose-500 rounded"></span>
                        <span className="text-gray-600">วันส่งงาน</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-gray-200 rounded"></span>
                        <span className="text-gray-600">ห้ามเลือก</span>
                    </span>
                </div>
            </div>

            {/* Selected Date Info */}
            {selectedDate && calculatedStartDate && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                    {/* Box 1: วันส่งงาน */}
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        <span className="text-rose-600 font-medium text-xs block mb-1">วันส่งงาน</span>
                        <span className="text-rose-900 font-bold text-sm block">{formatDate(new Date(selectedDate))}</span>
                    </div>

                    {/* Box 2: SLA */}
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        <span className="text-rose-600 font-medium text-xs block mb-1">SLA</span>
                        <span className="text-rose-900 font-bold text-sm block">{jobType?.sla || 0} วันทำการ</span>
                    </div>

                    {/* Box 3: วันเริ่มงาน */}
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        <span className="text-rose-600 font-medium text-xs block mb-1">วันเริ่มงาน</span>
                        <span className="text-rose-900 font-bold text-sm block">{formatDate(calculatedStartDate)}</span>
                        <span className="text-xs text-rose-500 block mt-0.5">(อัตโนมัติ)</span>
                    </div>
                </div>
            )}

            {/* Help Text */}
            <p className="mt-2 text-xs text-gray-500 text-center">
                เลือกวันที่ต้องการให้ส่งงาน (Due Date) - ระบบจะคำนวณวันเริ่มงานให้อัตโนมัติ
            </p>
        </div>
    );
};

export default AcceptanceDatePicker;
