/**
 * @file excelService.js
 * @description Excel Import/Export Service สำหรับการจัดการไฟล์ Excel
 * 
 * Features:
 * - สร้างไฟล์ Template Excel สำหรับ Import วันหยุด
 * - Parse ไฟล์ Excel ที่ Upload มาเป็น JSON
 * 
 * Dependencies:
 * - xlsx (SheetJS) - ใช้สำหรับอ่านและเขียนไฟล์ Excel
 */

import xlsx from 'xlsx';

class ExcelService {
    /**
     * สร้าง Excel Template สำหรับ Import วันหยุด
     * 
     * @returns {Buffer} - Excel file buffer
     */
    generateHolidayTemplate() {
        // สร้าง Workbook ใหม่
        const workbook = xlsx.utils.book_new();

        // ข้อมูลตัวอย่างสำหรับ Template
        const templateData = [
            ['Date (DD/MM/YYYY)', 'Name', 'Type', 'Description'],
            ['01/01/2026', 'วันขึ้นปีใหม่', 'government', 'New Year\'s Day'],
            ['14/02/2026', 'วันวาเลนไทน์', 'company', 'Valentine\'s Day (Company Holiday)'],
            ['13/04/2026', 'วันสงกรานต์', 'government', 'Songkran Festival'],
        ];

        // แปลงข้อมูลเป็น Worksheet
        const worksheet = xlsx.utils.aoa_to_sheet(templateData);

        // กำหนดความกว้างของคอลัมน์
        worksheet['!cols'] = [
            { wch: 20 }, // Date
            { wch: 30 }, // Name
            { wch: 15 }, // Type
            { wch: 40 }, // Description
        ];

        // เพิ่ม Worksheet เข้า Workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Holidays');

        // สร้าง Buffer จาก Workbook
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return buffer;
    }

    /**
     * Parse ไฟล์ Excel ที่ Upload มาเป็น JSON
     * 
     * @param {Buffer} fileBuffer - Excel file buffer
     * @returns {Array<Object>} - Array ของข้อมูลวันหยุดที่ Parse แล้ว
     * 
     * @example
     * [
     *   { date: '2026-01-01', name: 'วันขึ้นปีใหม่', type: 'government', description: 'New Year\'s Day' },
     *   { date: '2026-02-14', name: 'วันวาเลนไทน์', type: 'company', description: 'Valentine\'s Day' }
     * ]
     */
    parseHolidayFile(fileBuffer) {
        try {
            // อ่านไฟล์ Excel จาก Buffer
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

            // เลือก Sheet แรก
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // แปลง Worksheet เป็น JSON (skip header row)
            const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            // ลบแถวแรก (Header)
            const dataRows = rawData.slice(1);

            // Parse แต่ละแถวและแปลงเป็นรูปแบบที่ต้องการ
            const parsedHolidays = dataRows
                .filter(row => row[0] && row[1]) // กรอง row ที่มีวันที่และชื่อ
                .map(row => {
                    const [dateStr, name, type, description] = row;

                    // แปลงวันที่จาก DD/MM/YYYY เป็น YYYY-MM-DD
                    const date = this.parseDate(dateStr);

                    return {
                        date,
                        name: name.trim(),
                        type: (type || 'government').toLowerCase().trim(),
                        description: description ? description.trim() : null,
                    };
                })
                .filter(holiday => holiday.date !== null); // กรองวันที่ไม่ถูกต้องออก

            return parsedHolidays;
        } catch (error) {
            console.error('[ExcelService] Parse error:', error);
            throw new Error('ไม่สามารถอ่านไฟล์ Excel ได้: ' + error.message);
        }
    }

    /**
     * สร้างไฟล์ Excel สำหรับ Export ข้อมูลวันหยุด
     *
     * @param {Array<Object>} holidays - Array ของข้อมูลวันหยุด
     * @param {number} year - ปีที่ต้องการ Export
     * @returns {Buffer} - Excel file buffer
     */
    generateHolidayExport(holidays, year) {
        const workbook = xlsx.utils.book_new();

        // Header row
        const header = ['ลำดับ', 'วันที่ (Date)', 'ชื่อวันหยุด (Holiday Name)', 'ประเภท (Type)'];

        // Data rows
        const dataRows = holidays.map((holiday, index) => {
            const date = new Date(holiday.date);
            const thaiDate = date.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const typeLabel = holiday.type === 'government' ? 'วันหยุดราชการ' : 'วันหยุดบริษัท';

            return [index + 1, thaiDate, holiday.name, typeLabel];
        });

        // Combine header and data
        const sheetData = [header, ...dataRows];

        // Create worksheet
        const worksheet = xlsx.utils.aoa_to_sheet(sheetData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 8 },  // ลำดับ
            { wch: 25 }, // วันที่
            { wch: 35 }, // ชื่อวันหยุด
            { wch: 20 }, // ประเภท
        ];

        // Add worksheet to workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, `วันหยุดปี ${year + 543}`);

        // Generate buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return buffer;
    }

    /**
     * แปลงวันที่จาก DD/MM/YYYY หรือ Excel Serial Number เป็น YYYY-MM-DD
     *
     * @param {string|number} dateInput - วันที่ในรูปแบบต่างๆ
     * @returns {string|null} - วันที่ในรูปแบบ YYYY-MM-DD หรือ null ถ้า parse ไม่สำเร็จ
     */
    parseDate(dateInput) {
        if (!dateInput) return null;

        try {
            // กรณี Excel Serial Number (เช่น 44197 = 2020-12-01)
            if (typeof dateInput === 'number') {
                const date = xlsx.SSF.parse_date_code(dateInput);
                return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            }

            // กรณี String DD/MM/YYYY
            if (typeof dateInput === 'string') {
                const parts = dateInput.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    const parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

                    // ตรวจสอบความถูกต้องของวันที่
                    const testDate = new Date(parsedDate);
                    if (!isNaN(testDate.getTime())) {
                        return parsedDate;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('[ExcelService] Date parse error:', dateInput, error);
            return null;
        }
    }
}

export default ExcelService;
