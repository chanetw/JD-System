/**
 * @file chainService.js
 * @description Service for managing sequential job chains
 *
 * Handles:
 * - Full transitive chaining (A→B→C with MAX_DEPTH limit)
 * - Circular reference detection
 * - Self-chain prevention
 * - Urgent job rescheduling
 */

import { chainConfig } from '../config/chainConfig.js';
import { format } from 'date-fns';
import EmailService from './emailService.js';
import MagicLinkService from './magicLinkService.js';
import { createEmailTemplate } from '../utils/emailTemplates.js';
import { buildFrontendUrl } from '../utils/frontendUrl.js';

export const URGENT_RESCHEDULE_ACTIVE_STATUSES = [
  'approved',
  'assigned',
  'in_progress',
  'correction',
  'rework',
  'returned',
  'pending_dependency'
];

const TERMINAL_STATUSES = ['completed', 'closed', 'rejected', 'cancelled'];
const URGENT_STRATEGY_VERSION = 'urgent-cumulative-linear-v1';

function normalizePriority(priority) {
  return String(priority || '').toLowerCase();
}

function isUrgentPriority(priority) {
  return normalizePriority(priority) === 'urgent';
}

export function getUrgentDelayMultiplier(urgentCount) {
  return Math.min(Math.max(Number(urgentCount) || 0, 0), 2);
}

export function calculateUrgentDelayPlan({ urgentCount, tasks }) {
  const multiplier = getUrgentDelayMultiplier(urgentCount);

  return (tasks || []).map((task, index) => ({
    ...task,
    queueIndex: index + 1,
    urgentCount,
    multiplier,
    shiftDays: (index + 1) * multiplier
  }));
}

function getTimestamp(value) {
  const date = value ? new Date(value) : null;
  const time = date?.getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function sortByBaselineDueDate(left, right) {
  const dueDiff = getTimestamp(left.baselineDueDate) - getTimestamp(right.baselineDueDate);
  if (dueDiff !== 0) return dueDiff;

  const createdDiff = getTimestamp(left.createdAt) - getTimestamp(right.createdAt);
  if (createdDiff !== 0) return createdDiff;

  return Number(left.id) - Number(right.id);
}

function isLaterDate(left, right) {
  return getTimestamp(left) > getTimestamp(right);
}

function formatThaiDate(dateValue) {
  if (!dateValue) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: process.env.APP_TIMEZONE || 'Asia/Bangkok'
  }).format(new Date(dateValue));
}

function getRequesterName(requesterName) {
  return requesterName || 'Requester';
}

function buildUrgentImpactEmail({
  affectedJob,
  magicLink
}) {
  const requesterName = getRequesterName(affectedJob.requesterName);
  const content = `
    <p>เรียน คุณ ${requesterName}</p>
    <p>ขอแจ้งให้ทราบว่า งาน <strong>${affectedJob.djId}: ${affectedJob.subject}</strong> ได้รับการปรับเปลี่ยนกำหนดส่ง เนื่องจากมีงานเร่งด่วนในลำดับการดำเนินงาน</p>
    <div class="info-box">
      <p><strong>กำหนดส่งเดิม:</strong> ${formatThaiDate(affectedJob.oldDueDate)}</p>
      <p><strong>กำหนดส่งใหม่:</strong> ${formatThaiDate(affectedJob.newDueDate)}</p>
    </div>
    <p>ขออภัยในความไม่สะดวก</p>
    <p>ท่านสามารถดูรายละเอียดเพิ่มเติมได้ในระบบ DJ System</p>
  `;

  return createEmailTemplate({
    title: `แจ้งปรับกำหนดส่งงาน ${affectedJob.djId}`,
    heading: 'แจ้งปรับกำหนดส่งงาน',
    content,
    buttonText: 'ดูรายละเอียดงาน',
    buttonUrl: magicLink
  });
}

function toDateKey(dateValue) {
  const d = new Date(dateValue);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadTenantHolidaySet(prisma, tenantId, startDate, workingDays) {
  const holidaySet = new Set();

  if (!tenantId) {
    return holidaySet;
  }

  const rangeStart = new Date(startDate);
  rangeStart.setHours(0, 0, 0, 0);

  const safeDays = Number(workingDays) || 0;
  const rangeEnd = new Date(startDate);
  rangeEnd.setDate(rangeEnd.getDate() + Math.max(45, safeDays * 4));
  rangeEnd.setHours(23, 59, 59, 999);

  try {
    const holidays = await prisma.holiday.findMany({
      where: {
        tenantId,
        date: {
          gte: rangeStart,
          lte: rangeEnd
        }
      },
      select: { date: true }
    });

    holidays.forEach(({ date }) => {
      holidaySet.add(toDateKey(date));
    });
  } catch (err) {
    console.warn('[ChainService] Could not load holidays, fallback to weekends only:', err.message);
  }

  return holidaySet;
}

async function addWorkingDaysWithTenantHolidays({ prisma, tenantId, startDate, workingDays }) {
  const safeWorkingDays = Number(workingDays) || 0;
  const result = new Date(startDate);

  if (safeWorkingDays <= 0) {
    return result;
  }

  const holidaySet = await loadTenantHolidaySet(prisma, tenantId, result, safeWorkingDays);

  let daysAdded = 0;
  while (daysAdded < safeWorkingDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(toDateKey(result));

    if (!isWeekend && !isHoliday) {
      daysAdded++;
    }
  }

  return result;
}

class ChainService {
  /**
   * Get full chain starting from a job type
   * Respects MAX_CHAIN_DEPTH and detects circular references
   *
   * @param {number} startJobTypeId - Starting job type ID
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Array>} Array of job type IDs in chain (respects MAX_DEPTH)
   */
  async getFullChain(startJobTypeId, prisma) {
    const chain = [];
    const visited = new Set();
    let currentTypeId = startJobTypeId;
    let depth = 0;

    while (
      currentTypeId &&
      depth < chainConfig.maxChainDepth &&
      !visited.has(currentTypeId)
    ) {
      // Prevent infinite loop
      if (visited.has(currentTypeId)) {
        console.warn(
          `[ChainService] Circular reference detected at depth ${depth}`,
          { currentTypeId, visited }
        );
        break;
      }

      visited.add(currentTypeId);
      chain.push(currentTypeId);
      depth++;

      // Get next job type
      const jobType = await prisma.jobType.findUnique({
        where: { id: currentTypeId },
        select: { nextJobTypeId: true }
      });

      if (!jobType || !jobType.nextJobTypeId) {
        // Chain ends here
        break;
      }

      // Prevent self-chaining
      if (
        chainConfig.preventSelfChain &&
        jobType.nextJobTypeId === currentTypeId
      ) {
        console.warn(
          `[ChainService] Self-chain prevented: ${currentTypeId} → ${currentTypeId}`
        );
        break;
      }

      currentTypeId = jobType.nextJobTypeId;
    }

    if (depth >= chainConfig.maxChainDepth && currentTypeId) {
      console.log(
        `[ChainService] Chain depth limit reached (${chainConfig.maxChainDepth})`
      );
    }

    return chain;
  }

  /**
   * Validate if a job type can chain to another
   * Checks for circular references and self-chain
   *
   * @param {number} fromTypeId - Source job type
   * @param {number} toTypeId - Target job type
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Object>} {valid: boolean, error?: string}
   */
  async validateChain(fromTypeId, toTypeId, prisma) {
    // Prevent self-chain
    if (chainConfig.preventSelfChain && fromTypeId === toTypeId) {
      return {
        valid: false,
        error: 'Cannot chain job type to itself'
      };
    }

    // Detect circular reference
    if (chainConfig.enableCycleDetection) {
      const chain = await this.getFullChain(toTypeId, prisma);
      if (chain.includes(fromTypeId)) {
        return {
          valid: false,
          error: `Circular reference would be created: ${fromTypeId} → ... → ${fromTypeId}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Find all active jobs assigned to an assignee (no date range filter)
   * Used for urgent job rescheduling - extends ALL jobs of the assignee
   *
   * @param {number} assigneeId - Assignee user ID
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Array>} Array of all active jobs
   */
  async findAllAssigneeJobs(assigneeId, prisma) {
    if (!chainConfig.enableUrgentReschedule) {
      return [];
    }

    // หางานทั้งหมดของ assignee ที่ยังไม่เสร็จ (ไม่จำกัดช่วง due date)
    const jobs = await prisma.job.findMany({
      where: {
        assigneeId,
        status: {
          in: [
            'approved', 'assigned',      // งานที่รอทำ
            'in_progress',               // งานที่กำลังทำ
            'correction', 'rework',      // งานที่ต้องแก้ไข
            'returned',                  // งานที่ถูกส่งกลับ
            'pending_dependency'         // งานที่รอ dependency
          ]
        }
      },
      select: {
        id: true,
        djId: true,
        subject: true,
        status: true,
        dueDate: true,
        parentJobId: true,
        isParent: true,
        requesterId: true,
        tenantId: true,
        requester: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        }
      }
    });

    return jobs;
  }

  /**
   * Find all jobs competing for same assignee within date range
   * Used for urgent job rescheduling
   *
   * @param {number} assigneeId - Assignee user ID
   * @param {Date} urgentDueDate - Urgent job's due date
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Array>} Array of competing jobs
   * @deprecated Use findAllAssigneeJobs() instead for new urgent reschedule logic
   */
  async findCompetingJobs(assigneeId, urgentDueDate, prisma) {
    if (!chainConfig.enableUrgentReschedule) {
      return [];
    }

    const shiftDays = chainConfig.urgentShiftDays;
    const urgentStart = new Date(urgentDueDate);
    urgentStart.setDate(urgentStart.getDate() - shiftDays);
    const urgentEnd = new Date(urgentDueDate);
    urgentEnd.setDate(urgentEnd.getDate() + shiftDays);

    const competing = await prisma.job.findMany({
      where: {
        assigneeId,
        dueDate: {
          gte: urgentStart,
          lte: urgentEnd
        },
        status: {
          in: ['pending', 'approved', 'pending_approval', 'assigned']
        }
      },
      select: {
        id: true,
        djId: true,
        subject: true,
        status: true,
        dueDate: true,
        parentJobId: true
      }
    });

    return competing;
  }

  /**
   * Get all jobs in a chain (including parent and all descendants)
   *
   * @param {number} parentJobId - Parent job ID
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Array>} Array of all jobs in chain
   */
  async getChainJobs(parentJobId, prisma) {
    // Get parent job
    const parentJob = await prisma.job.findUnique({
      where: { id: parentJobId },
      select: {
        id: true,
        isParent: true,
        parentJobId: true
      }
    });

    if (!parentJob) {
      return [];
    }

    // Determine root parent
    let rootId = parentJobId;
    if (!parentJob.isParent && parentJob.parentJobId) {
      rootId = parentJob.parentJobId;
    }

    // Get all jobs with same parent (or same root)
    const chain = await prisma.job.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentJobId: rootId }
        ]
      },
      select: {
        id: true,
        djId: true,
        subject: true,
        status: true,
        dueDate: true,
        parentJobId: true,
        predecessorId: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return chain;
  }

  /**
   * Reschedule jobs due to an active urgent job.
   *
   * New rule:
   * - k = active urgent jobs for the same assignee, including this urgent job
   * - multiplier = min(k, 2)
   * - affected tasks = active jobs for the assignee, excluding this urgent job
   * - old urgent jobs are included in affected tasks
   * - tasks are sorted by baseline due date, createdAt, id
   * - delay for task i = i * multiplier working days from its baseline due date
   *
   * @param {Object} urgentJob - Urgent job object {id, djId, assigneeId, dueDate, tenantId, priority}
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Object>} {rescheduled: number, affected: Array}
   */
  async rescheduleForUrgent(urgentJob, prisma) {
    if (!chainConfig.enableUrgentReschedule) {
      return { rescheduled: 0, affected: [] };
    }

    if (!urgentJob?.id) {
      return { rescheduled: 0, affected: [], skipped: 'missing_urgent_job' };
    }

    const currentUrgentJob = await prisma.job.findUnique({
      where: { id: Number(urgentJob.id) },
      select: {
        id: true,
        djId: true,
        subject: true,
        assigneeId: true,
        tenantId: true,
        priority: true,
        status: true,
        dueDate: true,
        isParent: true
      }
    });

    if (!currentUrgentJob || !isUrgentPriority(currentUrgentJob.priority)) {
      return { rescheduled: 0, affected: [], skipped: 'not_urgent' };
    }

    if (!currentUrgentJob.assigneeId || currentUrgentJob.isParent) {
      return { rescheduled: 0, affected: [], skipped: 'no_assignee_or_parent' };
    }

    if (!URGENT_RESCHEDULE_ACTIVE_STATUSES.includes(currentUrgentJob.status)) {
      return { rescheduled: 0, affected: [], skipped: 'urgent_not_active' };
    }

    console.log(`[ChainService] 🚨 Cumulative reschedule for urgent job ${currentUrgentJob.djId} (assignee: ${currentUrgentJob.assigneeId})`);

    const urgentCount = await prisma.job.count({
      where: {
        tenantId: currentUrgentJob.tenantId,
        assigneeId: currentUrgentJob.assigneeId,
        isParent: false,
        priority: 'urgent',
        status: { in: URGENT_RESCHEDULE_ACTIVE_STATUSES }
      }
    });
    const multiplier = getUrgentDelayMultiplier(urgentCount);

    if (multiplier <= 0) {
      return { rescheduled: 0, affected: [], urgentCount, multiplier };
    }

    const jobs = await prisma.job.findMany({
      where: {
        tenantId: currentUrgentJob.tenantId,
        assigneeId: currentUrgentJob.assigneeId,
        id: { not: currentUrgentJob.id },
        isParent: false,
        dueDate: { not: null },
        status: { in: URGENT_RESCHEDULE_ACTIVE_STATUSES }
      },
      select: {
        id: true,
        djId: true,
        subject: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        parentJobId: true,
        requesterId: true,
        tenantId: true,
        requester: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        }
      }
    });

    if (jobs.length === 0) {
      return { rescheduled: 0, affected: [], urgentCount, multiplier };
    }

    const jobIds = jobs.map(job => job.id);
    const shiftLogs = await prisma.slaShiftLog.findMany({
      where: { jobId: { in: jobIds } },
      orderBy: { createdAt: 'asc' },
      select: {
        jobId: true,
        urgentJobId: true,
        originalDueDate: true,
        newDueDate: true,
        shiftDays: true,
        reason: true,
        createdAt: true
      }
    });

    const firstShiftLogByJobId = new Map();
    const currentUrgentLogJobIds = new Set();
    for (const log of shiftLogs) {
      if (!firstShiftLogByJobId.has(log.jobId)) {
        firstShiftLogByJobId.set(log.jobId, log);
      }
      if (log.urgentJobId === currentUrgentJob.id) {
        currentUrgentLogJobIds.add(log.jobId);
      }
    }

    const sortedTasks = jobs
      .filter(job => !currentUrgentLogJobIds.has(job.id))
      .map(job => {
        const firstShiftLog = firstShiftLogByJobId.get(job.id);
        return {
          ...job,
          baselineDueDate: firstShiftLog?.originalDueDate || job.dueDate,
          requesterEmail: job.requester?.email || null,
          requesterName:
            job.requester?.displayName
            || `${job.requester?.firstName || ''} ${job.requester?.lastName || ''}`.trim()
            || null
        };
      })
      .sort(sortByBaselineDueDate);

    const delayPlan = calculateUrgentDelayPlan({ urgentCount, tasks: sortedTasks });
    const plannedUpdates = [];

    for (const task of delayPlan) {
      const targetDueDate = await addWorkingDaysWithTenantHolidays({
        prisma,
        tenantId: task.tenantId,
        startDate: task.baselineDueDate,
        workingDays: task.shiftDays
      });

      if (!isLaterDate(targetDueDate, task.dueDate)) {
        console.log(`[ChainService] ⏭️  Skip ${task.djId}: target due date is not later than current due date`);
        continue;
      }

      plannedUpdates.push({
        ...task,
        oldDueDate: new Date(task.dueDate),
        newDueDate: targetDueDate,
        baselineDueDate: new Date(task.baselineDueDate)
      });
    }

    if (plannedUpdates.length === 0) {
      return { rescheduled: 0, affected: [], urgentCount, multiplier };
    }

    const affected = await prisma.$transaction(async (tx) => {
      const updated = [];

      for (const planned of plannedUpdates) {
        const updateResult = await tx.job.updateMany({
          where: {
            id: planned.id,
            dueDate: planned.oldDueDate,
            status: { in: URGENT_RESCHEDULE_ACTIVE_STATUSES }
          },
          data: {
            dueDate: planned.newDueDate
          }
        });

        if (updateResult.count !== 1) {
          console.warn(`[ChainService] Skip ${planned.djId}: due date changed before urgent update`);
          continue;
        }

        const reasonMetadata = {
          strategy: URGENT_STRATEGY_VERSION,
          urgentJobId: currentUrgentJob.id,
          urgentJobDjId: currentUrgentJob.djId,
          urgentCount,
          multiplier,
          queueIndex: planned.queueIndex,
          shiftDays: planned.shiftDays,
          baselineDueDate: format(planned.baselineDueDate, 'yyyy-MM-dd'),
          previousDueDate: format(planned.oldDueDate, 'yyyy-MM-dd'),
          newDueDate: format(planned.newDueDate, 'yyyy-MM-dd')
        };

        await tx.slaShiftLog.create({
          data: {
            jobId: planned.id,
            urgentJobId: currentUrgentJob.id,
            originalDueDate: planned.oldDueDate,
            newDueDate: planned.newDueDate,
            shiftDays: planned.shiftDays,
            reason: JSON.stringify(reasonMetadata)
          }
        });

        await tx.jobActivity.create({
          data: {
            tenantId: planned.tenantId,
            jobId: planned.id,
            userId: currentUrgentJob.assigneeId,
            activityType: 'job_auto_extended_urgent',
            description: `ระบบเลื่อนกำหนดส่ง ${planned.shiftDays} วันทำการ เนื่องจากมีงานด่วน ${currentUrgentJob.djId}`,
            metadata: reasonMetadata
          }
        });

        await tx.activityLog.create({
          data: {
            jobId: planned.id,
            userId: currentUrgentJob.assigneeId,
            action: 'job_auto_extended_urgent',
            message: `ระบบเลื่อนกำหนดส่ง ${planned.shiftDays} วันทำการ เนื่องจากมีงานด่วน ${currentUrgentJob.djId}`,
            detail: reasonMetadata
          }
        });

        updated.push({
          jobId: planned.id,
          djId: planned.djId,
          subject: planned.subject,
          oldDueDate: planned.oldDueDate,
          newDueDate: planned.newDueDate,
          baselineDueDate: planned.baselineDueDate,
          status: planned.status,
          priority: planned.priority,
          requesterId: planned.requesterId,
          tenantId: planned.tenantId,
          requesterEmail: planned.requesterEmail,
          requesterName: planned.requesterName,
          parentJobId: planned.parentJobId,
          queueIndex: planned.queueIndex,
          urgentCount,
          multiplier,
          shiftDays: planned.shiftDays
        });
      }

      const parentJobIds = [...new Set(updated.map(job => job.parentJobId).filter(Boolean))];
      for (const parentJobId of parentJobIds) {
        const children = await tx.job.findMany({
          where: {
            parentJobId,
            status: { notIn: TERMINAL_STATUSES },
            dueDate: { not: null }
          },
          select: { dueDate: true }
        });

        const maxDueDate = children.reduce((max, child) => {
          if (!child.dueDate) return max;
          if (!max || child.dueDate > max) return child.dueDate;
          return max;
        }, null);

        if (maxDueDate) {
          await tx.job.update({
            where: { id: parentJobId },
            data: { dueDate: maxDueDate }
          });
        }
      }

      return updated;
    });

    await this.notifyUrgentImpact({
      prisma,
      urgentJob: currentUrgentJob,
      affected,
      urgentCount,
      multiplier
    });

    console.log(`[ChainService] ✅ Cumulative urgent rescheduled ${affected.length} jobs for ${currentUrgentJob.djId}`);

    return {
      rescheduled: affected.length,
      affected,
      urgentCount,
      multiplier
    };
  }

  async notifyUrgentImpact({ prisma, urgentJob, affected }) {
    if (!affected || affected.length === 0) {
      return;
    }

    const emailService = new EmailService();
    const magicLinkService = new MagicLinkService();
    const testEmail = String(process.env.URGENT_IMPACT_TEST_EMAIL || '').trim();

    for (const affectedJob of affected) {
      if (!affectedJob.requesterId) {
        continue;
      }

      const message = [
        `ขอแจ้งให้ทราบว่า กำหนดส่งงาน ${affectedJob.djId} ได้รับการปรับเปลี่ยน เนื่องจากมีงานเร่งด่วนในลำดับการดำเนินงาน`,
        '',
        `กำหนดส่งเดิม: ${formatThaiDate(affectedJob.oldDueDate)}`,
        `กำหนดส่งใหม่: ${formatThaiDate(affectedJob.newDueDate)}`
      ].join('\n');

      await prisma.notification.create({
        data: {
          tenantId: affectedJob.tenantId,
          userId: affectedJob.requesterId,
          type: 'job_auto_extended',
          title: `แจ้งปรับกำหนดส่งงาน ${affectedJob.djId}`,
          message,
          link: `/jobs/${affectedJob.jobId}`,
          isRead: false
        }
      }).catch(err => console.warn(`[ChainService] Failed to create urgent notification for ${affectedJob.djId}:`, err.message));

      if (!affectedJob.requesterEmail && !testEmail) {
        continue;
      }

      let jobUrl = buildFrontendUrl(`/jobs/${affectedJob.jobId}`);
      try {
        jobUrl = await magicLinkService.createJobActionLink({
          userId: affectedJob.requesterId,
          jobId: affectedJob.jobId,
          action: 'view',
          djId: affectedJob.djId
        });
      } catch (magicErr) {
        console.warn(`[ChainService] Failed to create magic link for ${affectedJob.djId}, fallback to frontend URL:`, magicErr.message);
      }

      const emailHtml = buildUrgentImpactEmail({
        affectedJob,
        magicLink: jobUrl
      });
      const subject = `แจ้งปรับกำหนดส่งงาน ${affectedJob.djId}`;

      if (affectedJob.requesterEmail) {
        await emailService.sendEmail(
          affectedJob.requesterEmail,
          subject,
          emailHtml
        ).catch(err => console.warn(`[ChainService] Failed to send urgent impact email for ${affectedJob.djId}:`, err.message));
      }

      if (testEmail && testEmail !== affectedJob.requesterEmail) {
        await emailService.sendEmail(
          testEmail,
          `[UAT] ${subject}`,
          emailHtml
        ).catch(err => console.warn(`[ChainService] Failed to send urgent impact UAT email for ${affectedJob.djId}:`, err.message));
      }
    }
  }

  /**
   * Cascade reject downstream jobs when a job is rejected
   * Only rejects jobs that are not already completed or rejected
   *
   * @param {number} rejectedJobId - Job that was rejected
   * @param {Object} prisma - Prisma client
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} {rejected: number, affected: Array}
   */
  async cascadeRejectDownstream(rejectedJobId, prisma, reason = '') {
    const affected = [];

    // Get the rejected job info
    const rejectedJob = await prisma.job.findUnique({
      where: { id: rejectedJobId },
      select: { id: true, djId: true, subject: true }
    });

    if (!rejectedJob) {
      return { rejected: 0, affected: [] };
    }

    // Find all descendants (direct successors and children)
    const findDescendants = async (jobId, visited = new Set()) => {
      if (visited.has(jobId)) return [];
      visited.add(jobId);

      const descendants = await prisma.job.findMany({
        where: {
          OR: [
            { predecessorId: jobId },
            { parentJobId: jobId }
          ],
          status: { notIn: ['completed', 'rejected'] }
        },
        select: {
          id: true,
          djId: true,
          subject: true,
          status: true,
          assigneeId: true
        }
      });

      let allDescendants = [...descendants];

      // Recursively find descendants of descendants
      for (const desc of descendants) {
        const subDescendants = await findDescendants(desc.id, visited);
        allDescendants = [...allDescendants, ...subDescendants];
      }

      return allDescendants;
    };

    const descendants = await findDescendants(rejectedJobId);

    // Reject each descendant
    for (const job of descendants) {
      // Determine rejection source type
      const isChildOfParent = await prisma.job.findFirst({
        where: { id: job.id, parentJobId: rejectedJobId }
      });

      const rejectionSource = isChildOfParent ? 'cascade_parent' : 'cascade_predecessor';

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'rejected',
          rejectionSource  // ✅ NEW: Track cascade rejection source
        }
      });

      affected.push({
        jobId: job.id,
        djId: job.djId,
        subject: job.subject,
        previousStatus: job.status,
        assigneeId: job.assigneeId,
        reason: `งานก่อนหน้า (${rejectedJob.djId}) ถูกปฏิเสธ: ${reason}`
      });

      console.log(
        `[ChainService] Cascade Rejected: ${job.djId} (was: ${job.status})`
      );
    }

    if (affected.length > 0) {
      console.log(
        `[ChainService] Cascade Reject Complete: ${affected.length} jobs rejected due to ${rejectedJob.djId}`
      );
    }

    return {
      rejected: affected.length,
      affected,
      sourceJob: rejectedJob.djId
    };
  }

  /**
   * Notify next job in chain that predecessor completed
   *
   * @param {number} completedJobId - Job that was completed
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Object>} Notification details
   */
  async notifyNextJob(completedJobId, prisma) {
    if (!chainConfig.enableChainNotifications) {
      return { notified: false };
    }

    const completedJob = await prisma.job.findUnique({
      where: { id: completedJobId },
      select: {
        id: true,
        djId: true,
        subject: true,
        completedAt: true
      }
    });

    if (!completedJob) {
      return { notified: false, error: 'Job not found' };
    }

    // Find next job (any job with this as predecessor)
    const nextJob = await prisma.job.findFirst({
      where: {
        predecessorId: completedJobId,
        status: { not: 'completed' }
      },
      select: {
        id: true,
        djId: true,
        subject: true,
        assigneeId: true,
        dueDate: true,
        status: true
      }
    });

    if (!nextJob) {
      console.log(
        `[ChainService] No next job found for ${completedJob.djId}`
      );
      return { notified: false, nextJob: null };
    }

    // Update next job status to 'ready' if pending_dependency
    if (nextJob.status === 'pending_dependency') {
      await prisma.job.update({
        where: { id: nextJob.id },
        data: { status: 'ready' }
      });
    }

    console.log(
      `[ChainService] Notified next job: ${nextJob.djId} (assignee: ${nextJob.assigneeId})`
    );

    return {
      notified: true,
      nextJob: {
        id: nextJob.id,
        djId: nextJob.djId,
        subject: nextJob.subject,
        assigneeId: nextJob.assigneeId,
        dueDate: nextJob.dueDate
      },
      message: `${completedJob.djId} completed. You can start now!`
    };
  }
}

export default new ChainService();
