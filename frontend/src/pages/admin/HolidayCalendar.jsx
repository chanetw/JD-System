/**
 * @file AdminHoliday.jsx
 * @description หน้าปฏิทินวันหยุด (Admin: Holiday Calendar)
 * 
 * Senior Programmer Notes:
 * - แสดงปฏิทินรายปี
 * - รายการวันหยุดในรูปแบบ Table
 * - Modal สำหรับเพิ่มวันหยุด - เชื่อมต่อกับ mockApi
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { FormInput, FormSelect } from '@/components/common/FormInput';
import { getHolidays, addHoliday, updateHoliday, deleteHoliday } from '@/services/mockApi';

// Icons
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    CalendarIcon,
    ArrowDownTrayIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

export default function AdminHoliday() {
    const [showModal, setShowModal] = useState(false);
    const [holidays, setHolidays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        date: '',
        name: '',
        type: 'government',
        recurring: false
    });
    const [selectedYear, setSelectedYear] = useState(2026); // ปีปัจจุบัน (พ.ศ. 2569)
    const [editingId, setEditingId] = useState(null);

    // Custom Alert State
    const [alertState, setAlertState] = useState({ show: false, type: 'success', message: '' });
    // Confirm Modal - restored as requested
    const [confirmModal, setConfirmModal] = useState({ show: false, id: null });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper: Show Alert
    const showAlert = (type, message) => {
        setAlertState({ show: true, type, message });
        // Auto hide after 3 seconds if success
        if (type === 'success') {
            setTimeout(() => setAlertState(prev => ({ ...prev, show: false })), 3000);
        }
    };

    // Helper: Format Date to Thai
    const formatThaiDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // โหลดข้อมูลวันหยุด
    useEffect(() => {
        loadHolidays();
    }, []);

    const loadHolidays = async () => {
        setIsLoading(true);
        try {
            const data = await getHolidays();
            setHolidays(data);
        } catch (error) {
            console.error('Failed to load holidays', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debug: Log when function is called
    const handleSaveHoliday = async () => {
        if (isSubmitting) return; // Prevent double submit

        if (!formData.date || !formData.name) {
            showAlert('error', 'กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingId) {
                // Update Existing
                await updateHoliday(editingId, formData);
                showAlert('success', 'แก้ไขวันหยุดสำเร็จ');
            } else {
                // Add New
                await addHoliday(formData);
                showAlert('success', 'เพิ่มวันหยุดสำเร็จ');
            }

            await loadHolidays();
            setShowModal(false);
            setFormData({ date: '', name: '', type: 'government', recurring: false });
            setEditingId(null);
        } catch (error) {
            console.error('Error:', error);
            showAlert('error', 'เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (holiday) => {
        setFormData({
            date: holiday.date,
            name: holiday.name,
            type: holiday.type,
            recurring: holiday.recurring || false
        });
        setEditingId(holiday.id);
        setShowModal(true);
    };

    const handleAddClick = () => {
        setFormData({ date: '', name: '', type: 'government', recurring: false });
        setEditingId(null);
        setShowModal(true);
    };

    const handleDeleteClick = (id) => {
        setConfirmModal({ show: true, id });
    };

    const confirmDelete = async () => {
        if (!confirmModal.id) return;

        try {
            await deleteHoliday(confirmModal.id);
            await loadHolidays();
            showAlert('success', 'ลบวันหยุดสำเร็จ');
            setConfirmModal({ show: false, id: null });
        } catch (error) {
            showAlert('error', 'เกิดข้อผิดพลาด: ' + error.message);
        }
    };

    // Helper function: กรองวันหยุดตามเดือนและปี
    const getHolidaysForMonth = (year, month) => {
        return holidays.filter(holiday => {
            const holidayDate = new Date(holiday.date);
            return holidayDate.getFullYear() === year && holidayDate.getMonth() === month;
        }).map(h => ({
            day: new Date(h.date).getDate(),
            type: h.type,
            name: h.name
        }));
    };

    // Helper function: คำนวณวันเริ่มต้นของเดือน (0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์)
    const getStartDay = (year, month) => {
        const date = new Date(year, month, 1); // วันที่ 1 ของเดือนนั้นๆ
        return date.getDay(); // 0-6 (Sun-Sat)
    };


    return (
        <div className="space-y-6">
            {/* ============================================
          Page Header
          ============================================ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
                    <p className="text-gray-500">จัดการวันหยุดสำหรับคำนวณ SLA</p>
                </div>
                <Button onClick={handleAddClick}>
                    <PlusIcon className="w-5 h-5" /> Add Holiday
                </Button>
            </div>

            {/* ============================================
          Year Selector & Stats
          ============================================ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-medium bg-white"
                    >
                        {Array.from({ length: 9 }, (_, i) => {
                            // Generate options from (Current Year - 2) to (Current Year + 6)
                            const year = new Date().getFullYear() - 2 + i;
                            return (
                                <option key={year} value={year}>
                                    พ.ศ. {year + 543} ({year})
                                </option>
                            );
                        })}
                    </select>
                    <div className="flex items-center gap-2">
                        <Legend color="bg-red-500" label="วันหยุดราชการ" />
                        <Legend color="bg-purple-500" label="วันหยุดบริษัท" />
                        <Legend color="bg-gray-300" label="วันเสาร์-อาทิตย์" />
                    </div>
                </div>
                <div className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-rose-600">{holidays.filter(h => new Date(h.date).getFullYear() === selectedYear).length}</span> holidays in {selectedYear}
                </div>
            </div>

            {/* ============================================
          Calendar Grid - 12 months in 4 columns
          ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <MonthCalendar month="มกราคม 2569" startDay={getStartDay(selectedYear, 0)} days={31} holidays={getHolidaysForMonth(selectedYear, 0)} />
                <MonthCalendar month="กุมภาพันธ์ 2569" startDay={getStartDay(selectedYear, 1)} days={28} holidays={getHolidaysForMonth(selectedYear, 1)} />
                <MonthCalendar month="มีนาคม 2569" startDay={getStartDay(selectedYear, 2)} days={31} holidays={getHolidaysForMonth(selectedYear, 2)} />
                <MonthCalendar month="เมษายน 2569" startDay={getStartDay(selectedYear, 3)} days={30} holidays={getHolidaysForMonth(selectedYear, 3)} />
                <MonthCalendar month="พฤษภาคม 2569" startDay={getStartDay(selectedYear, 4)} days={31} holidays={getHolidaysForMonth(selectedYear, 4)} />
                <MonthCalendar month="มิถุนายน 2569" startDay={getStartDay(selectedYear, 5)} days={30} holidays={getHolidaysForMonth(selectedYear, 5)} />
                <MonthCalendar month="กรกฎาคม 2569" startDay={getStartDay(selectedYear, 6)} days={31} holidays={getHolidaysForMonth(selectedYear, 6)} />
                <MonthCalendar month="สิงหาคม 2569" startDay={getStartDay(selectedYear, 7)} days={31} holidays={getHolidaysForMonth(selectedYear, 7)} />
                <MonthCalendar month="กันยายน 2569" startDay={getStartDay(selectedYear, 8)} days={30} holidays={getHolidaysForMonth(selectedYear, 8)} />
                <MonthCalendar month="ตุลาคม 2569" startDay={getStartDay(selectedYear, 9)} days={31} holidays={getHolidaysForMonth(selectedYear, 9)} />
                <MonthCalendar month="พฤศจิกายน 2569" startDay={getStartDay(selectedYear, 10)} days={30} holidays={getHolidaysForMonth(selectedYear, 10)} />
                <MonthCalendar month="ธันวาคม 2569" startDay={getStartDay(selectedYear, 11)} days={31} holidays={getHolidaysForMonth(selectedYear, 11)} />
            </div>

            {/* ============================================
          Holiday List
          ============================================ */}
            <Card>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">รายการวันหยุด พ.ศ. {selectedYear + 543} ({selectedYear})</h3>
                    <Button variant="link" className="text-rose-600 hover:text-rose-700">
                        <ArrowDownTrayIcon className="w-4 h-4" /> Export Excel
                    </Button>
                </div>
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <Th>Date</Th>
                            <Th>Holiday Name</Th>
                            <Th className="text-center">Type</Th>
                            <Th className="text-center">Actions</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {holidays
                            .filter(h => new Date(h.date).getFullYear() === selectedYear)
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map(holiday => (
                                <HolidayRow
                                    key={holiday.id}
                                    date={formatThaiDate(holiday.date)}
                                    name={holiday.name}
                                    type={holiday.type}
                                    onEdit={() => handleEditClick(holiday)}
                                    onDelete={() => handleDeleteClick(holiday.id)}
                                />
                            ))
                        }
                        {holidays.filter(h => new Date(h.date).getFullYear() === selectedYear).length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                    ไม่มีรายการวันหยุดสำหรับปี {selectedYear}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="px-6 py-3 border-t border-gray-200 text-center text-sm text-gray-500">
                    แสดงทั้งหมด {holidays.filter(h => new Date(h.date).getFullYear() === selectedYear).length} รายการ
                </div>
            </Card>

            {/* Alert Toast */}
            {alertState.show && (
                <div className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 transform translate-y-0 ${alertState.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${alertState.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium">{alertState.message}</span>
                    <button onClick={() => setAlertState(prev => ({ ...prev, show: false }))} className="ml-4 text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Confirm Delete Modal - Centered with transparent backdrop */}
            {confirmModal.show && (
                <div className="fixed inset-0 flex items-center justify-center z-[70]">
                    {/* Transparent overlay that blocks clicks but isn't dark */}
                    <div className="absolute inset-0 bg-transparent" onClick={() => setConfirmModal({ show: false, id: null })}></div>

                    {/* Modal Content - Has shadow to pop out */}
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 text-center space-y-4 relative z-10 animate-scaleIn">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <TrashIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">ยืนยันการลบ?</h3>
                            <p className="text-gray-500 text-sm">คุณต้องการลบรายการวันหยุดนี้ใช่หรือไม่<br />การกระทำนี้ไม่สามารถเรียกคืนได้</p>
                        </div>
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="secondary" onClick={() => setConfirmModal({ show: false, id: null })}>ยกเลิก</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>ยืนยัน ลบข้อมูล</Button>
                        </div>
                    </div>
                </div>
            )}



            {/* ============================================
          Add Holiday Modal
          ============================================ */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Holiday' : 'Add Holiday'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <FormInput
                                label="Date"
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                            <FormInput
                                label="Holiday Name"
                                name="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g. วันหยุดชดเชย"
                            />
                            <FormSelect
                                label="Type"
                                name="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="government">วันหยุดราชการ</option>
                                <option value="company">วันหยุดบริษัท</option>
                            </FormSelect>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.recurring}
                                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                                    className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                />
                                <span className="text-sm text-gray-700">Repeat every year</span>
                            </label>
                        </div>
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSaveHoliday} disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : (editingId ? 'Update Holiday' : 'Add Holiday')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helpers
function Legend({ color, label }) {
    return (
        <span className="flex items-center gap-1 text-sm text-gray-600">
            <span className={`w-3 h-3 ${color} rounded`}></span>
            {label}
        </span>
    );
}

function MonthCalendar({ month, startDay, days, holidays }) {
    const daysArray = Array.from({ length: days }, (_, i) => i + 1);
    const emptyStart = Array.from({ length: startDay }, (_, i) => i);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-rose-600 text-white px-4 py-3">
                <h3 className="font-semibold text-center">{month}</h3>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                    <div className="text-red-500 font-medium">อา</div>
                    <div className="text-gray-600 font-medium">จ</div>
                    <div className="text-gray-600 font-medium">อ</div>
                    <div className="text-gray-600 font-medium">พ</div>
                    <div className="text-gray-600 font-medium">พฤ</div>
                    <div className="text-gray-600 font-medium">ศ</div>
                    <div className="text-gray-300 font-medium">ส</div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                    {emptyStart.map((_, i) => <div key={`empty-${i}`}></div>)}
                    {daysArray.map(day => {
                        const holiday = holidays.find(h => h.day === day);
                        let bgClass = "";
                        let textClass = "";
                        let title = "";

                        // Simple logic to detect weekend (mock based on startDay)
                        // This logic is imperfect without real date obj but good enough for static mock
                        const currentDayIndex = (startDay + day - 1) % 7;
                        const isWeekend = currentDayIndex === 0 || currentDayIndex === 6;

                        if (holiday) {
                            bgClass = holiday.type === 'government' ? 'bg-red-100' : 'bg-purple-100';
                            textClass = holiday.type === 'government' ? 'text-red-700 font-medium' : 'text-purple-700 font-medium';
                            title = holiday.name;
                        } else if (isWeekend) {
                            bgClass = "bg-gray-100";
                            textClass = "text-gray-400";
                        }

                        return (
                            <div
                                key={day}
                                className={`p-1 rounded ${bgClass} ${textClass} ${holiday ? 'cursor-pointer hover:opacity-80' : ''}`}
                                title={title}
                            >
                                {day}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Th({ children, className = "text-left" }) {
    return <th className={`px-6 py-3 text-xs font-semibold text-gray-600 uppercase ${className}`}>{children}</th>;
}

// Row Component with Always Visible Actions
function HolidayRow({ date, name, type, onDelete, onEdit }) {
    const typeBadge = type === 'government'
        ? <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">วันหยุดราชการ</span>
        : <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">วันหยุดบริษัท</span>;

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-3 text-sm text-gray-900">{date}</td>
            <td className="px-6 py-3 text-sm text-gray-900">{name}</td>
            <td className="px-6 py-3 text-center">{typeBadge}</td>
            <td className="px-6 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                    <button onClick={onEdit} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
