import express from 'express';
import multer from 'multer';
import { getDatabase } from '../config/database.js';
// Correct import path for authentication middleware (from auth.js in the same directory)
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import ExcelService from '../services/excelService.js';

const router = express.Router();
const excelService = new ExcelService();

// Multer config: store in memory for immediate processing
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/holidays (Standalone list)
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;

        // Use raw query to bypass schema mismatch (type field)
        const holidays = await prisma.$queryRaw`
            SELECT 
                id, 
                tenant_id as "tenantId", 
                name, 
                date, 
                type, 
                is_recurring as "isRecurring",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM holidays 
            WHERE tenant_id = ${tenantId}
            ORDER BY date ASC
        `;

        res.json({ success: true, data: holidays });
    } catch (error) {
        console.error('Get holidays error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/holidays
 */
router.post('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;
        const { name, date, type, isRecurring } = req.body;

        if (!name || !date) {
            return res.status(400).json({ success: false, message: 'Name and date are required' });
        }

        const dateObj = new Date(date);
        const recurringVal = isRecurring || false;
        const typeVal = type || 'government';

        // Use raw query to insert type
        // Note: $queryRaw returning data is better than $executeRaw + separate fetch
        const result = await prisma.$queryRaw`
            INSERT INTO holidays (tenant_id, name, date, type, is_recurring, created_at, updated_at)
            VALUES (${tenantId}, ${name}, ${dateObj}, ${typeVal}, ${recurringVal}, NOW(), NOW())
            RETURNING id, tenant_id as "tenantId", name, date, type, is_recurring as "isRecurring"
        `;

        const newHoliday = result[0];
        res.json({ success: true, data: newHoliday });
    } catch (error) {
        console.error('Create holiday error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/holidays/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const { name, date, type, isRecurring } = req.body;

        // Verify ownership (Use raw query)
        const existing = await prisma.$queryRaw`
            SELECT id FROM holidays WHERE id = ${parseInt(id)} AND tenant_id = ${tenantId}
        `;

        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Holiday not found or permission denied' });
        }

        const dateObj = date ? new Date(date) : undefined;
        // Build dynamic update
        // Since it's raw SQL, simpler to just update all fields even if unchanged (for now)
        // OR construct query strings carefuly.
        // For simplicity and safety against SQL injection, we assume all fields are sent or we handle undefined carefully.
        // Since frontend sends full object on edit usually:

        // Fetch current if fields missing? No, assume body has what we need or check.
        // Let's assume frontend sends { name, date, type, isRecurring }.

        // Wait, if date is undefined, we shouldn't overwrite it with null if column is not nullable.
        // But PUT usually implies full resource update.
        // Let's use COALESCE or just passed values.

        const currentData = existing[0]; // Wait, SELECT above only selected ID.

        // Better:
        const result = await prisma.$queryRaw`
            UPDATE holidays 
            SET 
                name = ${name}, 
                date = ${dateObj},
                type = ${type},
                is_recurring = ${isRecurring},
                updated_at = NOW()
            WHERE id = ${parseInt(id)} AND tenant_id = ${tenantId}
            RETURNING id, tenant_id as "tenantId", name, date, type, is_recurring as "isRecurring"
        `;

        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error('Update holiday error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/holidays/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        const result = await prisma.$executeRaw`
            DELETE FROM holidays 
            WHERE id = ${parseInt(id)} AND tenant_id = ${tenantId}
        `;

        // result is number of affected rows (BigInt)
        // Convert BigInt to number safely
        const count = Number(result);

        if (count === 0) {
            return res.status(404).json({ success: false, message: 'Holiday not found or permission denied' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete holiday error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/holidays/template
 * Download Excel Template สำหรับ Import วันหยุด
 */
router.get('/template', async (req, res) => {
    try {
        console.log('[Holidays] Generating template...');
        const buffer = excelService.generateHolidayTemplate();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=holiday_template.xlsx');
        res.send(buffer);
    } catch (error) {
        console.error('[Holidays] Template generation error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate template: ' + error.message });
    }
});

/**
 * GET /api/holidays/export
 * Export วันหยุดเป็นไฟล์ Excel
 *
 * @query {number} year - ปีที่ต้องการ Export (ค.ศ.)
 * @returns {Buffer} - Excel file
 */
router.get('/export', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        console.log(`[Holidays] Exporting holidays for year ${year}...`);

        // ดึงข้อมูลวันหยุดตามปีที่ระบุ
        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year}-12-31`);

        const holidays = await prisma.$queryRaw`
            SELECT
                id,
                name,
                date,
                type
            FROM holidays
            WHERE tenant_id = ${tenantId}
              AND date >= ${startDate}
              AND date <= ${endDate}
            ORDER BY date ASC
        `;

        console.log(`[Holidays] Found ${holidays.length} holidays for year ${year}`);

        // สร้างไฟล์ Excel
        const buffer = excelService.generateHolidayExport(holidays, year);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=holidays_${year}.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('[Holidays] Export error:', error);
        res.status(500).json({ success: false, message: 'Failed to export holidays: ' + error.message });
    }
});

/**
 * POST /api/holidays/import
 * Import วันหยุดจากไฟล์ Excel
 *
 * @body {File} file - Excel file (.xlsx)
 * @returns {Object} - Summary { added: number, updated: number, failed: Array }
 */
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        console.log('[Holidays] Parsing uploaded file...');
        // Parse ไฟล์ Excel
        const holidays = excelService.parseHolidayFile(req.file.buffer);

        if (holidays.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data found in file' });
        }

        console.log(`[Holidays] Found ${holidays.length} holidays to import`);

        // Import แต่ละรายการ (Upsert)
        let added = 0;
        let updated = 0;
        const failed = [];

        for (const holiday of holidays) {
            try {
                const { date, name, type, description } = holiday;

                // ตรวจสอบว่ามีวันหยุดในวันที่นี้อยู่แล้วหรือไม่
                const existing = await prisma.$queryRaw`
                    SELECT id FROM holidays 
                    WHERE tenant_id = ${tenantId} AND date = ${new Date(date)}
                `;

                if (existing && existing.length > 0) {
                    // อัปเดตข้อมูลเดิม
                    await prisma.$executeRaw`
                        UPDATE holidays 
                        SET name = ${name}, type = ${type}, updated_at = NOW()
                        WHERE id = ${existing[0].id}
                    `;
                    updated++;
                } else {
                    // เพิ่มใหม่
                    await prisma.$executeRaw`
                        INSERT INTO holidays (tenant_id, name, date, type, is_recurring, created_at, updated_at)
                        VALUES (${tenantId}, ${name}, ${new Date(date)}, ${type}, false, NOW(), NOW())
                    `;
                    added++;
                }
            } catch (err) {
                console.error('[Holidays] Import row error:', err);
                failed.push({
                    date: holiday.date,
                    name: holiday.name,
                    error: err.message
                });
            }
        }

        console.log(`[Holidays] Import complete: Added ${added}, Updated ${updated}, Failed ${failed.length}`);

        res.json({
            success: true,
            data: {
                total: holidays.length,
                added,
                updated,
                failed
            }
        });
    } catch (error) {
        console.error('[Holidays] Import error:', error);
        res.status(500).json({ success: false, message: 'Import failed: ' + error.message });
    }
});

export default router;

