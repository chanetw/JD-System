/**
 * @file slaCalculator.js
 * @description เครื่องมือคำนวณวันกำหนดส่งตามข้อตกลงระดับบริการ (SLA Due Date Calculator)
 * 
 * วัตถุประสงค์หลัก:
 * - คำนวณวันส่งมอบงาน (Due Date) โดยนับเฉพาะวันทำการ (จันทร์-ศุกร์)
 * - รองรับการข้ามวันหยุดนักขัตฤกษ์ตามประกาศของบริษัท (Holidays)
 * - ให้บริการฟังก์ชันเสริมสำหรับการจัดการรูปแบบวันที่ภาษาไทย
 */

/**
 * คำนวณวันกำหนดส่งงานโดยเริ่มนับจากวันที่ระบุไปตามจำนวนวันทำการที่กำหนด
 * @param {Date|string} startDate - วันที่เริ่มต้นนับ (Date object หรือ ISO string)
 * @param {number} slaDays - จำนวนวันทำการ (SLA) ที่อนุญาต (เช่น 3 วัน, 5 วัน)
 * @param {Array} holidays - รายการวันหยุดนักขัตฤกษ์ (Array ของ Object ที่มีฟิลด์ date หรือ Day)
 * @returns {Date} วันกำหนดส่งส่ง (Due Date) ที่คำนวณแล้ว
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
 * ตรวจสอบว่าเป็นวันเสาร์หรืออาทิตย์หรือไม่
 * @param {Date} date - วันที่ต้องการตรวจสอบ
 * @returns {boolean} true หากเป็นวันหยุดสุดสัปดาห์
 */
const isWeekendDay = (date) => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return dayOfWeek === 0 || dayOfWeek === 6;
};

/**
 * แปลงออบเจกต์ Date ให้เป็นข้อความรูปแบบ YYYY-MM-DD สำหรับการเปรียบเทียบข้อมูล
 * @param {Date} date - วันที่
 * @returns {string} วันที่ในรูปแบบข้อความ (เช่น "2026-01-20")
 */
const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * แปลงวันที่เป็นรูปแบบภาษาไทยที่สวยงาม (วันที่ เดือน พ.ศ.)
 * @param {Date} date - วันที่
 * @returns {string} ข้อความวันที่ภาษาไทย (เช่น "20 มกราคม 2569")
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
 * คำนวณจำนวนวันทำการทั้งหมดในช่วงวันเวลาที่ระบุ
 * @param {Date} startDate - วันที่เริ่มต้น
 * @param {Date} endDate - วันที่สิ้นสุด
 * @param {Array} holidays - รายการวันหยุด
 * @returns {number} จำนวนวันทำการ
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
