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
   * Find all jobs competing for same assignee within date range
   * Used for urgent job rescheduling
   *
   * @param {number} assigneeId - Assignee user ID
   * @param {Date} urgentDueDate - Urgent job's due date
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Array>} Array of competing jobs
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
   * Shifts all competing pending jobs by URGENT_SHIFT_DAYS
   *
   * @param {Object} urgentJob - Urgent job object {assigneeId, dueDate}
   * @param {Object} prisma - Prisma client
   * @returns {Promise<Object>} {rescheduled: number, affected: Array}
   */
  async rescheduleForUrgent(urgentJob, prisma) {
    if (!chainConfig.enableUrgentReschedule) {
      return { rescheduled: 0, affected: [] };
    }

    const competing = await this.findCompetingJobs(
      urgentJob.assigneeId,
      urgentJob.dueDate,
      prisma
    );

    const shiftDays = chainConfig.urgentShiftDays;
    const affected = [];

    for (const job of competing) {
      if (job.status === 'in_progress' || job.status === 'completed') {
        // Skip in-progress and completed jobs
        continue;
      }

      // Shift the job
      const newDueDate = new Date(job.dueDate);
      newDueDate.setDate(newDueDate.getDate() + shiftDays);

      await prisma.job.update({
        where: { id: job.id },
        data: { dueDate: newDueDate }
      });

      affected.push({
        jobId: job.id,
        djId: job.djId,
        subject: job.subject,
        oldDueDate: job.dueDate,
        newDueDate,
        status: job.status
      });

      // If this job has children, shift them too (cascade)
      const children = await prisma.job.findMany({
        where: { parentJobId: job.id }
      });

      for (const child of children) {
        const childNewDueDate = new Date(child.dueDate);
        childNewDueDate.setDate(childNewDueDate.getDate() + shiftDays);

        await prisma.job.update({
          where: { id: child.id },
          data: { dueDate: childNewDueDate }
        });

        affected.push({
          jobId: child.id,
          djId: child.djId,
          subject: child.subject,
          oldDueDate: child.dueDate,
          newDueDate: childNewDueDate,
          status: child.status,
          cascaded: true
        });
      }
    }

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
