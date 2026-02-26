import { getDatabase } from '../config/database.js';

class JobService {
    constructor() {
        this.prisma = getDatabase();
    }

    /**
     * Triggered when a job is completed or closed.
     * Checks for successor jobs (Sequential Job Logic) and auto-starts them.
     * 
     * @param {number} jobId - The ID of the completed job
     * @param {number} userId - The ID of the user who completed the job
     */
    async onJobCompleted(jobId, userId) {
        console.log(`[JobService] onJobCompleted detected for Job #${jobId}`);

        // 1. Find Successors (Jobs waiting for this job)
        const successors = await this.prisma.job.findMany({
            where: {
                predecessorId: jobId,
                status: 'pending_dependency' // Only auto-start if they are in waiting state
            }
        });

        if (successors.length === 0) {
            console.log('[JobService] No successors found.');
            return;
        }

        console.log(`[JobService] Found ${successors.length} successors to auto-start.`);

        // 2. Auto-Start Logic
        for (const job of successors) {
            try {
                // Calculate New Due Date: NOW + original SLA Days
                const newDueDate = this.calculateNewDueDate(job.slaDays || 2); // Default 2 if missing

                await this.prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'assigned', // Auto-start to assigned (ready to work)
                        dueDate: newDueDate,
                        startedAt: new Date() // Mark as started immediately
                    }
                });

                // ✅ FIX: Create implicit approval record for dependent jobs
                // When dependent job moves from pending_dependency to assigned,
                // it should have an approval record in the audit trail
                // This ensures all sequential jobs have complete approval history
                try {
                    // Check if this job already has an approval record
                    const existingApproval = await this.prisma.approval.findFirst({
                        where: { jobId: job.id }
                    });

                    if (!existingApproval) {
                        // Get requester info for audit trail
                        const jobDetails = await this.prisma.job.findUnique({
                            where: { id: job.id },
                            select: { requesterId: true, tenantId: true }
                        });

                        if (jobDetails?.requesterId) {
                            await this.prisma.approval.create({
                                data: {
                                    jobId: job.id,
                                    approverId: jobDetails.requesterId, // System/requester approval
                                    stepNumber: 1,
                                    status: 'approved',
                                    approvedAt: new Date(),
                                    comment: `Auto-approved: Dependent job auto-started by predecessor completion`,
                                    tenantId: jobDetails.tenantId
                                }
                            });

                            console.log(`[JobService] Created implicit approval for dependent job #${job.id}`);
                        }
                    }
                } catch (approvalErr) {
                    console.warn(`[JobService] Failed to create approval record for job #${job.id}:`, approvalErr.message);
                    // Don't fail the whole operation if approval record creation fails
                }

                // Add Activity Log
                await this.prisma.activityLog.create({
                    data: {
                        jobId: job.id,
                        userId: userId, // System action triggered by user
                        action: 'auto_start',
                        message: `Auto-started because predecessor Job #${jobId} was completed. New Due Date: ${newDueDate.toISOString()}`,
                        detail: JSON.stringify({
                            predecessorJobId: jobId,
                            autoApproved: true,
                            reason: 'dependent_job_auto_start'
                        })
                    }
                });

                console.log(`[JobService] Auto-started Job #${job.id} (Successor of #${jobId})`);

                // TODO: Send Notification to Assignee of this job

            } catch (err) {
                console.error(`[JobService] Failed to auto-start Job #${job.id}:`, err);
            }
        }
    }

    /**
     * Calculate due date skipping weekends (Simple version)
     * TODO: Use HolidayService for accurate calculation
     */
    calculateNewDueDate(slaDays) {
        let date = new Date();
        let daysAdded = 0;

        while (daysAdded < slaDays) {
            date.setDate(date.getDate() + 1);
            // 0 = Sunday, 6 = Saturday
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                daysAdded++;
            }
        }

        // Set End of Day (18:00)
        date.setHours(18, 0, 0, 0);
        return date;
    }
}

export default JobService;
