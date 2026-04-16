/**
 * @file activities.js
 * @description Job Activities API Routes
 *
 * Features:
 * - List activities/logs for a specific job
 * - Permission checking (same as job access)
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

const ACTION_META_MAP = {
    job_created: { label: 'สร้างงาน', stage: 'Created', tone: 'positive' },
    parent_child_created: { label: 'สร้างงานกลุ่ม', stage: 'Created', tone: 'positive' },
    draft_saved: { label: 'บันทึกร่าง', stage: 'Draft', tone: 'neutral' },
    draft_submitted: { label: 'ส่ง Draft', stage: 'Draft', tone: 'neutral' },
    draft_approved: { label: 'อนุมัติ Draft', stage: 'Approved', tone: 'positive' },
    draft_rejected: { label: 'แก้ไข Draft', stage: 'Rejected', tone: 'negative' },

    approval_requested: { label: 'ส่งขออนุมัติ', stage: 'Approval', tone: 'neutral' },
    approve: { label: 'อนุมัติ', stage: 'Approved', tone: 'positive' },
    approved: { label: 'อนุมัติงาน', stage: 'Approved', tone: 'positive' },
    job_approved: { label: 'อนุมัติงาน', stage: 'Approved', tone: 'positive' },
    job_auto_approved: { label: 'อนุมัติอัตโนมัติ', stage: 'Approved', tone: 'positive' },
    job_approved_cascade: { label: 'อนุมัติอัตโนมัติ (Cascade)', stage: 'Approved', tone: 'positive' },
    job_approved_cascade_sequential: { label: 'อนุมัติอัตโนมัติตามลำดับ', stage: 'Approved', tone: 'positive' },

    rejected: { label: 'ส่งกลับแก้ไข', stage: 'Rejected', tone: 'negative' },
    job_rejected: { label: 'ส่งกลับแก้ไข', stage: 'Rejected', tone: 'negative' },
    rejection_requested: { label: 'ขอปฏิเสธงาน', stage: 'Rejection', tone: 'negative' },
    rejection_approved: { label: 'อนุมัติคำขอปฏิเสธ', stage: 'Rejection', tone: 'positive' },
    rejection_denied: { label: 'ไม่อนุมัติคำขอปฏิเสธ', stage: 'Rejection', tone: 'negative' },
    rejection_auto_approved: { label: 'ปฏิเสธอัตโนมัติ', stage: 'Rejection', tone: 'neutral' },
    job_rejected_by_assignee: { label: 'ผู้รับงานปฏิเสธ', stage: 'Rejection', tone: 'negative' },
    assignee_rejection_confirmed: { label: 'ยืนยันปฏิเสธผู้รับงาน', stage: 'Rejection', tone: 'positive' },
    assignee_rejection_denied: { label: 'ไม่ยืนยันปฏิเสธผู้รับงาน', stage: 'Rejection', tone: 'negative' },

    assigned: { label: 'มอบหมายงาน', stage: 'Assigned', tone: 'neutral' },
    reassigned: { label: 'ย้ายผู้รับผิดชอบ', stage: 'Assigned', tone: 'neutral' },
    job_started: { label: 'เริ่มดำเนินงาน', stage: 'In Progress', tone: 'positive' },
    started: { label: 'เริ่มงาน', stage: 'In Progress', tone: 'positive' },
    auto_start: { label: 'เริ่มงานอัตโนมัติ', stage: 'In Progress', tone: 'positive' },

    completed: { label: 'ส่งงาน', stage: 'Completed', tone: 'positive' },
    job_completed: { label: 'ส่งมอบงาน', stage: 'Completed', tone: 'positive' },
    closed: { label: 'ปิดงาน', stage: 'Completed', tone: 'positive' },
    parent_job_closed: { label: 'ปิดงานหลัก', stage: 'Completed', tone: 'positive' },

    rebrief_requested: { label: 'ขอข้อมูลเพิ่ม', stage: 'Rebrief', tone: 'neutral' },
    rebrief_submitted: { label: 'ส่งข้อมูลเพิ่ม', stage: 'Rebrief', tone: 'neutral' },
    rebrief_accepted: { label: 'รับงานหลัง Rebrief', stage: 'Rebrief', tone: 'positive' },

    comment_added: { label: 'เพิ่มความคิดเห็น', stage: 'Comment', tone: 'neutral' },
    comment_deleted: { label: 'ลบความคิดเห็น', stage: 'Comment', tone: 'neutral' },
    file_uploaded: { label: 'อัปโหลดไฟล์', stage: 'Attachment', tone: 'neutral' },
    files_auto_cleaned: { label: 'ล้างไฟล์อัตโนมัติ', stage: 'Attachment', tone: 'neutral' },

    due_date_adjusted: { label: 'ปรับวันกำหนดส่ง', stage: 'Scheduling', tone: 'neutral' },
    job_extended: { label: 'ขยายเวลางาน', stage: 'Scheduling', tone: 'neutral' },
    job_auto_extended: { label: 'ขยายเวลาอัตโนมัติ', stage: 'Scheduling', tone: 'neutral' },
    job_auto_extended_urgent: { label: 'ขยายเวลาเร่งด่วนอัตโนมัติ', stage: 'Scheduling', tone: 'neutral' },
    job_cancelled: { label: 'ยกเลิกงาน', stage: 'Cancelled', tone: 'negative' },

    view: { label: 'เปิดดูงาน', stage: 'Activity', tone: 'neutral' },
    status_updated: { label: 'อัปเดตสถานะ', stage: 'Activity', tone: 'neutral' }
};

const getActionMeta = (action) => {
    return ACTION_META_MAP[action] || {
        label: action || 'กิจกรรม',
        stage: 'Activity',
        tone: 'neutral'
    };
};

const APPROVAL_ACTIONS = new Set([
    'approval_requested',
    'approve',
    'approved',
    'job_approved',
    'job_auto_approved',
    'job_approved_cascade',
    'job_approved_cascade_sequential',
    'job_rejected',
    'rejected'
]);

const POST_APPROVAL_STATUSES = new Set([
    'approved',
    'assigned',
    'in_progress',
    'pending_close',
    'completed',
    'closed',
    'pending_rebrief',
    'rebrief_submitted',
    'correction',
    'rework',
    'returned',
    'draft_review',
    'pending_rejection',
    'assignee_rejected',
    'rejected_by_assignee',
    'cancelled'
]);

const statusImpliesApprovalCompletion = (status) => {
    return POST_APPROVAL_STATUSES.has(String(status || '').toLowerCase());
};

const getLegacyApprovalFallbackDate = (job) => {
    const candidates = [
        job.assignedAt,
        job.startedAt,
        job.draftSubmittedAt,
        job.completedAt,
        job.acceptanceDate
    ].filter(Boolean).map(value => new Date(value));

    if (candidates.length === 0) {
        return job.createdAt;
    }

    const earliest = candidates.sort((a, b) => a.getTime() - b.getTime())[0];
    return new Date(earliest.getTime() - 1000);
};

const sourcePriority = (source) => {
    if (source === 'activity_log') return 1;
    if (source === 'job_activity') return 2;
    if (source === 'approval') return 3;
    return 4;
};

const dedupeActivities = (activities) => {
    const bySignature = new Map();

    activities.forEach((activity) => {
        const signature = makeActivitySignature(activity);
        const existing = bySignature.get(signature);

        if (!existing || sourcePriority(activity.source) < sourcePriority(existing.source)) {
            bySignature.set(signature, activity);
        }
    });

    return [...bySignature.values()]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

const parseDetail = (detail) => {
    if (!detail) return null;
    if (typeof detail === 'object') return detail;
    if (typeof detail === 'string') {
        try {
            return JSON.parse(detail);
        } catch {
            return detail;
        }
    }
    return detail;
};

const normalizeText = (value) => {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
};

const makeActivitySignature = (activity) => {
    const createdAt = new Date(activity.createdAt).getTime();
    // Bucket by 2 seconds to merge mirrored logs written almost at same time
    const timeBucket = Math.floor(createdAt / 2000);
    const action = normalizeText(activity.action);
    const message = normalizeText(activity.message);
    const userId = activity.user?.id || 'system';

    return `${action}|${message}|${userId}|${timeBucket}`;
};

// All routes require authentication and RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * Check if user has access to view job activities
 * @param {Object} job - Job object with requesterId and assigneeId
 * @param {Object} user - User object from request
 * @returns {boolean}
 */
const hasJobAccess = (job, user) => {
    // Determine user roles from various possible properties
    const roles = Array.isArray(user.roles)
        ? user.roles.map(r => r.toLowerCase())
        : (user.roleName ? [user.roleName.toLowerCase()] : []);

    return (
        job.requesterId === user.userId ||
        job.assigneeId === user.userId ||
        roles.includes('admin') ||
        roles.includes('manager') ||
        roles.includes('approver')
    );
};

/**
 * GET /api/jobs/:jobId/activities
 * Get all activities for a job
 */
router.get('/jobs/:jobId/activities', async (req, res) => {
    try {
        const prisma = getDatabase();
        const { jobId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const userId = req.user.userId;
        const tenantId = req.user.tenantId;

        // Get job to check access
        const job = await prisma.job.findFirst({
            where: {
                id: parseInt(jobId),
                tenantId
            },
            select: {
                id: true,
                createdAt: true,
                status: true,
                subject: true,
                assignedAt: true,
                startedAt: true,
                draftSubmittedAt: true,
                completedAt: true,
                acceptanceDate: true,
                requesterId: true,
                assigneeId: true,
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatarUrl: true
                    }
                }
            }
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'JOB_NOT_FOUND',
                message: 'ไม่พบงานที่ระบุ'
            });
        }

        // Check access permission
        if (!hasJobAccess(job, req.user)) {
            return res.status(403).json({
                success: false,
                error: 'INSUFFICIENT_PERMISSIONS',
                message: 'คุณไม่มีสิทธิ์ดูประวัติกิจกรรมของงานนี้'
            });
        }

        // Get activities from both tables and merge
        const [activityLogs, jobActivities, approvals] = await Promise.all([
            prisma.activityLog.findMany({
                where: { jobId: parseInt(jobId) },
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
                    }
                },
                orderBy: { createdAt: 'asc' },
                take: 200
            }),
            prisma.jobActivity.findMany({
                where: { jobId: parseInt(jobId) },
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
                    }
                },
                orderBy: { createdAt: 'asc' },
                take: 200
            }).catch(() => []) // jobActivity อาจไม่มีใน schema เก่า ให้ fallback เป็น []
            ,
            prisma.approval.findMany({
                where: { jobId: parseInt(jobId) },
                include: {
                    approver: {
                        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
                    }
                },
                orderBy: { createdAt: 'asc' },
                take: 200
            }).catch(() => [])
        ]);

        // Normalize activityLog entries
        const normalizedLogs = activityLogs.map(a => ({
            id: `log_${a.id}`,
            source: 'activity_log',
            action: a.action,
            message: a.message || a.action,
            detail: parseDetail(a.detail),
            createdAt: a.createdAt,
            user: a.user || null,
            activityMeta: getActionMeta(a.action)
        }));

        // Normalize jobActivity entries (map activityType → action, description → message)
        const normalizedJobActivities = jobActivities.map(a => ({
            id: `jact_${a.id}`,
            source: 'job_activity',
            action: a.activityType,
            message: a.description || a.activityType,
            detail: parseDetail(a.metadata),
            createdAt: a.createdAt,
            user: a.user || null,
            activityMeta: getActionMeta(a.activityType)
        }));

        const normalizedApprovals = approvals.map((a) => {
            const status = String(a.status || '').toLowerCase();
            const isApproved = status === 'approved';
            const isRejected = status === 'rejected';
            const action = isApproved ? 'job_approved' : isRejected ? 'job_rejected' : 'approval_requested';
            const timestamp = isApproved || isRejected ? (a.approvedAt || a.createdAt) : a.createdAt;
            const step = a.stepNumber ? `ระดับ ${a.stepNumber}` : 'ระดับอนุมัติ';
            const message = isApproved
                ? `อนุมัติ${step}${a.comment ? `: ${a.comment}` : ''}`
                : isRejected
                    ? `ปฏิเสธ${step}${a.comment ? `: ${a.comment}` : ''}`
                    : `ส่งขออนุมัติ${step}`;

            return {
                id: `aprv_${a.id}`,
                source: 'approval',
                action,
                message,
                detail: {
                    stepNumber: a.stepNumber,
                    approvalStatus: status,
                    comment: a.comment,
                    sourceTable: 'approvals'
                },
                createdAt: timestamp,
                user: a.approver || null,
                activityMeta: getActionMeta(action)
            };
        });

        // Merge and deduplicate: prefer activityLog entries, skip jobActivity if same signature exists
        const activityLogSignatures = new Set(
            normalizedLogs.map(makeActivitySignature)
        );
        const uniqueJobActivities = normalizedJobActivities.filter(a => {
            const sig = makeActivitySignature(a);
            return !activityLogSignatures.has(sig);
        });

        // Ensure timeline always starts with job creation event (even if old data missed it)
        const mergedActivities = dedupeActivities([
            ...normalizedLogs,
            ...uniqueJobActivities,
            ...normalizedApprovals
        ]);
        const hasCreateEvent = mergedActivities.some(a => a.action === 'job_created' || a.action === 'parent_child_created');
        const hasApprovalEvent = mergedActivities.some(a => APPROVAL_ACTIONS.has(a.action));
        const hasApprovalRecords = normalizedApprovals.length > 0;
        const synthesizedCreateEvent = hasCreateEvent ? [] : [{
            id: `synthetic_created_${job.id}`,
            source: 'synthetic',
            action: 'job_created',
            message: `สร้างงาน: ${job.subject || `Job #${job.id}`}`,
            detail: { synthesized: true, reason: 'missing_create_event' },
            createdAt: job.createdAt,
            user: job.requester || null,
            activityMeta: getActionMeta('job_created')
        }];

        const approvalFallbackEvent = (!hasApprovalEvent && hasApprovalRecords)
            ? [{
                id: `synthetic_approval_${job.id}`,
                source: 'synthetic',
                action: 'approval_requested',
                message: `งานนี้มีประวัติอนุมัติในระบบ (${normalizedApprovals.length} รายการ)` ,
                detail: { synthesized: true, reason: 'approval_records_exist' },
                createdAt: normalizedApprovals[0].createdAt,
                user: normalizedApprovals[0].user || null,
                activityMeta: getActionMeta('approval_requested')
            }]
            : [];

        const legacyApprovedFallbackEvent = (!hasApprovalEvent && !hasApprovalRecords && statusImpliesApprovalCompletion(job.status))
            ? [{
                id: `synthetic_approved_${job.id}`,
                source: 'synthetic',
                action: 'job_approved',
                message: `อนุมัติจากสถานะงานเดิม (${job.status})`,
                detail: {
                    synthesized: true,
                    reason: 'legacy_status_implies_approved',
                    status: job.status
                },
                createdAt: getLegacyApprovalFallbackDate(job),
                user: null,
                activityMeta: getActionMeta('job_approved')
            }]
            : [];

        // Combine, sort oldest-first, then paginate so history starts from creation
        const allActivities = [...synthesizedCreateEvent, ...approvalFallbackEvent, ...legacyApprovedFallbackEvent, ...mergedActivities]
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const total = allActivities.length;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginated = allActivities.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            data: paginated,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[Activities] Get activities error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาดในการดึงประวัติกิจกรรม'
        });
    }
});

/**
 * GET /api/activities/unmapped-actions
 * Return distinct actions in logs that are not mapped in ACTION_META_MAP
 */
router.get('/activities/unmapped-actions', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;

        const [activityActions, jobActivityTypes] = await Promise.all([
            prisma.activityLog.findMany({
                where: {
                    job: { tenantId }
                },
                distinct: ['action'],
                select: { action: true }
            }),
            prisma.jobActivity.findMany({
                where: { tenantId },
                distinct: ['activityType'],
                select: { activityType: true }
            }).catch(() => [])
        ]);

        const known = new Set(Object.keys(ACTION_META_MAP));
        const fromActivityLog = activityActions.map(r => r.action).filter(Boolean);
        const fromJobActivity = jobActivityTypes.map(r => r.activityType).filter(Boolean);
        const discovered = [...new Set([...fromActivityLog, ...fromJobActivity])].sort();
        const unmapped = discovered.filter(action => !known.has(action));

        res.json({
            success: true,
            data: {
                discovered,
                mappedCount: discovered.length - unmapped.length,
                unmappedCount: unmapped.length,
                unmapped,
                knownActions: [...known].sort()
            }
        });
    } catch (error) {
        console.error('[Activities] Unmapped actions error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาดในการตรวจสอบ action mapping'
        });
    }
});

/**
 * GET /api/jobs/:jobId/activities/unmapped
 * Return raw actions for a single job and highlight unmapped values.
 */
router.get('/jobs/:jobId/activities/unmapped', async (req, res) => {
    try {
        const prisma = getDatabase();
        const { jobId } = req.params;
        const tenantId = req.user.tenantId;

        const job = await prisma.job.findFirst({
            where: {
                id: parseInt(jobId),
                tenantId
            },
            select: {
                id: true,
                requesterId: true,
                assigneeId: true
            }
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'JOB_NOT_FOUND',
                message: 'ไม่พบงานที่ระบุ'
            });
        }

        if (!hasJobAccess(job, req.user)) {
            return res.status(403).json({
                success: false,
                error: 'INSUFFICIENT_PERMISSIONS',
                message: 'คุณไม่มีสิทธิ์ดูประวัติกิจกรรมของงานนี้'
            });
        }

        const [activityLogs, jobActivities, approvals] = await Promise.all([
            prisma.activityLog.findMany({
                where: { jobId: parseInt(jobId) },
                select: { id: true, action: true, message: true, createdAt: true }
            }),
            prisma.jobActivity.findMany({
                where: { jobId: parseInt(jobId) },
                select: { id: true, activityType: true, description: true, createdAt: true }
            }).catch(() => []),
            prisma.approval.findMany({
                where: { jobId: parseInt(jobId) },
                select: { id: true, status: true, stepNumber: true, createdAt: true, approvedAt: true }
            }).catch(() => [])
        ]);

        const known = new Set(Object.keys(ACTION_META_MAP));
        const discovered = [
            ...activityLogs.map(item => ({ source: 'activity_log', action: item.action, id: item.id, createdAt: item.createdAt })),
            ...jobActivities.map(item => ({ source: 'job_activity', action: item.activityType, id: item.id, createdAt: item.createdAt })),
            ...approvals.map(item => ({ source: 'approval', action: item.status === 'approved' ? 'job_approved' : item.status === 'rejected' ? 'job_rejected' : 'approval_requested', id: item.id, createdAt: item.approvedAt || item.createdAt }))
        ].map(item => ({ ...item, mapped: known.has(item.action) }));

        res.json({
            success: true,
            data: {
                discovered,
                unmapped: discovered.filter(item => !item.mapped),
                counts: {
                    activityLogs: activityLogs.length,
                    jobActivities: jobActivities.length,
                    approvals: approvals.length
                }
            }
        });
    } catch (error) {
        console.error('[Activities] Job unmapped actions error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาดในการตรวจสอบ action ของงานนี้'
        });
    }
});

export default router;
