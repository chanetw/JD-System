/**
 * @file slaCalculator.js
 * @description ฟังก์ชันคำนวณ SLA (Service Level Agreement) Due Date
 * คำนวณวันกำหนดส่งโดยนับเฉพาะวันทำการ (จันทร์-ศุกร์) และข้ามวันหยุดราชการ
 * 
 * Senior Programmer Notes:
 * - Input: วันเริ่มต้น, จำนวนวันทำการ (SLA Days), รายการวันหยุด
 * - Output: วันที่กำหนดส่ง (Due Date)
 * - ข้ามวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์
 */

/**
 * @function calculateDueDate
 * @description คำนวณวันกำหนดส่งโดยนับเฉพาะวันทำการ
 * 
 * @param {Date|string} startDate - วันที่เริ่มต้น (Date object หรือ ISO string)
 * @param {number} slaDays - จำนวนวันทำการ (เช่น 3, 5, 7)
 * @param {Array} holidays - รายการวันหยุด [{date: '2026-01-01', name: 'ปีใหม่'}, ...]
 * @returns {Date} - วันที่กำหนดส่ง
 * 
 * @example
 * const dueDate = calculateDueDate(new Date(), 3, holidays);
 * // วันนี้ = วันศุกร์ → Due Date = วันพุธหน้า (ข้ามเสาร์-อาทิตย์)
 */
export const calculateDueDate = (startDate, slaDays, holidays = []) => {
    // แปลง startDate เป็น Date object
    let currentDate = new Date(startDate);

    // สร้าง Set ของวันหยุด (เก็บเป็น date string YYYY-MM-DD เพื่อเปรียบเทียบง่าย)
    const holidaySet = new Set(
        holidays.map(h => {
            // รองรับทั้ง h.date (string) และ h (object with date field)
            const dateStr = typeof h === 'string' ? h : (h.date || h.Day);
            return formatDateToString(new Date(dateStr));
        })
    );

    let daysRemaining = slaDays;

    // วนลูปจนกว่าจะนับครบ SLA Days
    while (daysRemaining > 0) {
        // เลื่อนไปวันถัดไป
        currentDate.setDate(currentDate.getDate() + 1);

        // ตรวจสอบว่าเป็นวันทำการหรือไม่
        const isWeekend = isWeekendDay(currentDate);
        const isHoliday = holidaySet.has(formatDateToString(currentDate));

        // ถ้าเป็นวันทำการ (ไม่ใช่วันหยุดและไม่ใช่สุดสัปดาห์)
        if (!isWeekend && !isHoliday) {
            daysRemaining--;
        }
    }

    return currentDate;
};

/**
 * @function isWeekendDay
 * @description ตรวจสอบว่าเป็นวันเสาร์หรืออาทิตย์หรือไม่
 * @param {Date} date - วันที่ต้องการตรวจสอบ
 * @returns {boolean} - true ถ้าเป็นวันเสาร์หรืออาทิตย์
 */
const isWeekendDay = (date) => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return dayOfWeek === 0 || dayOfWeek === 6;
};

/**
 * @function formatDateToString
 * @description แปลง Date object เป็น string รูปแบบ YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} - วันที่ในรูปแบบ YYYY-MM-DD
 */
const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * @function formatDateToThai
 * @description แปลงวันที่เป็นรูปแบบภาษาไทย (DD เดือน YYYY)
 * @param {Date} date - Date object
 * @returns {string} - วันที่ภาษาไทย เช่น "15 มกราคม 2569"
 */
export const formatDateToThai = (date) => {
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.

    return `${day} ${month} ${year}`;
};

/**
 * @function getWorkingDays
 * @description คำนวณจำนวนวันทำการระหว่าง 2 วันที่
 * @param {Date} startDate - วันที่เริ่มต้น
 * @param {Date} endDate - วันที่สิ้นสุด
 * @param {Array} holidays - รายการวันหยุด
 * @returns {number} - จำนวนวันทำการ
 */
export const getWorkingDays = (startDate, endDate, holidays = []) => {
    const holidaySet = new Set(
        holidays.map(h => {
            const dateStr = typeof h === 'string' ? h : (h.date || h.Day);
            return formatDateToString(new Date(dateStr));
        })
    );

    let workingDays = 0;
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
        const isWeekend = isWeekendDay(currentDate);
        const isHoliday = holidaySet.has(formatDateToString(currentDate));

        if (!isWeekend && !isHoliday) {
            workingDays++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
};
