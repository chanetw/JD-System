/**
 * Job Chain Cancellation Service
 *
 * Handles cascading cancellation of chained jobs when a job in the chain is rejected.
 *
 * Chain Logic:
 * - Jobs can be linked via previousJobId/nextJobId (A → B → C)
 * - When job B is rejected, all downstream jobs (C, D, ...) should be cancelled
 * - Parent-child relationships are NOT considered chains (handled separately)
 */

import { getDatabase } from '../config/database.js';
const prisma = getDatabase();

class JobChainService {
  /**
   * Cancel all jobs downstream in the chain from a given job
   *
   * @param {number} jobId - The job that was rejected (starting point)
   * @param {number} tenantId - Tenant ID for security
   * @param {string} reason - Reason for cancellation
   * @param {number} userId - User ID who triggered the cancellation
   * @returns {Promise<Array>} - Array of cancelled job IDs
   */
  async cancelChainedJobs(jobId, tenantId, reason, userId) {
    try {
      const cancelledJobIds = [];

      // 1. Get the rejected job
      const rejectedJob = await prisma.job.findUnique({
        where: { id: jobId, tenantId },
        select: {
          id: true,
          nextJobId: true,
          djId: true,
          status: true
        }
      });

      if (!rejectedJob) {
        console.warn(`[JobChainService] Job ${jobId} not found or not in tenant ${tenantId}`);
        return cancelledJobIds;
      }

      // 2. Traverse the chain forward (nextJobId → nextJobId → ...)
      let currentJobId = rejectedJob.nextJobId;
      const maxDepth = 50; // Safety limit to prevent infinite loops
      let depth = 0;

      while (currentJobId && depth < maxDepth) {
        const nextJob = await prisma.job.findUnique({
          where: { id: currentJobId, tenantId },
          select: {
            id: true,
            nextJobId: true,
            status: true,
            djId: true
          }
        });

        if (!nextJob) {
          console.warn(`[JobChainService] Next job ${currentJobId} not found in chain`);
          break;
        }

        // Only cancel if job is not already in a terminal state
        const terminalStates = ['completed', 'closed', 'cancelled', 'rejected', 'rejected_by_assignee'];
        if (!terminalStates.includes(nextJob.status)) {
          // Update job status to cancelled
          await prisma.job.update({
            where: { id: nextJob.id },
            data: {
              status: 'cancelled',
              cancellationReason: reason || `Previous job in chain (${rejectedJob.djId}) was rejected`
            }
          });

          cancelledJobIds.push(nextJob.id);

          // Log activity
          await prisma.jobActivity.create({
            data: {
              jobId: nextJob.id,
              userId: userId,
              action: 'job_cancelled',
              message: `งานถูกยกเลิกเนื่องจากงานก่อนหน้า (${rejectedJob.djId}) ถูกปฏิเสธ`,
              detail: {
                reason: reason,
                triggeredByJobId: rejectedJob.id,
                triggeredByDjId: rejectedJob.djId
              },
              tenantId: tenantId
            }
          }).catch(err => {
            console.error(`[JobChainService] Failed to log activity for job ${nextJob.id}:`, err);
          });

          console.log(`[JobChainService] Cancelled job ${nextJob.djId} (ID: ${nextJob.id}) in chain`);
        } else {
          console.log(`[JobChainService] Job ${nextJob.djId} already in terminal state (${nextJob.status}), skipping`);
        }

        // Move to next job in chain
        currentJobId = nextJob.nextJobId;
        depth++;
      }

      if (depth >= maxDepth) {
        console.error(`[JobChainService] Max chain depth (${maxDepth}) reached for job ${jobId}. Possible circular reference.`);
      }

      return cancelledJobIds;

    } catch (error) {
      console.error('[JobChainService] Error in cancelChainedJobs:', error);
      throw error;
    }
  }

  /**
   * Cancel all child jobs of a parent when parent is rejected
   *
   * @param {number} parentJobId - The parent job ID
   * @param {number} tenantId - Tenant ID for security
   * @param {string} reason - Reason for cancellation
   * @param {number} userId - User ID who triggered the cancellation
   * @returns {Promise<Array>} - Array of cancelled child job IDs
   */
  async cancelChildJobs(parentJobId, tenantId, reason, userId) {
    try {
      const cancelledChildIds = [];

      // Get parent job
      const parentJob = await prisma.job.findUnique({
        where: { id: parentJobId, tenantId },
        select: {
          id: true,
          djId: true,
          isParent: true
        }
      });

      if (!parentJob || !parentJob.isParent) {
        console.warn(`[JobChainService] Job ${parentJobId} is not a parent job`);
        return cancelledChildIds;
      }

      // Get all child jobs
      const childJobs = await prisma.job.findMany({
        where: {
          parentJobId: parentJobId,
          tenantId: tenantId
        },
        select: {
          id: true,
          djId: true,
          status: true
        }
      });

      // Cancel each child job (if not already in terminal state)
      const terminalStates = ['completed', 'closed', 'cancelled', 'rejected', 'rejected_by_assignee'];

      for (const child of childJobs) {
        if (!terminalStates.includes(child.status)) {
          await prisma.job.update({
            where: { id: child.id },
            data: {
              status: 'cancelled',
              cancellationReason: reason || `Parent job (${parentJob.djId}) was rejected`
            }
          });

          cancelledChildIds.push(child.id);

          // Log activity
          await prisma.jobActivity.create({
            data: {
              jobId: child.id,
              userId: userId,
              action: 'job_cancelled',
              message: `งานถูกยกเลิกเนื่องจาก Parent Job (${parentJob.djId}) ถูกปฏิเสธ`,
              detail: {
                reason: reason,
                parentJobId: parentJob.id,
                parentDjId: parentJob.djId
              },
              tenantId: tenantId
            }
          }).catch(err => {
            console.error(`[JobChainService] Failed to log activity for child job ${child.id}:`, err);
          });

          console.log(`[JobChainService] Cancelled child job ${child.djId} (ID: ${child.id})`);
        } else {
          console.log(`[JobChainService] Child job ${child.djId} already in terminal state (${child.status}), skipping`);
        }
      }

      return cancelledChildIds;

    } catch (error) {
      console.error('[JobChainService] Error in cancelChildJobs:', error);
      throw error;
    }
  }

  /**
   * Check if parent job can be closed (all children must be completed or some rejected)
   * Returns status for parent job based on children states
   *
   * @param {number} parentJobId - The parent job ID
   * @param {number} tenantId - Tenant ID for security
   * @returns {Promise<Object>} - { canClose, newStatus, reason }
   */
  async checkParentJobClosure(parentJobId, tenantId) {
    try {
      // Get all child jobs
      const childJobs = await prisma.job.findMany({
        where: {
          parentJobId: parentJobId,
          tenantId: tenantId
        },
        select: {
          id: true,
          djId: true,
          status: true
        }
      });

      if (childJobs.length === 0) {
        return {
          canClose: false,
          newStatus: null,
          reason: 'No child jobs found'
        };
      }

      // Count jobs by status
      const completedCount = childJobs.filter(j => j.status === 'completed' || j.status === 'closed').length;
      const rejectedCount = childJobs.filter(j =>
        j.status === 'rejected' ||
        j.status === 'rejected_by_assignee' ||
        j.status === 'cancelled'
      ).length;
      const totalCount = childJobs.length;

      // All completed → Parent can be completed
      if (completedCount === totalCount) {
        return {
          canClose: true,
          newStatus: 'completed',
          reason: 'All child jobs completed',
          stats: { completed: completedCount, rejected: rejectedCount, total: totalCount }
        };
      }

      // Some completed + some rejected → Parent is partially_completed
      if (completedCount > 0 && rejectedCount > 0 && (completedCount + rejectedCount) === totalCount) {
        return {
          canClose: true,
          newStatus: 'partially_completed',
          reason: 'Some child jobs completed, some rejected',
          stats: { completed: completedCount, rejected: rejectedCount, total: totalCount }
        };
      }

      // All rejected → Parent should be rejected (this is edge case, usually parent is rejected first)
      if (rejectedCount === totalCount) {
        return {
          canClose: true,
          newStatus: 'rejected',
          reason: 'All child jobs rejected',
          stats: { completed: completedCount, rejected: rejectedCount, total: totalCount }
        };
      }

      // Otherwise, cannot close yet (some jobs still in progress)
      return {
        canClose: false,
        newStatus: null,
        reason: 'Some child jobs still in progress',
        stats: { completed: completedCount, rejected: rejectedCount, total: totalCount }
      };

    } catch (error) {
      console.error('[JobChainService] Error in checkParentJobClosure:', error);
      throw error;
    }
  }
}

export default new JobChainService();
