/**
 * @file slaCalculator.js
 * @description เครื่องคำนวณวันกำหนดส่งงาน (Due Date) ตาม SLA
 * โดยคำนวณเฉพาะ "วันทำการ" (Working Days) เท่านั้น
 * 
 * Logic:
 * 1. ไม่นับวันเสาร์-อาทิตย์
 * 2. ไม่นับวันหยุดนักขัตฤกษ์ (Company Holidays)
 * 3. ถ้าวันกำหนดส่งตรงกับวันหยุด ให้เลื่อนไปวันทำการถัดไป
 */

/**
 * เพิ่มจำนวนวันทำการให้กับวันที่เริ่มต้น
 * 
 * @param {Date|string} startDate - วันที่เริ่มต้น
 * @param {number} days - จำนวนวันทำการที่ต้องการบวกเพิ่ม (SLA)
 * @param {Array<{date: string}>} holidays - รายการวันหยุด (Array of objects with date string 'YYYY-MM-DD')
 * @returns {Date} - วันกำหนดส่งที่คำนวณแล้ว (Due Date)
 */
export const addWorkDays = (startDate, days, holidays = []) => {
    // Clone วันที่เริ่มต้นเพื่อไม่ให้กระทบตัวแปรต้นฉบับ
    let currentDate = new Date(startDate);

    // แปลง Format วันหยุดให้เป็น Set เพื่อ Cache ให้ค้นหาเร็วขึ้น O(1)
    // format: "YYYY-MM-DD"
    const holidaySet = new Set(
        holidays.map(h => {
            // รองรับทั้ง object {date: '...'} หรือ string '...'
            const d = typeof h === 'string' ? h : h.date;
            return d ? d.split('T')[0] : '';
        })
    );

    let count = 0;

    // วนลูปบวกวันทีละ 1 จนกว่าจะครบจำนวนวันทำการ (days)
    while (count < days) {
        // บวก 1 วัน
        currentDate.setDate(currentDate.getDate() + 1);

        // ตรวจสอบว่าเป็นวันทำการหรือไม่?
        if (isWorkingDay(currentDate, holidaySet)) {
            count++; // ถ้านับได้ ให้เพิ่มตัวนับ
        }
        // ถ้าเป็นวันหยุด (Weekend/Holiday) ลูปจะทำงานต่อโดยไม่เพิ่ม count
    }

    return currentDate;
};

/**
 * ตรวจสอบว่าวันที่ระบุเป็นวันทำการหรือไม่
 * 
 * @param {Date} date - วันที่ต้องการตรวจสอบ
 * @param {Set<string>} holidaySet - Set ของวันหยุดนักขัตฤกษ์
 * @returns {boolean} - true = วันทำการ, false = วันหยุด
 */
function isWorkingDay(date, holidaySet) {
    const dayOfWeek = date.getDay();

    // 1. ตรวจสอบวันเสาร์-อาทิตย์
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }

    // 2. ตรวจสอบวันหยุดนักขัตฤกษ์
    // แปลงวันที่เป็น string "YYYY-MM-DD" เพื่อเทียบกับ Set
    const dateString = date.toISOString().split('T')[0];
    if (holidaySet.has(dateString)) {
        return false;
    }

    return true; // ไม่ใช่เสาร์-อาทิตย์ และไม่ใช่วันนักขัตฤกษ์
}

/**
 * คำนวณวันทำงานที่เหลือ (Remaining Working Days)
 * 
 * @param {Date|string} dueDate - วันกำหนดส่ง
 * @param {Array} holidays - รายการวันหยุด
 * @returns {number} - จำนวนวันทำการที่เหลือ (ติดลบ = เลยกำหนด)
 */
export const getRemainingWorkingDays = (dueDate, holidays = []) => {
    const start = new Date(); // วันนี้
    start.setHours(0, 0, 0, 0); // Reset เวลาเป็นเที่ยงคืน

    const end = new Date(dueDate);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
        // ถ้าเลยกำหนดแล้ว ให้คำนวณย้อนหลัง (คืนค่าติดลบ)
        // TODO: อาจจะ Implement logic นับวันทำการย้อนหลังในอนาคต
        // ตอนนี้คืนค่าเป็น days difference แบบปกติไปก่อน
        const diffTime = end - start;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // คำนวณวันทำการระหว่างช่วงเวลา
    let currentDate = new Date(start);
    let workingDays = 0;

    const holidaySet = new Set(holidays.map(h => (typeof h === 'string' ? h : h.date).split('T')[0]));

    while (currentDate < end) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (isWorkingDay(currentDate, holidaySet)) {
            workingDays++;
        }
    }

    return workingDays;
};
