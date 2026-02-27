/**
 * Rejection Request Auto-Close Cron Service
 *
 * Automatically approves pending rejection requests after timeout (default: 24 hours)
 *
 * When Assignee requests rejection and Approver doesn't respond within the timeout period,
 * the system will automatically approve the rejection request.
 *
 * Usage:
 * - Call startAutoCloseCron() in server startup
 * - Runs every hour to check for expired rejection requests
 */

import { getDatabase } from '../config/database.js';
import jobChainService from './jobChainService.js';
const prisma = getDatabase();

class RejectionAutoCloseCron {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.intervalMinutes = 60; // Run every 60 minutes
  }

  /**
   * Start the auto-close cron job
   */
  start() {
    if (this.isRunning) {
      console.warn('[RejectionAutoClose] Cron already running');
      return;
    }

    console.log(`[RejectionAutoClose] Starting cron (every ${this.intervalMinutes} minutes)`);

    // Run immediately on start
    this.processExpiredRequests();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.processExpiredRequests();
    }, this.intervalMinutes * 60 * 1000);

    this.isRunning = true;
  }

  /**
   * Stop the auto-close cron job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('[RejectionAutoClose] Cron stopped');
    }
  }

  /**
   * Process all expired rejection requests
   */
  async processExpiredRequests() {
    try {
      const now = new Date();

      // Find all pending rejection requests that have passed autoCloseAt
      const expiredRequests = await prisma.rejectionRequest.findMany({
        where: {
          status: 'pending',
          autoCloseEnabled: true,
          autoCloseAt: {
            lte: now // autoCloseAt <= now
          }
        },
        include: {
          job: {
            select: {
              id: true,
              djId: true,
              status: true,
              isParent: true,
              nextJobId: true,
              requesterId: true,
              assigneeId: true
            }
          },
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (expiredRequests.length === 0) {
        console.log('[RejectionAutoClose] No expired rejection requests found');
        return;
      }

      console.log(`[RejectionAutoClose] Found ${expiredRequests.length} expired rejection requests`);

      // Process each request
      for (const request of expiredRequests) {
        try {
          await this.autoApproveRejectionRequest(request);
        } catch (err) {
          console.error(`[RejectionAutoClose] Failed to auto-approve request ${request.id}:`, err);
          // Continue with next request
        }
      }

    } catch (error) {
      console.error('[RejectionAutoClose] Error in processExpiredRequests:', error);
    }
  }

  /**
   * Auto-approve a single rejection request
   *
   * @param {Object} request - The rejection request with job details
   */
  async autoApproveRejectionRequest(request) {
    try {
      const { id: requestId, jobId, tenantId, job, requester } = request;

      console.log(`[RejectionAutoClose] Auto-approving request ${requestId} for job ${job.djId}`);

      // Update rejection request status to auto_approved
      await prisma.rejectionRequest.update({
        where: { id: requestId },
        data: {
          status: 'auto_approved',
          approvedAt: new Date()
          // Note: approvedBy is NULL for auto-approval
        }
      });

      // Update job status to rejected_by_assignee
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'rejected_by_assignee' }
      });

      // Log activity
      await prisma.jobActivity.create({
        data: {
          jobId: jobId,
          userId: requester.id, // Use assignee as actor
          action: 'rejection_auto_approved',
          message: 'ระบบอนุมัติคำขอปฏิเสธอัตโนมัติ (Approver ไม่ตอบกลับภายใน 24 ชั่วโมง)',
          detail: {
            rejectionRequestId: requestId,
            autoClosedAt: new Date().toISOString(),
            reason: request.reason
          },
          tenantId: tenantId
        }
      }).catch(err => {
        console.error(`[RejectionAutoClose] Failed to log activity for job ${jobId}:`, err);
      });

      // Add system comment
      await prisma.jobComment.create({
        data: {
          jobId: jobId,
          userId: requester.id,
          comment: '⏰ ระบบอนุมัติคำขอปฏิเสธอัตโนมัติเนื่องจาก Approver ไม่ตอบกลับภายในเวลาที่กำหนด (24 ชั่วโมง)',
          tenantId: tenantId
        }
      }).catch(err => {
        console.error(`[RejectionAutoClose] Failed to create comment for job ${jobId}:`, err);
      });

      // Cancel chained jobs (if any)
      let cancelledCount = 0;
      try {
        if (job.isParent) {
          // Cancel all child jobs
          const cancelledIds = await jobChainService.cancelChildJobs(
            jobId,
            tenantId,
            `Parent job (${job.djId}) auto-rejected (no approver response)`,
            requester.id
          );
          cancelledCount = cancelledIds.length;
        } else if (job.nextJobId) {
          // Cancel downstream chain
          const cancelledIds = await jobChainService.cancelChainedJobs(
            jobId,
            tenantId,
            `Previous job (${job.djId}) auto-rejected (no approver response)`,
            requester.id
          );
          cancelledCount = cancelledIds.length;
        }

        if (cancelledCount > 0) {
          console.log(`[RejectionAutoClose] Cancelled ${cancelledCount} related jobs for ${job.djId}`);
        }
      } catch (chainErr) {
        console.error(`[RejectionAutoClose] Chain cancellation warning (non-blocking):`, chainErr);
      }

      // TODO: Send notifications
      // - Notify requester that job was auto-rejected
      // - Notify assignee that their rejection request was auto-approved
      // - Optionally notify approvers that they missed the deadline

      console.log(`[RejectionAutoClose] Successfully auto-approved request ${requestId} for job ${job.djId}`);

    } catch (error) {
      console.error('[RejectionAutoClose] Error in autoApproveRejectionRequest:', error);
      throw error;
    }
  }

  /**
   * Manual trigger for testing
   */
  async manualTrigger() {
    console.log('[RejectionAutoClose] Manual trigger initiated');
    await this.processExpiredRequests();
  }
}

// Singleton instance
const rejectionAutoCloseCron = new RejectionAutoCloseCron();

// Export both the class and the singleton instance
export { RejectionAutoCloseCron };
export default rejectionAutoCloseCron;
