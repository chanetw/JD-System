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
import { addBusinessDays, format } from 'date-fns';

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
        tenantId: true
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
   * Reschedule jobs due to urgent job approval
   * Extends ALL active jobs of the assignee by URGENT_SHIFT_DAYS (working days)
   * Also extends child jobs and sends notifications to requesters
   *
   * @param {Object} urgentJob - Urgent job object {id, djId, assigneeId, dueDate, tenantId}
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Object>} {rescheduled: number, affected: Array}
   */
  async rescheduleForUrgent(urgentJob, prisma) {
    if (!chainConfig.enableUrgentReschedule) {
      return { rescheduled: 0, affected: [] };
    }

    console.log(`[ChainService] 🚨 Reschedule for urgent job ${urgentJob.djId} (assignee: ${urgentJob.assigneeId})`);

    // หางานทั้งหมดของ assignee (ใช้ฟังก์ชันใหม่)
    const jobs = await this.findAllAssigneeJobs(urgentJob.assigneeId, prisma);
    
    const shiftDays = chainConfig.urgentShiftDays;
    const affected = [];
    const processedJobIds = new Set(); // ป้องกัน extend ซ้ำ

    for (const job of jobs) {
      // ข้ามงาน urgent ที่เป็นตัวกระตุ้น
      if (job.id === urgentJob.id) {
        console.log(`[ChainService] ⏭️  Skip urgent job itself: ${job.djId}`);
        continue;
      }
      
      // ข้ามถ้า extend ไปแล้ว
      if (processedJobIds.has(job.id)) {
        console.log(`[ChainService] ⏭️  Skip already processed: ${job.djId}`);
        continue;
      }

      // ข้ามงานที่ไม่มี dueDate
      if (!job.dueDate) {
        console.log(`[ChainService] ⏭️  Skip job without dueDate: ${job.djId}`);
        continue;
      }

      // Extend งานนี้ (ใช้ working days)
      const oldDueDate = new Date(job.dueDate);
      const newDueDate = addBusinessDays(oldDueDate, shiftDays);
      
      await prisma.job.update({
        where: { id: job.id },
        data: { 
          dueDate: newDueDate,
          updatedAt: new Date()
        }
      });

      console.log(`[ChainService] ✅ Extended ${job.djId}: ${format(oldDueDate, 'yyyy-MM-dd')} → ${format(newDueDate, 'yyyy-MM-dd')}`);

      affected.push({
        jobId: job.id,
        djId: job.djId,
        subject: job.subject,
        oldDueDate: oldDueDate,
        newDueDate: newDueDate,
        status: job.status,
        requesterId: job.requesterId,
        tenantId: job.tenantId,
        isParent: job.isParent
      });
      
      processedJobIds.add(job.id);

      // ถ้างานนี้เป็น parent → extend child jobs ทั้งหมด
      if (job.isParent) {
        const children = await prisma.job.findMany({
          where: { 
            parentJobId: job.id,
            status: { notIn: ['completed', 'closed', 'rejected'] }
          },
          select: {
            id: true, djId: true, subject: true, 
            dueDate: true, status: true,
            requesterId: true, tenantId: true
          }
        });

        console.log(`[ChainService] 👨‍👩‍👧‍👦 Parent job ${job.djId} has ${children.length} child jobs`);

        for (const child of children) {
          if (processedJobIds.has(child.id)) {
            console.log(`[ChainService] ⏭️  Skip already processed child: ${child.djId}`);
            continue;
          }

          if (!child.dueDate) {
            console.log(`[ChainService] ⏭️  Skip child without dueDate: ${child.djId}`);
            continue;
          }
          
          const childOldDueDate = new Date(child.dueDate);
          const childNewDueDate = addBusinessDays(childOldDueDate, shiftDays);
          
          await prisma.job.update({
            where: { id: child.id },
            data: { 
              dueDate: childNewDueDate,
              updatedAt: new Date()
            }
          });

          console.log(`[ChainService] ✅ Extended child ${child.djId}: ${format(childOldDueDate, 'yyyy-MM-dd')} → ${format(childNewDueDate, 'yyyy-MM-dd')}`);

          affected.push({
            jobId: child.id,
            djId: child.djId,
            subject: child.subject,
            oldDueDate: childOldDueDate,
            newDueDate: childNewDueDate,
            status: child.status,
            requesterId: child.requesterId,
            tenantId: child.tenantId,
            cascaded: true,
            parentJobId: job.id
          });
          
          processedJobIds.add(child.id);
        }
      }
    }

    // บันทึก Activity Log และส่ง Notification สำหรับทุกงานที่ถูก extend
    for (const affectedJob of affected) {
      try {
        // 1. บันทึก Activity Log
        await prisma.activityLog.create({
          data: {
            tenantId: affectedJob.tenantId,
            jobId: affectedJob.jobId,
            userId: urgentJob.assigneeId,
            action: 'job_auto_extended_urgent',
            description: `ระบบ Extend งานอัตโนมัติ ${shiftDays} วันทำการ เนื่องจากมีงานด่วน ${urgentJob.djId}`,
            metadata: JSON.stringify({
              urgentJobId: urgentJob.id,
              urgentJobDjId: urgentJob.djId,
              extensionDays: shiftDays,
              oldDueDate: format(affectedJob.oldDueDate, 'yyyy-MM-dd'),
              newDueDate: format(affectedJob.newDueDate, 'yyyy-MM-dd'),
              cascaded: affectedJob.cascaded || false,
              parentJobId: affectedJob.parentJobId || null
            })
          }
        }).catch(err => console.warn(`[ChainService] Failed to create activity log for ${affectedJob.djId}:`, err.message));

        // 2. แจ้งเตือน Requester (ไม่แจ้ง assignee)
        if (affectedJob.requesterId) {
          const message = affectedJob.cascaded 
            ? `งาน ${affectedJob.djId} (งานพ่วง) ถูกขยายกำหนดส่งอัตโนมัติ ${shiftDays} วันทำการ เนื่องจากมีงานด่วน ${urgentJob.djId}\n\nDue Date เดิม: ${format(affectedJob.oldDueDate, 'dd/MM/yyyy')}\nDue Date ใหม่: ${format(affectedJob.newDueDate, 'dd/MM/yyyy')}`
            : `งาน ${affectedJob.djId} ถูกขยายกำหนดส่งอัตโนมัติ ${shiftDays} วันทำการ เนื่องจากมีงานด่วน ${urgentJob.djId}\n\nDue Date เดิม: ${format(affectedJob.oldDueDate, 'dd/MM/yyyy')}\nDue Date ใหม่: ${format(affectedJob.newDueDate, 'dd/MM/yyyy')}`;

          await prisma.notification.create({
            data: {
              tenantId: affectedJob.tenantId,
              userId: affectedJob.requesterId,
              type: 'job_auto_extended',
              title: `งาน ${affectedJob.djId} ถูกขยายกำหนดส่ง`,
              message: message,
              link: `/jobs/${affectedJob.jobId}`,
              isRead: false
            }
          }).catch(err => console.warn(`[ChainService] Failed to create notification for ${affectedJob.djId}:`, err.message));
        }
      } catch (err) {
        console.error(`[ChainService] Error processing affected job ${affectedJob.djId}:`, err);
      }
    }

    console.log(`[ChainService] ✅ Rescheduled ${affected.length} jobs for urgent job ${urgentJob.djId}`);

    return {
      rescheduled: affected.length,
      affected,
      shiftDays
    };
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
          rejectionSource,  // ✅ NEW: Track cascade rejection source
          updatedAt: new Date()
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
