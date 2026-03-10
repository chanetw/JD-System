/**
 * Working Hours Helper
 * 
 * ตรวจสอบและปรับวันที่/เวลาให้อยู่ในเวลาทำการ
 * - เวลาทำการ: 8:00-18:00
 * - วันทำการ: จันทร์-ศุกร์ (ไม่รวมวันหยุดราชการ)
 */
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * ตรวจสอบว่าเวลาอยู่ในช่วงเวลาทำการหรือไม่ (8:00-18:00)
 * @param {Date} dateTime - วันที่และเวลาที่ต้องการตรวจสอบ
 * @returns {Object} { isValid: boolean, hour: number, reason: string }
 */
function validateWorkingHours(dateTime) {
    const date = new Date(dateTime);
    const hour = date.getHours();
    
    if (hour < 8) {
        return {
            isValid: false,
            hour,
            reason: 'before_working_hours',
            message: 'ก่อนเวลาทำการ (< 8:00)'
        };
    }
    
    if (hour >= 18) {
        return {
            isValid: false,
            hour,
            reason: 'after_working_hours',
            message: 'หลังเวลาทำการ (≥ 18:00)'
        };
    }
    
    return {
        isValid: true,
        hour,
        reason: null,
        message: 'อยู่ในเวลาทำการ'
    };
}

/**
 * ตรวจสอบว่าเป็นวันทำการหรือไม่ (ไม่ใช่เสาร์-อาทิตย์)
 * @param {Date} date - วันที่ที่ต้องการตรวจสอบ
 * @returns {Object} { isValid: boolean, dayOfWeek: number, reason: string }
 */
function validateBusinessDay(date) {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0=Sunday, 6=Saturday
    
    if (dayOfWeek === 0) {
        return {
            isValid: false,
            dayOfWeek,
            reason: 'sunday',
            message: 'วันอาทิตย์'
        };
    }
    
    if (dayOfWeek === 6) {
        return {
            isValid: false,
            dayOfWeek,
            reason: 'saturday',
            message: 'วันเสาร์'
        };
    }
    
    // TODO: เพิ่มการตรวจสอบวันหยุดราชการ/วันหยุดบริษัท
    // const isCompanyHoliday = checkCompanyHoliday(d);
    // if (isCompanyHoliday) {
    //     return { isValid: false, dayOfWeek, reason: 'company_holiday', message: 'วันหยุดบริษัท' };
    // }
    
    return {
        isValid: true,
        dayOfWeek,
        reason: null,
        message: 'วันทำการ'
    };
}

/**
 * ปรับวันที่/เวลาให้อยู่ในเวลาทำการ
 * กฎการปรับ:
 * - วันเสาร์ → จันทร์ 9:00
 * - วันอาทิตย์ → จันทร์ 9:00
 * - วันทำการ < 8:00 → 9:00 ของวันเดียวกัน
 * - วันทำการ ≥ 18:00 → 9:00 ของวันถัดไป
 * 
 * @param {Date|string} dateTime - วันที่และเวลาที่ต้องการปรับ
 * @returns {Date} วันที่และเวลาที่ปรับแล้ว
 */
function adjustToWorkingHours(dateTime) {
    const date = new Date(dateTime);
    let adjusted = new Date(date);
    
    // ตรวจสอบวันหยุดก่อน
    const businessDayValidation = validateBusinessDay(adjusted);
    
    if (!businessDayValidation.isValid) {
        // ถ้าเป็นวันเสาร์ → ข้ามไปจันทร์
        if (businessDayValidation.reason === 'saturday') {
            adjusted.setDate(adjusted.getDate() + 2);
            adjusted.setHours(9, 0, 0, 0);
            return adjusted;
        }
        
        // ถ้าเป็นวันอาทิตย์ → ข้ามไปจันทร์
        if (businessDayValidation.reason === 'sunday') {
            adjusted.setDate(adjusted.getDate() + 1);
            adjusted.setHours(9, 0, 0, 0);
            return adjusted;
        }
    }
    
    // ตรวจสอบเวลาทำการ
    const workingHoursValidation = validateWorkingHours(adjusted);
    
    if (!workingHoursValidation.isValid) {
        // ถ้าก่อนเวลาทำการ (< 8:00) → ปรับเป็น 9:00 ของวันเดียวกัน
        if (workingHoursValidation.reason === 'before_working_hours') {
            adjusted.setHours(9, 0, 0, 0);
            return adjusted;
        }
        
        // ถ้าหลังเวลาทำการ (≥ 18:00) → ปรับเป็น 9:00 ของวันถัดไป
        if (workingHoursValidation.reason === 'after_working_hours') {
            adjusted.setDate(adjusted.getDate() + 1);
            adjusted.setHours(9, 0, 0, 0);
            
            // ตรวจสอบว่าวันถัดไปเป็นวันหยุดหรือไม่
            const nextDayValidation = validateBusinessDay(adjusted);
            if (!nextDayValidation.isValid) {
                // ถ้าวันถัดไปเป็นวันหยุด ให้ปรับอีกครั้ง
                return adjustToWorkingHours(adjusted);
            }
            
            return adjusted;
        }
    }
    
    // ถ้าอยู่ในเวลาทำการแล้ว ไม่ต้องปรับ
    return adjusted;
}

/**
 * ตรวจสอบและปรับ dueDate พร้อมสร้าง adjustment reasons
 * @param {Date|string} dueDate - วันที่กำหนดส่งที่ต้องการตรวจสอบ
 * @returns {Object} { 
 *   originalDate: Date, 
 *   adjustedDate: Date, 
 *   needsAdjustment: boolean, 
 *   reasons: string[] 
 * }
 */
function validateAndAdjustDueDate(dueDate) {
    const originalDate = new Date(dueDate);
    const businessDayValidation = validateBusinessDay(originalDate);
    const workingHoursValidation = validateWorkingHours(originalDate);
    
    const needsAdjustment = !businessDayValidation.isValid || !workingHoursValidation.isValid;
    const reasons = [];
    
    if (!businessDayValidation.isValid) {
        reasons.push(businessDayValidation.message);
    }
    
    if (!workingHoursValidation.isValid) {
        reasons.push(workingHoursValidation.message);
    }
    
    const adjustedDate = needsAdjustment ? adjustToWorkingHours(originalDate) : originalDate;
    
    return {
        originalDate,
        adjustedDate,
        needsAdjustment,
        reasons,
        validation: {
            businessDay: businessDayValidation,
            workingHours: workingHoursValidation
        }
    };
}

/**
 * Format adjustment message สำหรับ activity log
 * @param {Date} originalDate - วันที่เดิม
 * @param {Date} adjustedDate - วันที่ที่ปรับแล้ว
 * @param {string[]} reasons - เหตุผลการปรับ
 * @returns {string} ข้อความอธิบายการปรับ
 */
function formatAdjustmentMessage(originalDate, adjustedDate, reasons) {
    const originalStr = format(originalDate, 'dd/MM/yyyy HH:mm', { locale: th });
    const adjustedStr = format(adjustedDate, 'dd/MM/yyyy HH:mm', { locale: th });
    const reasonStr = reasons.join(', ');
    
    return `Due Date ถูกปรับ: ${originalStr} → ${adjustedStr} (${reasonStr})`;
}

export {
    validateWorkingHours,
    validateBusinessDay,
    adjustToWorkingHours,
    validateAndAdjustDueDate,
    formatAdjustmentMessage
};
