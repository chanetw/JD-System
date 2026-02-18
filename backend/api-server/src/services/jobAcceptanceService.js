/**
 * Job Acceptance Service
 * 
 * จัดการ Logic ทั้งหมดเกี่ยวกับ:
 * 1. การเลือกวันรับงาน (Acceptance Date)
 * 2. การคำนวณ SLA และ Due Date
 * 3. การ Auto-Extend เมื่ออนุมัติล่าช้า
 * 4. การ Extend งานด้วยตนเอง (Manual Extension)
 * 5. การคำนวณ Sequential Child Jobs
 */

const prisma = require('../config/database');
const { addBusinessDays, differenceInBusinessDays, parseISO, format } = require('date-fns');
const NotificationService = require('./notificationService');

/**
 * คำนวณ Due Date จาก Acceptance Date และ SLA
 * @param {Date|string} acceptanceDate - วันที่รับงาน
 * @param {number} slaDays - จำนวนวันตาม SLA
 * @returns {Date} Due Date ที่คำนวณได้
 */
function calculateDueDate(acceptanceDate, slaDays) {
    const startDate = typeof acceptanceDate === 'string' ? parseISO(acceptanceDate) : acceptanceDate;
    return addBusinessDays(startDate, slaDays);
}

/**
 * ตรวจสอบว่าต้อง Auto-Extend หรือไม่
 * เมื่อ Approved Date > Acceptance Date
 * 
 * @param {Date|string} acceptanceDate - วันที่ต้องการเริ่มงาน
 * @param {Date|string} approvedDate - วันที่อนุมัติจริง
 * @returns {Object} { needsExtension: boolean, extensionDays: number }
 */
function checkAutoExtension(acceptanceDate, approvedDate) {
    const acceptance = typeof acceptanceDate === 'string' ? parseISO(acceptanceDate) : acceptanceDate;
    const approved = typeof approvedDate === 'string' ? parseISO(approvedDate) : approvedDate;

    const delayDays = differenceInBusinessDays(approved, acceptance);

    return {
        needsExtension: delayDays > 0,
        extensionDays: Math.max(0, delayDays)
    };
}

/**
 * สร้าง Extension Record สำหรับงานที่ต้อง Auto-Extend
 * 
 * @param {number} jobId - Job ID
 * @param {number} extensionDays - จำนวนวันที่ต้อง extend
 * @param {Date} originalDueDate - Due date เดิม
 * @param {Object} transaction - Prisma transaction (optional)
 * @returns {Promise<Object>} Updated job
 */
async function applyAutoExtension(jobId, extensionDays, originalDueDate, transaction = null) {
    const db = transaction || prisma;

    const newDueDate = addBusinessDays(originalDueDate, extensionDays);

    const updatedJob = await db.job.update({
        where: { id: jobId },
        data: {
            dueDate: newDueDate,
            originalDueDate: originalDueDate,
            extensionCount: { increment: 1 },
            lastExtendedAt: new Date(),
            extensionReason: `System Extended: Approval process delayed by ${extensionDays} business day(s)`,
            acceptanceMethod: 'extended'
        }
    });

    // บันทึก Activity Log
    await db.activityLog.create({
        data: {
            tenantId: updatedJob.tenantId,
            jobId: updatedJob.id,
            userId: updatedJob.requesterId, // System action on behalf of requester
            action: 'job_auto_extended',
            description: `ระบบ Extend งานอัตโนมัติ ${extensionDays} วัน เนื่องจากการอนุมัติล่าช้า`,
            metadata: {
                extensionDays,
                originalDueDate: format(originalDueDate, 'yyyy-MM-dd'),
                newDueDate: format(newDueDate, 'yyyy-MM-dd'),
                reason: 'approval_delay'
            }
        }
    });

    return updatedJob;
}

/**
 * Manual Extension โดย Assignee
 * 
 * @param {number} jobId - Job ID
 * @param {number} userId - User ID ของผู้ extend
 * @param {number} extensionDays - จำนวนวันที่ต้องการ extend
 * @param {string} reason - เหตุผลการ extend
 * @returns {Promise<Object>} Updated job
 */
async function extendJobManually(jobId, userId, extensionDays, reason) {
    // ดึงข้อมูลงานปัจจุบัน (รวม requester และ project สำหรับ notification)
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            assignee: true,
            requester: true,
            project: true
        }
    });

    if (!job) {
        throw new Error('Job not found');
    }

    // ตรวจสอบว่าเป็น Assignee หรือไม่
    if (job.assigneeId !== userId) {
        throw new Error('Only assignee can extend the job');
    }

    // ตรวจสอบสถานะงาน
    if (!['in_progress', 'assigned'].includes(job.status)) {
        throw new Error('Cannot extend job in current status');
    }

    const currentDueDate = job.dueDate;
    const newDueDate = addBusinessDays(currentDueDate, extensionDays);

    // บันทึก original due date ถ้ายังไม่เคยมี
    const originalDueDate = job.originalDueDate || currentDueDate;

    const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: {
            dueDate: newDueDate,
            originalDueDate: originalDueDate,
            extensionCount: { increment: 1 },
            lastExtendedAt: new Date(),
            extensionReason: reason,
            acceptanceMethod: 'extended'
        }
    });

    // บันทึก Activity Log
    await prisma.activityLog.create({
        data: {
            tenantId: job.tenantId,
            jobId: job.id,
            userId: userId,
            action: 'job_extended',
            description: `ขอ Extend งาน ${extensionDays} วัน: ${reason}`,
            metadata: {
                extensionDays,
                originalDueDate: format(originalDueDate, 'yyyy-MM-dd'),
                previousDueDate: format(currentDueDate, 'yyyy-MM-dd'),
                newDueDate: format(newDueDate, 'yyyy-MM-dd'),
                reason
            }
        }
    });

    // แจ้งเตือน Requester เมื่อมีการขอเลื่อนงาน
    if (job.requesterId) {
        const notificationService = new NotificationService();
        const assigneeName = job.assignee?.displayName || `${job.assignee?.firstName || ''} ${job.assignee?.lastName || ''}`.trim();
        const projectName = job.project?.name || 'โครงการ';

        const notificationMessage = `ผู้รับงาน ${assigneeName} ขอเลื่อนงาน "${job.subject}" (${job.djId}) ของ${projectName} ออกไป ${extensionDays} วันทำการ\n\nเหตุผล: ${reason}\n\nDue Date เดิม: ${format(currentDueDate, 'dd/MM/yyyy')}\nDue Date ใหม่: ${format(newDueDate, 'dd/MM/yyyy')}`;

        await notificationService.createNotification({
            tenantId: job.tenantId,
            userId: job.requesterId,
            type: 'job_extended',
            title: `งาน ${job.djId} ถูกขอเลื่อน`,
            message: notificationMessage,
            link: `/jobs/${jobId}`
        }).catch(err => console.warn('[ExtendJobManually] Notification failed:', err.message));

        // ส่งอีเมล (ถ้ามี email service)
        try {
            const EmailService = require('./emailService');
            const emailService = new EmailService();

            if (job.requester?.email) {
                await emailService.sendExtensionNotification({
                    to: job.requester.email,
                    jobId: job.djId,
                    jobSubject: job.subject,
                    assigneeName: assigneeName,
                    projectName: projectName,
                    extensionDays: extensionDays,
                    reason: reason,
                    oldDueDate: format(currentDueDate, 'dd/MM/yyyy'),
                    newDueDate: format(newDueDate, 'dd/MM/yyyy'),
                    jobLink: `/jobs/${jobId}`
                });
            }
        } catch (emailErr) {
            console.warn('[ExtendJobManually] Email notification failed:', emailErr.message);
        }
    }

    return updatedJob;
}

/**
 * คำนวณ Timeline สำหรับ Sequential Child Jobs
 * 
 * @param {Date|string} parentStartDate - วันเริ่มงานของ Parent
 * @param {Array<Object>} childJobs - Array ของ child jobs พร้อม SLA
 * @returns {Array<Object>} Timeline ของแต่ละ child job
 */
function calculateSequentialTimeline(parentStartDate, childJobs) {
    const startDate = typeof parentStartDate === 'string' ? parseISO(parentStartDate) : parentStartDate;

    let currentStartDate = startDate;
    const timeline = [];

    for (const child of childJobs) {
        const dueDate = addBusinessDays(currentStartDate, child.slaDays);

        timeline.push({
            jobTypeId: child.jobTypeId,
            jobTypeName: child.jobTypeName,
            slaDays: child.slaDays,
            startDate: currentStartDate,
            dueDate: dueDate,
            duration: child.slaDays
        });

        // งานถัดไปเริ่มหลังจากงานนี้เสร็จ
        currentStartDate = dueDate;
    }

    return timeline;
}

/**
 * ดึงข้อมูล SLA Info ของงาน
 * 
 * @param {number} jobId - Job ID
 * @returns {Promise<Object>} SLA information
 */
async function getJobSlaInfo(jobId) {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            jobType: true,
            childJobs: {
                include: {
                    jobType: true
                }
            }
        }
    });

    if (!job) {
        throw new Error('Job not found');
    }

    const slaInfo = {
        jobId: job.id,
        djId: job.djId,
        acceptanceDate: job.acceptanceDate,
        acceptanceMethod: job.acceptanceMethod,
        originalDueDate: job.originalDueDate,
        currentDueDate: job.dueDate,
        slaDays: job.slaDays,
        extensionCount: job.extensionCount,
        lastExtendedAt: job.lastExtendedAt,
        extensionReason: job.extensionReason,
        isExtended: job.extensionCount > 0,
        totalExtensionDays: job.originalDueDate && job.dueDate
            ? differenceInBusinessDays(job.dueDate, job.originalDueDate)
            : 0
    };

    // ถ้ามี child jobs ให้คำนวณ timeline
    if (job.childJobs && job.childJobs.length > 0) {
        const childTimeline = calculateSequentialTimeline(
            job.acceptanceDate || new Date(),
            job.childJobs.map(child => ({
                jobTypeId: child.jobTypeId,
                jobTypeName: child.jobType.name,
                slaDays: child.slaDays
            }))
        );

        slaInfo.childTimeline = childTimeline;
    }

    return slaInfo;
}

module.exports = {
    calculateDueDate,
    checkAutoExtension,
    applyAutoExtension,
    extendJobManually,
    calculateSequentialTimeline,
    getJobSlaInfo
};
