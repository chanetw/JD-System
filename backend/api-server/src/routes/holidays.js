import express from 'express';
import { getDatabase } from '../config/database.js';
// Correct import path for authentication middleware (from auth.js in the same directory)
import { authenticateToken, setRLSContextMiddleware } from './auth.js';

const router = express.Router();

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

export default router;
