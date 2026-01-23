/**
 * @file HolidayCalendar.jsx
 * @description หน้าจอสำหรับจัดการวันหยุดประจำปี (Holiday Calendar)
 * 
 * วัตถุประสงค์หลัก:
 * - กำหนดวันหยุดเพื่อใช้ในการคำนวณเวลาการทำงาน (Working Hours) และเป้าหมายเวลา (SLA)
 * - แสดงผลในรูปแบบปฏิทินรายปีเพื่อให้เห็นภาพรวม
 * - จัดประเภทวันหยุด (ราชการ/บริษัท) เพื่อความชัดเจน
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import { FormInput, FormSelect } from '@shared/components/FormInput';
import { api } from '@shared/services/apiService';

// Icons
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    CalendarIcon,
    ArrowDownTrayIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

/**
 * AdminHoliday Component
 * คอมโพเน็นต์สำหรับการจัดการข้อมูลวันหยุดในระบบ
 */
export default function AdminHoliday() {
    // === สถานะของข้อมูล (States: Data) ===
    /** ควบคุมการเปิด/ปิดหน้าต่างเพิ่มหรือแก้ไขข้อมูล */
    const [showModal, setShowModal] = useState(false);
    /** รายการวันหยุดทั้งหมดจากระบบ */
    const [holidays, setHolidays] = useState([]);
    /** สถานะการกำลังโหลดข้อมูล */
    const [isLoading, setIsLoading] = useState(true);
    /** ข้อมูลในฟอร์มสำหรับการเพิ่ม/แก้ไข */
    const [formData, setFormData] = useState({
        date: '',       // วันที่วันหยุด
        name: '',       // ชื่อวันหยุด
        type: 'government', // ประเภท: government (ราชการ), company (บริษัท)
        recurring: false // วันหยุดนี้ซ้ำทุกปีหรือไม่
    });
    /** ปีที่กำลังแสดงผล (พ.ศ.) */
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    /** ID ของวันหยุดที่กำลังแก้ไข (ถ้ามี) */
    const [editingId, setEditingId] = useState(null);

    // === สถานะส่วนประสานงาน (States: UI) ===
    /** แสดงข้อความแจ้งเตือน (Alert) */
    const [alertState, setAlertState] = useState({ show: false, type: 'success', message: '' });
    /** แสดงหน้าต่างยืนยันการลบ */
    const [confirmModal, setConfirmModal] = useState({ show: false, id: null });
    /** สถานะการกำลังส่งข้อมูลไปยัง Server */
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * แสดงการแจ้งเตือนแบบ Alert
     * @param {('success'|'error')} type - ประเภทการแจ้งเตือน
     * @param {string} message - ข้อความแจ้งเตือน
     */
    const showAlert = (type, message) => {
        setAlertState({ show: true, type, message });
        // ซ่อนการแจ้งเตือนอัตโนมัติหลังจาก 3 วินาทีหากเป็นกรณีสำเร็จ (Success)
        if (type === 'success') {
            setTimeout(() => setAlertState(prev => ({ ...prev, show: false })), 3000);
        }
    };

    /**
     * แปลงรูปแบบวันที่จาก String เป็นภาษาไทย
     * @param {string} dateString - วันที่ (YYYY-MM-DD)
     * @returns {string} วันที่ในรูปแบบภาษาไทย
     */
    const formatThaiDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-'; // Check for invalid date
            return date.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Invalid date format:', dateString);
            return '-';
        }
    };

    // โหลดข้อมูลวันหยุด
    useEffect(() => {
        loadHolidays();
    }, []);

    /**
     * ดึงข้อมูลวันหยุดทั้งหมดจาก API
     * @async
     */
    const loadHolidays = async () => {
        setIsLoading(true);
        try {
            const data = await api.getHolidays();
            // Sanitize data: Ensure it's an array and filter out invalid items
            const cleanData = (Array.isArray(data) ? data : [])
                .filter(h => h && typeof h === 'object' && h.date && !isNaN(new Date(h.date).getTime()));

            setHolidays(cleanData);
        } catch (error) {
            console.error('ไม่สามารถโหลดข้อมูลวันหยุดได้:', error);
            showAlert('error', 'ไม่สามารถโหลดข้อมูลวันหยุดได้');
            setHolidays([]); // Fallback to empty array
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * บันทึกข้อมูลวันหยุด (เพิ่มใหม่ หรือ แก้ไข)
     * @async
     */
    const handleSaveHoliday = async () => {
        if (isSubmitting) return; // ป้องกันการส่งข้อมูลซ้ำ (Double Submit)

        // ตรวจสอบความถูกต้องของข้อมูล (Validation)
        if (!formData.date || !formData.name) {
            showAlert('error', 'กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingId) {
                // กรณีแก้ไขข้อมูล (Update Existing)
                await api.updateHoliday(editingId, formData);
                showAlert('success', 'แก้ไขข้อมูลวันหยุดสำเร็จ');
            } else {
                // กรณีเพิ่มข้อมูลใหม่ (Add New)
                await api.addHoliday(formData);
                showAlert('success', 'เพิ่มข้อมูลวันหยุดสำเร็จ');
            }

            await loadHolidays(); // โหลดรายการใหม่
            setShowModal(false); // ปิดหน้าต่าง
            setFormData({ date: '', name: '', type: 'government', recurring: false });
            setEditingId(null);
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการบันทึก:', error);
            showAlert('error', 'เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * เตรียมข้อมูลสำหรับการแก้ไขวันหยุด
     * @param {Object} holiday - ข้อมูลวันหยุดที่เลือก
     */
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

    /** เตรียมฟอร์มสำหรับการเพิ่มวันหยุดใหม่ */
    const handleAddClick = () => {
        setFormData({ date: '', name: '', type: 'government', recurring: false });
        setEditingId(null);
        setShowModal(true);
    };

    /**
     * เรียกใช้งานหน้าต่างยืนยันการลบ
     * @param {string|number} id - ID ของวันหยุดที่ต้องการลบ
     */
    const handleDeleteClick = (id) => {
        setConfirmModal({ show: true, id });
    };

    /** ยืนยันการลบข้อมูลจริง (ผ่าน API) */
    const confirmDelete = async () => {
        if (!confirmModal.id) return;

        try {
            await api.deleteHoliday(confirmModal.id);
            await loadHolidays();
            showAlert('success', 'ลบข้อมูลวันหยุดสำเร็จ');
            setConfirmModal({ show: false, id: null });
        } catch (error) {
            showAlert('error', 'เกิดข้อผิดพลาดในการลบ: ' + error.message);
        }
    };

    /**
     * ฟังก์ชันช่วยคัดกรองวันหยุดตามเดือนและปี (สำหรับแสดงในปฏิทิน)
     * @param {number} year - ปี ค.ศ.
     * @param {number} month - ลำดับเดือน (0-11)
     */
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

    /**
     * คำนวณวันเริ่มต้นของเดือน (0=อาทิตย์, 6=เสาร์)
     * @param {number} year - ปี ค.ศ.
     * @param {number} month - ลำดับเดือน (0-11)
     */
    const getStartDay = (year, month) => {
        const date = new Date(year, month, 1); // วันที่ 1 ของเดือนที่ระบุ
        return date.getDay(); // คืนค่าเป็นตัวเลข 0-6
    };


    return (
        <div className="space-y-6">
            {/* ส่วนหัวของหน้า (Page Header) */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ปฏิทินวันหยุด (Holiday Calendar)</h1>
                    <p className="text-gray-500">จัดการข้อมูลวันหยุดประจำปีสำหรับคำนวณเวลาทำงานและเป้าหมายเวลา (SLA)</p>
                </div>
                <Button onClick={handleAddClick} className="bg-rose-500 hover:bg-rose-600">
                    <PlusIcon className="w-5 h-5" /> เพิ่มวันหยุด (Add Holiday)
                </Button>
            </div>

            {/* ตัวเลือกปี และ คำอธิบายสัญลักษณ์ (Year Selector & Legend) */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">เลือกปีแสดงผล:</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-medium bg-white"
                        >
                            {Array.from({ length: 9 }, (_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return (
                                    <option key={year} value={year}>
                                        พ.ศ. {year + 543} ({year})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <Legend color="bg-red-500" label="วันหยุดราชการ" />
                        <Legend color="bg-purple-500" label="วันหยุดบริษัท" />
                        <Legend color="bg-gray-300" label="วันหยุดประจำสัปดาห์" />
                    </div>
                </div>
                <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-100">
                    จำนวนวันหยุดทั้งหมดในปี {selectedYear + 543}: <span className="font-bold text-rose-600 text-lg">{holidays.filter(h => new Date(h.date).getFullYear() === selectedYear).length}</span> วัน
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
                            <Th>วันที่ (Date)</Th>
                            <Th>ชื่อวันหยุด (Holiday Name)</Th>
                            <Th className="text-center">ประเภท (Type)</Th>
                            <Th className="text-center">จัดการ (Actions)</Th>
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



            {/* หน้าต่างแก้ไข/เพิ่มข้อมูล (Add/Edit Modal) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">{editingId ? 'แก้ไขข้อมูลวันหยุด' : 'เพิ่มข้อมูลวันหยุดใหม่'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <FormInput
                                label="วันที่วันหยุด"
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                            <FormInput
                                label="ชื่อวันหยุด"
                                name="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="เช่น วันขึ้นปีใหม่"
                            />
                            <FormSelect
                                label="ประเภทวันหยุด"
                                name="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="government">วันหยุดราชการ</option>
                                <option value="company">วันหยุดบริษัท</option>
                            </FormSelect>
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.recurring}
                                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">เกิดขึ่นซ้ำทุกปี (Repeat Yearly)</p>
                                    <p className="text-xs text-gray-500">ติ๊กถูกหากวันหยุดนี้ตรงกับวันที่เดิมทุกปี</p>
                                </div>
                            </label>
                        </div>
                        <div className="p-6 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowModal(false)}>ยกเลิก (Cancel)</Button>
                            <Button variant="primary" onClick={handleSaveHoliday} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 min-w-[120px]">
                                {isSubmitting ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไข' : 'เพิ่มวันหยุด')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * คำอธิบายสัญลักษณ์ในปฏิทิน
 * @component
 */
function Legend({ color, label }) {
    return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <span className={`w-3.5 h-3.5 ${color} rounded shadow-sm`}></span>
            {label}
        </span>
    );
}

/**
 * ส่วนประกอบปฏิทินรายเดือน
 * @component
 * @param {Object} props
 * @param {string} props.month - ชื่อเดือนที่จะแสดง
 * @param {number} props.startDay - วันเริ่มต้นของสัปดาห์ (0-6)
 * @param {number} props.days - จำนวนวันในเดือนนั้น
 * @param {Array} props.holidays - รายการวันหยุดในเดือนนั้น
 */
function MonthCalendar({ month, startDay, days, holidays }) {
    const daysArray = Array.from({ length: days }, (_, i) => i + 1);
    const emptyStart = Array.from({ length: startDay }, (_, i) => i);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
            <div className="bg-rose-600 text-white px-4 py-2.5">
                <h3 className="font-bold text-center text-sm">{month}</h3>
            </div>
            <div className="p-4">
                {/* ชื่อวันในสัปดาห์ */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-2 border-b border-gray-50 pb-1">
                    <div className="text-red-500">อา</div>
                    <div>จ</div>
                    <div>อ</div>
                    <div>พ</div>
                    <div>พฤ</div>
                    <div>ศ</div>
                    <div className="text-indigo-400">ส</div>
                </div>
                {/* วันที่ในปฏิทิน */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {emptyStart.map((_, i) => <div key={`empty-${i}`}></div>)}
                    {daysArray.map(day => {
                        const holiday = holidays.find(h => h.day === day);
                        let bgClass = "bg-white hover:bg-gray-50";
                        let textClass = "text-gray-700 font-medium";
                        let title = "";

                        // ตรวจสอบวันหยุดประจำสัปดาห์ (อาทิตย์ และ เสาร์)
                        const currentDayIndex = (startDay + day - 1) % 7;
                        const isWeekend = currentDayIndex === 0 || currentDayIndex === 6;

                        if (holiday) {
                            bgClass = holiday.type === 'government' ? 'bg-red-500 text-white shadow-sm scale-110 z-10' : 'bg-purple-500 text-white shadow-sm scale-110 z-10';
                            textClass = "font-black";
                            title = holiday.name;
                        } else if (isWeekend) {
                            bgClass = "bg-gray-50";
                            textClass = currentDayIndex === 0 ? "text-red-400" : "text-indigo-300";
                        }

                        return (
                            <div
                                key={day}
                                className={`h-8 flex items-center justify-center rounded-lg transition-all ${bgClass} ${textClass} ${holiday ? 'cursor-help relative group' : ''}`}
                            >
                                {day}
                                {holiday && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                                        {holiday.name}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/** ส่วนหัวตาราง (Table Header) */
function Th({ children, className = "text-left" }) {
    return <th className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${className}`}>{children}</th>;
}

/**
 * แถวข้อมูลวันหยุดในตาราง
 * @component
 */
function HolidayRow({ date, name, type, onDelete, onEdit }) {
    const typeBadge = type === 'government'
        ? <Badge variant="error" className="bg-red-50 text-red-700 border-red-100">วันหยุดราชการ (Gov)</Badge>
        : <Badge variant="indigo" className="bg-purple-50 text-purple-700 border-purple-100">วันหยุดบริษัท (Corp)</Badge>;

    return (
        <tr className="hover:bg-gray-50/80 transition-colors group">
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">{date}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className="text-sm text-gray-900 font-medium">{name}</span>
            </td>
            <td className="px-6 py-4 text-center">{typeBadge}</td>
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} title="แก้ไข" className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} title="ลบ" className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
