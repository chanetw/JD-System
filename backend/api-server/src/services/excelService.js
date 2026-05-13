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

            if (rawData.length === 0) {
                return [];
            }

            // รองรับทั้ง 2 contract:
            // 1) Template import: Date, Name, Type, Description
            // 2) Export from production: ลำดับ, วันที่ (Date), ชื่อวันหยุด (Holiday Name), ประเภท (Type)
            const headerRow = rawData[0] || [];
            const dataRows = rawData.slice(1);
            const format = this.detectHolidayFileFormat(headerRow, dataRows);

            // Parse แต่ละแถวและแปลงเป็นรูปแบบที่ต้องการ
            const parsedHolidays = dataRows
                .map((row) => this.parseHolidayRow(row, format))
                .filter((holiday) => holiday !== null); // กรองแถวที่ไม่ถูกต้องออก

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
     * ตรวจสอบ format ของไฟล์ import
     *
     * @param {Array} headerRow - แถว header
     * @param {Array<Array>} dataRows - แถวข้อมูล
     * @returns {'template'|'export'} - รูปแบบไฟล์
     */
    detectHolidayFileFormat(headerRow = [], dataRows = []) {
        const normalizedHeaders = headerRow
            .map((header) => this.normalizeText(header).toLowerCase())
            .filter(Boolean);

        const headerText = normalizedHeaders.join(' | ');

        if (
            headerText.includes('ลำดับ')
            || headerText.includes('holiday name')
            || headerText.includes('วันที่ (date)')
        ) {
            return 'export';
        }

        if (
            headerText.includes('date (dd/mm/yyyy)')
            || headerText.includes('description')
        ) {
            return 'template';
        }

        const firstDataRow = dataRows.find((row) => Array.isArray(row) && row.some((cell) => cell !== ''));
        if (firstDataRow) {
            const exportLooksValid = Boolean(
                this.parseDate(firstDataRow[1])
                && this.normalizeText(firstDataRow[2])
                && this.isHolidayTypeValue(firstDataRow[3])
            );

            const templateLooksValid = Boolean(
                this.parseDate(firstDataRow[0])
                && this.normalizeText(firstDataRow[1])
                && this.isHolidayTypeValue(firstDataRow[2])
            );

            if (exportLooksValid && !templateLooksValid) {
                return 'export';
            }

            if (templateLooksValid && !exportLooksValid) {
                return 'template';
            }

            if (exportLooksValid) {
                return 'export';
            }
        }

        return 'template';
    }

    /**
     * Parse holiday row ตาม format ที่ตรวจพบ
     *
     * @param {Array} row - ข้อมูลแถว
     * @param {'template'|'export'} format - รูปแบบไฟล์
     * @returns {Object|null}
     */
    parseHolidayRow(row, format) {
        if (!Array.isArray(row) || row.length === 0) {
            return null;
        }

        const layouts = format === 'export' ? ['export', 'template'] : ['template', 'export'];

        for (const layout of layouts) {
            const parsedHoliday = this.parseHolidayRowByLayout(row, layout);
            if (parsedHoliday) {
                return parsedHoliday;
            }
        }

        return null;
    }

    /**
     * Parse holiday row ตาม layout เฉพาะ
     *
     * @param {Array} row - ข้อมูลแถว
     * @param {'template'|'export'} layout - layout ของไฟล์
     * @returns {Object|null}
     */
    parseHolidayRowByLayout(row, layout) {
        if (layout === 'export') {
            const [, dateValue, nameValue, typeValue] = row;
            const date = this.parseDate(dateValue);
            const name = this.normalizeText(nameValue);

            if (!date || !name) {
                return null;
            }

            return {
                date,
                name,
                type: this.normalizeHolidayType(typeValue),
                description: null,
            };
        }

        const [dateValue, nameValue, typeValue, descriptionValue] = row;
        const date = this.parseDate(dateValue);
        const name = this.normalizeText(nameValue);

        if (!date || !name) {
            return null;
        }

        return {
            date,
            name,
            type: this.normalizeHolidayType(typeValue),
            description: this.normalizeText(descriptionValue) || null,
        };
    }

    /**
     * แปลงข้อความให้อยู่ในรูปแบบมาตรฐาน
     *
     * @param {unknown} value - ค่า input
     * @returns {string} - ข้อความ trimmed หรือค่าว่าง
     */
    normalizeText(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value).trim();
    }

    /**
     * แปลงค่าประเภทวันหยุดให้เป็นค่ามาตรฐาน
     *
     * @param {unknown} value - ค่า input
     * @returns {string} - government | company
     */
    normalizeHolidayType(value) {
        const normalized = this.normalizeText(value).toLowerCase();

        if (
            normalized === 'government'
            || normalized === 'gov'
            || normalized.includes('ราชการ')
        ) {
            return 'government';
        }

        if (
            normalized === 'company'
            || normalized === 'business'
            || normalized.includes('บริษัท')
        ) {
            return 'company';
        }

        return normalized || 'government';
    }

    /**
     * ตรวจว่าค่า type เป็นค่าที่รู้จักหรือไม่
     *
     * @param {unknown} value - ค่า input
     * @returns {boolean}
     */
    isHolidayTypeValue(value) {
        const normalized = this.normalizeText(value).toLowerCase();

        return Boolean(
            normalized === 'government'
            || normalized === 'gov'
            || normalized === 'company'
            || normalized === 'business'
            || normalized.includes('ราชการ')
            || normalized.includes('บริษัท')
        );
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
            if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
                return this.formatDateParts(
                    dateInput.getFullYear(),
                    dateInput.getMonth() + 1,
                    dateInput.getDate()
                );
            }

            // กรณี Excel Serial Number (เช่น 44197 = 2020-12-01)
            if (typeof dateInput === 'number') {
                const date = xlsx.SSF.parse_date_code(dateInput);
                if (!date) {
                    return null;
                }
                return this.formatDateParts(date.y, date.m, date.d);
            }

            // กรณี String DD/MM/YYYY หรือวันที่แบบ Thai locale เช่น 29 เมษายน 2569
            if (typeof dateInput === 'string') {
                const trimmed = dateInput.trim();

                const slashParts = trimmed.split('/');
                if (slashParts.length === 3) {
                    const [day, month, year] = slashParts;
                    return this.formatDateParts(
                        this.normalizeYear(year),
                        month,
                        day
                    );
                }

                const thaiDate = this.parseLocalizedDate(trimmed);
                if (thaiDate) {
                    return thaiDate;
                }
            }

            return null;
        } catch (error) {
            console.error('[ExcelService] Date parse error:', dateInput, error);
            return null;
        }
    }

    /**
     * แปลงวันที่จากรูปแบบ localized text เช่น 29 เมษายน 2569
     *
     * @param {string} dateInput - วันที่แบบข้อความ
     * @returns {string|null}
     */
    parseLocalizedDate(dateInput) {
        const normalized = this.normalizeText(dateInput);
        if (!normalized) {
            return null;
        }

        const parts = normalized.split(/\s+/);
        if (parts.length < 3) {
            return null;
        }

        const day = parts[0];
        const year = parts[parts.length - 1];
        const monthText = parts.slice(1, -1).join(' ').toLowerCase();

        const monthMap = {
            มกราคม: 1,
            กุมภาพันธ์: 2,
            มีนาคม: 3,
            เมษายน: 4,
            พฤษภาคม: 5,
            มิถุนายน: 6,
            กรกฎาคม: 7,
            สิงหาคม: 8,
            กันยายน: 9,
            ตุลาคม: 10,
            พฤศจิกายน: 11,
            ธันวาคม: 12,
            january: 1,
            february: 2,
            march: 3,
            april: 4,
            may: 5,
            june: 6,
            july: 7,
            august: 8,
            september: 9,
            october: 10,
            november: 11,
            december: 12,
        };

        const month = monthMap[monthText];
        if (!month) {
            return null;
        }

        return this.formatDateParts(this.normalizeYear(year), month, day);
    }

    /**
     * Normalize ปี พ.ศ. ให้เป็น ค.ศ. ถ้าจำเป็น
     *
     * @param {string|number} yearInput - ปี
     * @returns {number|null}
     */
    normalizeYear(yearInput) {
        const year = Number.parseInt(yearInput, 10);
        if (Number.isNaN(year)) {
            return null;
        }

        return year > 2400 ? year - 543 : year;
    }

    /**
     * สร้าง YYYY-MM-DD แบบตรวจสอบ validity
     *
     * @param {number|string} yearInput
     * @param {number|string} monthInput
     * @param {number|string} dayInput
     * @returns {string|null}
     */
    formatDateParts(yearInput, monthInput, dayInput) {
        const year = Number.parseInt(yearInput, 10);
        const month = Number.parseInt(monthInput, 10);
        const day = Number.parseInt(dayInput, 10);

        if (
            Number.isNaN(year)
            || Number.isNaN(month)
            || Number.isNaN(day)
            || month < 1
            || month > 12
            || day < 1
            || day > 31
        ) {
            return null;
        }

        const date = new Date(Date.UTC(year, month - 1, day));
        if (
            date.getUTCFullYear() !== year
            || date.getUTCMonth() !== month - 1
            || date.getUTCDate() !== day
        ) {
            return null;
        }

        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
}

export default ExcelService;
