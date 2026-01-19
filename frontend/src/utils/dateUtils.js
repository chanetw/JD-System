/**
 * @file dateUtils.js
 * @description Utility functions สำหรับจัดการวันที่
 */

/**
 * @function formatDateToThai
 * @description แปลง Date object เป็นรูปแบบวันที่ภาษาไทย
 * @param {Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} วันที่ในรูปแบบ "1 ม.ค. 68"
 */
export const formatDateToThai = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        return '-';
    }

    const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = (date.getFullYear() + 543).toString().slice(-2); // แปลงเป็น พ.ศ. และเอา 2 หลักท้าย

    return `${day} ${month} ${year}`;
};

/**
 * @function formatDateTimeToThai
 * @description แปลง Date object เป็นรูปแบบวันที่และเวลาภาษาไทย
 * @param {Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} วันที่และเวลาในรูปแบบ "1 ม.ค. 68 14:30"
 */
export const formatDateTimeToThai = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        return '-';
    }

    const dateStr = formatDateToThai(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dateStr} ${hours}:${minutes}`;
};

/**
 * @function calculateDueDate
 * @description คำนวณวันครบกำหนดโดยนับเฉพาะวันทำการ
 * @param {Date} startDate - วันที่เริ่มต้น
 * @param {number} workingDays - จำนวนวันทำการ
 * @param {Array} holidays - รายการวันหยุด (array ของ Date objects หรือ strings)
 * @returns {Date} วันครบกำหนด
 */
export const calculateDueDate = (startDate, workingDays, holidays = []) => {
    if (!startDate || !(startDate instanceof Date) || isNaN(startDate)) {
        return null;
    }

    // แปลง holidays เป็น Set ของ date strings สำหรับเช็คเร็วขึ้น
    const holidaySet = new Set(
        holidays.map(h => {
            const d = h instanceof Date ? h : new Date(h);
            return d.toISOString().split('T')[0];
        })
    );

    let currentDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < workingDays) {
        currentDate.setDate(currentDate.getDate() + 1);

        const dayOfWeek = currentDate.getDay();
        const dateStr = currentDate.toISOString().split('T')[0];

        // นับเฉพาะวันจันทร์-ศุกร์ และไม่ใช่วันหยุด
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
            daysAdded++;
        }
    }

    return currentDate;
};

/**
 * @function getWorkingDaysBetween
 * @description คำนวณจำนวนวันทำการระหว่างสองวันที่
 * @param {Date} startDate - วันที่เริ่มต้น
 * @param {Date} endDate - วันที่สิ้นสุด
 * @param {Array} holidays - รายการวันหยุด
 * @returns {number} จำนวนวันทำการ
 */
export const getWorkingDaysBetween = (startDate, endDate, holidays = []) => {
    if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date)) {
        return 0;
    }

    const holidaySet = new Set(
        holidays.map(h => {
            const d = h instanceof Date ? h : new Date(h);
            return d.toISOString().split('T')[0];
        })
    );

    let currentDate = new Date(startDate);
    let workingDays = 0;

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = currentDate.toISOString().split('T')[0];

        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
            workingDays++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
};

/**
 * @function isWorkingDay
 * @description ตรวจสอบว่าวันที่ที่ระบุเป็นวันทำการหรือไม่
 * @param {Date} date - วันที่ที่ต้องการตรวจสอบ
 * @param {Array} holidays - รายการวันหยุด
 * @returns {boolean} true ถ้าเป็นวันทำการ
 */
export const isWorkingDay = (date, holidays = []) => {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        return false;
    }

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false; // วันเสาร์-อาทิตย์
    }

    const dateStr = date.toISOString().split('T')[0];
    const isHoliday = holidays.some(h => {
        const holidayDate = h instanceof Date ? h : new Date(h);
        return holidayDate.toISOString().split('T')[0] === dateStr;
    });

    return !isHoliday;
};
