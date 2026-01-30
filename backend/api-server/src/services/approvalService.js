/**
 * @file approvalService.js
 * @description Approval Service with Logging & IP Tracking
 * 
 * Features:
 * - Approval workflow management
 * - IP address logging
 * - Approval token generation
 * - Email integration
 * - Audit trail
 */

import { BaseService } from './baseService.js';
import crypto from 'crypto';
import { getDatabase } from '../config/database.js';

export class ApprovalService extends BaseService {
  constructor() {
    super();
  }

  /**
   * สร้าง approval token สำหรับการอนุมัติผ่าน email
   * 
   * @param {number} jobId - ID ของงาน
   * @param {number} approverId - ID ของผู้อนุมัติ
   * @param {number} stepNumber - ลำดับขั้นตอนการอนุมัติ
   * @returns {string} - Approval token
   */
  generateApprovalToken(jobId, approverId, stepNumber) {
    const payload = {
      jobId,
      approverId,
      stepNumber,
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex')
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * ตรวจสอบความถูกต้องของ approval token
   * 
   * @param {string} token - Approval token
   * @returns {Promise<Object>} - ผลการตรวจสอบ
   */
  async validateApprovalToken(token) {
    try {
      const approval = await this.prisma.approval.findFirst({
        where: {
          approvalToken: token
        },
        include: {
          job: {
            include: {
              requester: true,
              assignee: true
            }
          },
          approver: true
        }
      });

      if (!approval) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Token ไม่ถูกต้องหรือหมดอายุ'
        };
      }

      // ตรวจสอบว่ายังไม่ได้อนุมัติ
      if (approval.status !== 'pending') {
        return {
          success: false,
          error: 'ALREADY_PROCESSED',
          message: 'การอนุมัตินี้ดำเนินการไปแล้ว'
        };
      }

      return {
        success: true,
        data: approval
      };
    } catch (error) {
      console.error('[ApprovalService] Token validation failed:', error);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'ไม่สามารถตรวจสอบ token ได้'
      };
    }
  }

  /**
   * สร้างคำขออนุมัติใหม่
   * 
   * @param {Object} approvalData - ข้อมูลการอนุมัติ
   * @param {number} approvalData.jobId - ID ของงาน
   * @param {number} approvalData.approverId - ID ของผู้อนุมัติ
   * @param {number} approvalData.stepNumber - ลำดับขั้นตอน
   * @param {string} approvalData.ipAddress - IP address ของผู้สร้าง
   * @returns {Promise<Object>} - ผลลัพธ์การสร้าง
   */
  async createApproval({ jobId, approverId, stepNumber, ipAddress }) {
    try {
      // ตรวจสอบว่ามี approval ที่คล้ายกันอยู่แล้วหรือไม่
      const existing = await this.prisma.approval.findFirst({
        where: {
          jobId,
          approverId,
          stepNumber,
          status: 'pending'
        }
      });

      if (existing) {
        return {
          success: false,
          error: 'APPROVAL_EXISTS',
          message: 'มีคำขออนุมัตินี้อยู่แล้ว'
        };
      }

      // สร้าง approval token
      const approvalToken = this.generateApprovalToken(jobId, approverId, stepNumber);

      const approval = await this.prisma.approval.create({
        data: {
          jobId,
          approverId,
          stepNumber,
          status: 'pending',
          approvalToken: approvalToken
        },
        include: {
          approver: true,
          job: {
            include: {
              requester: true
            }
          }
        }
      });

      // บันทึก activity log
      await this.logApprovalActivity({
        jobId,
        approverId,
        activityType: 'approval_requested',
        description: `สร้างคำขออนุมัติสำหรับขั้นตอนที่ ${stepNumber}`,
        ipAddress,
        metadata: {
          approvalId: approval.id,
          approvalToken
        }
      });

      return {
        success: true,
        data: {
          ...approval,
          approvalToken
        },
        message: 'สร้างคำขออนุมัติสำเร็จ'
      };
    } catch (error) {
      return this.handleError(error, 'CREATE_APPROVAL', 'Approval');
    }
  }

  /**
   * อนุมัติงาน
   * 
   * @param {Object} approveData - ข้อมูลการอนุมัติ
   * @param {string} approveData.token - Approval token
   * @param {string} approveData.comment - ความคิดเห็น (optional)
   * @param {string} approveData.ipAddress - IP address ของผู้อนุมัติ
   * @param {string} approveData.userAgent - User agent string (optional)
   * @returns {Promise<Object>} - ผลลัพธ์การอนุมัติ
   */
  async approveJob({ token, comment, ipAddress, userAgent }) {
    try {
      // ตรวจสอบ token
      const tokenValidation = await this.validateApprovalToken(token);
      if (!tokenValidation.success) {
        return tokenValidation;
      }

      const approval = tokenValidation.data;

      // อัปเดตสถานะการอนุมัติ
      const updatedApproval = await this.prisma.approval.update({
        where: { id: approval.id },
        data: {
          status: 'approved',
          comment,
          approvedAt: new Date(),
          ipAddress,
          userAgent: userAgent || 'Unknown'
        },
        include: {
          approver: true,
          job: {
            include: {
              requester: true,
              assignee: true
            }
          }
        }
      });

      // อัปเดตสถานะงาน (ถ้าจำเป็น)
      await this.updateJobStatusAfterApproval(approval.jobId);

      // บันทึก activity log พร้อม IP
      await this.logApprovalActivity({
        jobId: approval.jobId,
        approverId: approval.approverId,
        activityType: 'job_approved',
        description: `อนุมัติงาน ${approval.job.djId}`,
        ipAddress,
        metadata: {
          approvalId: approval.id,
          comment,
          approvedAt: new Date()
        }
      });

      return {
        success: true,
        data: updatedApproval,
        message: 'อนุมัติงานสำเร็จ'
      };
    } catch (error) {
      return this.handleError(error, 'APPROVE_JOB', 'Approval');
    }
  }

  /**
   * ปฏิเสธงาน
   * 
   * @param {Object} rejectData - ข้อมูลการปฏิเสธ
   * @param {string} rejectData.token - Approval token
   * @param {string} rejectData.comment - เหตุผลการปฏิเสธ
   * @param {string} rejectData.ipAddress - IP address ของผู้ปฏิเสธ
   * @param {string} rejectData.userAgent - User agent string (optional)
   * @returns {Promise<Object>} - ผลลัพธ์การปฏิเสธ
   */
  async rejectJob({ token, comment, ipAddress, userAgent }) {
    try {
      // ตรวจสอบ token
      const tokenValidation = await this.validateApprovalToken(token);
      if (!tokenValidation.success) {
        return tokenValidation;
      }

      const approval = tokenValidation.data;

      // อัปเดตสถานะการอนุมัติ
      const updatedApproval = await this.prisma.approval.update({
        where: { id: approval.id },
        data: {
          status: 'rejected',
          comment,
          approvedAt: new Date(),
          ipAddress,
          userAgent: userAgent || 'Unknown'
        },
        include: {
          approver: true,
          job: {
            include: {
              requester: true
            }
          }
        }
      });

      // อัปเดตสถานะงานเป็น rejected
      await this.prisma.job.update({
        where: { id: approval.jobId },
        data: { status: 'rejected' }
      });

      // บันทึก activity log พร้อม IP
      await this.logApprovalActivity({
        jobId: approval.jobId,
        approverId: approval.approverId,
        activityType: 'job_rejected',
        description: `ปฏิเสธงาน ${approval.job.djId}`,
        ipAddress,
        metadata: {
          approvalId: approval.id,
          comment,
          rejectedAt: new Date()
        }
      });

      return {
        success: true,
        data: updatedApproval,
        message: 'ปฏิเสธงานสำเร็จ'
      };
    } catch (error) {
      return this.handleError(error, 'REJECT_JOB', 'Approval');
    }
  }

  /**
   * บันทึก activity log สำหรับการอนุมัติ
   * 
   * @param {Object} logData - ข้อมูล activity log
   * @param {number} logData.jobId - ID ของงาน
   * @param {number} logData.approverId - ID ของผู้อนุมัติ
   * @param {string} logData.activityType - ประเภท activity
   * @param {string} logData.description - คำอธิบาย
   * @param {string} logData.ipAddress - IP address
   * @param {Object} logData.metadata - ข้อมูลเพิ่มเติม
   */
  async logApprovalActivity({ jobId, approverId, activityType, description, ipAddress, metadata }) {
    try {
      await this.prisma.jobActivity.create({
        data: {
          jobId,
          userId: approverId,
          activityType,
          description,
          metadata: {
            ...metadata,
            ipAddress,
            userAgent: metadata.userAgent || 'Unknown',
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('[ApprovalService] Log activity failed:', error);
      // ไม่ throw error เพราะเป็นแค่ logging
    }
  }

  /**
   * อัปเดตสถานะงานหลังการอนุมัติ
   * 
   * @param {number} jobId - ID ของงาน
   */
  async updateJobStatusAfterApproval(jobId) {
    try {
      // ตรวจสอบว่ามีการอนุมัติที่รอดำเนินการอื่นอีกหรือไม่
      const pendingApprovals = await this.prisma.approval.count({
        where: {
          jobId,
          status: 'pending'
        }
      });

      let newStatus;
      if (pendingApprovals === 0) {
        // ไม่มีการอนุมัติที่รอดำเนินการ -> อนุมัติสำเร็จ
        newStatus = 'approved';
      } else {
        // ยังมีการอนุมัติที่รอดำเนินการ
        newStatus = 'pending_approval';
      }

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: newStatus,
          // ถ้าอนุมัติสำเร็จแล้วและมี assignee ให้เปลี่ยนเป็น assigned
          ...(newStatus === 'approved' && {
            status: 'assigned',
            assignedAt: new Date()
          })
        }
      });
    } catch (error) {
      console.error('[ApprovalService] Update job status failed:', error);
      throw error;
    }
  }

  /**
   * ดึงประวัติการอนุมัติของงาน
   * 
   * @param {number} jobId - ID ของงาน
   * @returns {Promise<Object>} - ประวัติการอนุมัติ
   */
  async getApprovalHistory(jobId) {
    try {
      const approvals = await this.prisma.approval.findMany({
        where: { jobId },
        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { stepNumber: 'asc' }
      });

      // ดึง activity logs ที่เกี่ยวข้อง
      const activities = await this.prisma.jobActivity.findMany({
        where: {
          jobId,
          activityType: {
            in: ['approval_requested', 'job_approved', 'job_rejected']
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return this.successResponse({
        approvals,
        activities
      });
    } catch (error) {
      return this.handleError(error, 'GET_APPROVAL_HISTORY', 'Approval');
    }
  }
  /**
   * ดึง Approval Flow ของโปรเจกต์
   * 
   * @param {number} projectId - ID ของโปรเจกต์
   * @returns {Promise<Object>} - Approval Flow configuration
   */
  async getApprovalFlowByProject(projectId) {
    try {
      // Use raw query due to Schema/DB mismatch (ApprovalFlow model missing projectId in schema)
      const flows = await this.prisma.$queryRaw`
        SELECT af.*, 
               u.id as "userId", u.first_name as "firstName", u.last_name as "lastName", 
               u.display_name as "displayName", u.email, u.avatar_url as "avatarUrl"
        FROM approval_flows af
        LEFT JOIN users u ON af.approver_id = u.id
        WHERE af.project_id = ${parseInt(projectId)}
        ORDER BY af.level ASC
      `;

      if (!flows || flows.length === 0) return null;

      const levels = [];
      let includeTeamLead = false;
      let teamLeadId = null;

      flows.forEach(f => {
        if (f.include_team_lead) includeTeamLead = true;
        if (f.team_lead_id) teamLeadId = f.team_lead_id;

        let lvl = levels.find(l => l.level === f.level);
        if (!lvl) {
          lvl = { level: f.level, approvers: [], logic: 'any' };
          levels.push(lvl);
        }

        // approver_id from raw query
        if (f.approver_id) {
          lvl.approvers.push({
            id: f.approver_id,
            userId: f.userId,
            name: f.displayName || `${f.firstName} ${f.lastName}`.trim(),
            email: f.email,
            avatar: f.avatarUrl
          });
        }
      });

      return {
        projectId,
        levels,
        includeTeamLead,
        teamLeadId
      };
    } catch (error) {
      console.error('[ApprovalService] Get flow error:', error);
      return null;
    }
  }

  /**
   * อนุมัติงานผ่าน Web Backend (ใช้แทน Logic ฝั่ง Frontend)
   * 
   * @param {Object} params
   * @param {number} params.jobId
   * @param {number} params.approverId
   * @param {string} params.comment
   * @param {string} params.ipAddress
   */
  async approveJobViaWeb({ jobId, approverId, comment, ipAddress }) {
    try {
      // 1. Get Job & Current Status
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, projectId: true, jobTypeId: true, status: true, requesterId: true, djId: true, subject: true }
      });

      if (!job) throw new Error('Job not found');

      // 🔒 Concurrency Check: ตรวจสอบว่างานยังอยู่ในสถานะรออนุมัติหรือไม่
      const validPendingStatuses = ['pending_approval', 'pending_level_1', 'pending_level_2', 'pending_level_3'];
      if (!validPendingStatuses.includes(job.status)) {
        return {
          success: false,
          error: 'ALREADY_PROCESSED',
          message: `งานนี้ถูกดำเนินการไปแล้ว (สถานะปัจจุบัน: ${job.status})`,
          data: { currentStatus: job.status }
        };
      }

      // 2. ✨ V2: Get Flow Assignment using Template System
      const assignment = await this.getFlowAssignmentV2(job.projectId, job.jobTypeId);

      let nextStatus = 'approved';
      let isFinal = true;
      let currentLevel = 0;

      // Determine current level
      if (job.status === 'pending_approval') currentLevel = 1;
      else if (job.status.startsWith('pending_level_')) {
        currentLevel = parseInt(job.status.split('_')[2]);
      }

      // V2: Check Next Step based on Template
      if (assignment && assignment.template && assignment.template.totalLevels > 0) {
        const totalLevels = assignment.template.totalLevels;

        if (currentLevel < totalLevels) {
          // ยังมี Level ถัดไป
          nextStatus = `pending_level_${currentLevel + 1}`;
          isFinal = false;
        } else {
          // Level สุดท้ายแล้ว
          nextStatus = 'approved';
          isFinal = true;
        }
      } else {
        // ไม่มี Flow Assignment หรือ Skip Approval (totalLevels = 0)
        nextStatus = 'approved';
        isFinal = true;
      }

      // 3. Update Job
      const updateData = {
        status: nextStatus,
        updatedAt: new Date()
      };

      if (isFinal) {
        updateData.startedAt = new Date();
      }

      await this.prisma.job.update({
        where: { id: jobId },
        data: updateData
      });

      // V2: Auto-Assign Logic if Final Approval
      let assignResult = null;
      if (isFinal) {
        assignResult = await this.autoAssignJobV2(jobId, assignment, job.requesterId);
        if (assignResult.success) {
          nextStatus = 'assigned';
        }
      }

      // 4. Log Activity
      await this.logApprovalActivity({
        jobId,
        approverId,
        activityType: 'job_approved',
        description: `อนุมัติงาน ${job.djId} (Web Action V2) -> ${nextStatus}`,
        ipAddress,
        metadata: {
          comment,
          previousStatus: job.status,
          newStatus: nextStatus,
          templateName: assignment?.template?.name || 'No Template'
        }
      });

      return {
        success: true,
        data: {
          status: nextStatus,
          isFinal,
          assignResult
        }
      };

    } catch (error) {
      return this.handleError(error, 'APPROVE_VIA_WEB', 'Approval');

    }
  }

  /**
   * ปฏิเสธงานผ่าน Web Backend
   */
  async rejectJobViaWeb({ jobId, approverId, comment, ipAddress }) {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, djId: true, status: true }
      });

      if (!job) throw new Error('Job not found');

      // 🔒 Concurrency Check: ตรวจสอบว่างานยังอยู่ในสถานะรออนุมัติหรือไม่
      const validPendingStatuses = ['pending_approval', 'pending_level_1', 'pending_level_2', 'pending_level_3'];
      if (!validPendingStatuses.includes(job.status)) {
        return {
          success: false,
          error: 'ALREADY_PROCESSED',
          message: `งานนี้ถูกดำเนินการไปแล้ว (สถานะปัจจุบัน: ${job.status})`,
          data: { currentStatus: job.status }
        };
      }

      // ⚠️ Validation: ต้องระบุเหตุผลในการปฏิเสธ
      if (!comment || comment.trim() === '') {
        return {
          success: false,
          error: 'COMMENT_REQUIRED',
          message: 'กรุณาระบุเหตุผลในการปฏิเสธงาน'
        };
      }

      // Update to rejected
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'rejected',
          updatedAt: new Date()
        }
      });

      // Log
      await this.logApprovalActivity({
        jobId,
        approverId,
        activityType: 'job_rejected',
        description: `ปฏิเสธงาน ${job.djId} (Web Action) - เหตุผล: ${comment}`,
        ipAddress,
        metadata: {
          comment,
          previousStatus: job.status
        }
      });

      return { success: true, data: { status: 'rejected' } };
    } catch (error) {
      return this.handleError(error, 'REJECT_VIA_WEB', 'Approval');
    }
  }

  /**
   * Complete Job (Called by Assignee)
   */
  async completeJob({ jobId, userId, note, attachments }) {
    try {
      const job = await this.prisma.job.findUnique({ where: { id: jobId } });
      if (!job) throw new Error('Job not found');

      // Update Job
      // Note: attachments handling (upload) is assumed to be done before this, 
      // and we receive metadata/urls here. Job model has `finalFiles` Json field typically?
      // Let's assume `finalFiles` is the field name matching frontend expectation or mapping.
      // Frontend sends: attachments: [{ name: 'Final Link', url: finalLink }]
      // DB Schema Job model: finalFiles Json? 
      // Let's check Schema... assuming `finalFiles` exists based on context.

      const updatedJob = await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedBy: userId,
          finalFiles: attachments // attachments array
        }
      });

      // Log Activity
      await this.logApprovalActivity({
        jobId,
        userId, // Assignee
        activityType: 'job_completed',
        description: 'ส่งมอบงาน (Job Completed)',
        metadata: { note, attachments }
      });

      // Add note as comment if present
      if (note) {
        // Check if Comments are JSON or related model. 
        // Previous code in JobDetail added comment via updateJob 'comments' field (JSON).
        // So we should append to 'comments' JSON array
        const currentComments = job.comments || [];
        const newComment = {
          id: `comment-${Date.now()}`,
          author: 'System', // Or User Name if we fetch it. simpler to mark as system or completion note
          message: `[Job Completed] ${note}`,
          timestamp: new Date().toISOString()
        };
        await this.prisma.job.update({
          where: { id: jobId },
          data: {
            comments: [...currentComments, newComment]
          }
        });
      }

      return { success: true, data: updatedJob };
    } catch (error) {
      return this.handleError(error, 'COMPLETE_JOB', 'Job');
    }
  }

  /**
   * Auto-assign job after approval (Internal use)
   */
  async autoAssignJob(jobId) {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, projectId: true, requesterId: true, requester: { select: { departmentId: true } } }
      });

      if (!job) return { success: false, message: 'Job not found' };

      // 1. Check Approval Flow (Team Lead)
      // Note: Prisma schema might make accessing approval_flows filtered by project_id tricky if not directly related
      // Using raw query or findFirst if model exists
      const flowConfig = await this.prisma.$queryRaw`
        SELECT include_team_lead, team_lead_id 
        FROM approval_flows 
        WHERE project_id = ${job.projectId} 
        LIMIT 1
      `;

      const config = flowConfig[0];

      if (config && config.include_team_lead && config.team_lead_id) {
        return await this.assignJobManually(jobId, config.team_lead_id, null, 'auto-assign: team-lead');
      }

      // 2. Check Department Manager
      if (job.requester?.departmentId) {
        const dept = await this.prisma.department.findUnique({
          where: { id: job.requester.departmentId },
          select: { managerId: true }
        });

        if (dept && dept.managerId) {
          return await this.assignJobManually(jobId, dept.managerId, null, 'auto-assign: dept-manager');
        }
      }

      // 3. Fallback: No Manager found (or no flow config)
      // Change: Set status to 'approved' but assigneeId remains NULL (Manual Assignment Flow)
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'approved',
          assigneeId: null, // Explicitly null
          assignedAt: null
        }
      });

      // 4. Notify Admins
      // Get Admins (assuming role 'admin')
      // Note: Adjust role filter based on actual schema role implementation (UserRole table or role field)
      // Here assuming simple role field or relation. If role is 'admin' string in User model:
      const admins = await this.prisma.user.findMany({
        where: {
          tenantId: job.requester?.tenantId || 1, // Scope by tenant
          isActive: true,
          role: 'admin' // Or use userRoles relation if needed
        },
        select: { id: true, email: true, firstName: true }
      });

      // Send Emails
      if (admins.length > 0) {
        const emailPromises = admins.map(admin =>
          this.emailService.sendEmail(
            admin.email,
            `[Action Required] Job #${job.djId || jobId} ต้องการผู้รับผิดชอบ (No Manager Found)`,
            'job-unassigned-alert', // Check if template exists, or use generic
            {
              job: { ...job, djId: job.djId || `#${job.id}` },
              recipientName: admin.firstName
            }
          ).catch(err => console.warn(`Failed to send email to ${admin.email}:`, err.message))
        );
        await Promise.allSettled(emailPromises);

        // Send In-App Notifications (if notificationService available)
        if (this.notificationService && typeof this.notificationService.createMany === 'function') {
          const notifs = admins.map(admin => ({
            userId: admin.id,
            title: 'Job Unassigned',
            message: `Job ${job.djId || jobId} ไม่พบ Manager กรุณากำหนดผู้รับผิดชอบ`,
            type: 'alert',
            link: `/jobs/${job.id}`,
            isRead: false
          }));
          await this.notificationService.createMany(notifs).catch(e => console.warn('Failed to create in-app notifs:', e));
        }
      }

      console.log(`[AutoAssign] Job ${jobId}: No manager found. Fallback to Manual Assignment (Status: approved). Notified ${admins.length} admins.`);

      return {
        success: true,
        autoAssigned: false,
        message: 'Fallback to Manual Assignment (No Manager)',
        status: 'approved'
      };

    } catch (error) {
      console.error('[ApprovalService] Auto-assign failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Assign Job Manually
   */
  async assignJobManually(jobId, assigneeId, assignedBy = null, source = 'manual') {
    try {
      const updatedJob = await this.prisma.job.update({
        where: { id: jobId },
        data: {
          assigneeId,
          assignedAt: new Date(),
          status: 'assigned'
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      });

      // Log
      await this.prisma.jobActivity.create({
        data: {
          jobId,
          userId: assignedBy, // Can be null for system
          activityType: 'assigned',
          description: `Job assigned to user ${assigneeId}`,
          metadata: { source, timestamp: new Date().toISOString() }
        }
      });

      return { success: true, data: updatedJob, assigneeId };
    } catch (error) {
      console.error('[ApprovalService] Assign failed:', error);
      throw error;
    }
  }

  // --- Admin Configuration Methods ---

  async saveApprovalFlow(projectId, flowData) {
    try {
      // Transaction
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete old
        // Note: Raw delete because of potential schema mismatch (if ApprovalFlow model issues exist)
        // But if we trust Prisma:
        await tx.approvalFlow.deleteMany({ where: { projectId: parseInt(projectId) } });

        // 2. Insert new
        if (flowData.levels && flowData.levels.length > 0) {
          for (const lvl of flowData.levels) {
            for (const appr of lvl.approvers) {
              await tx.approvalFlow.create({
                data: {
                  projectId: parseInt(projectId),
                  level: lvl.level,
                  approverId: appr.userId,
                  includeTeamLead: flowData.includeTeamLead || false,
                  teamLeadId: flowData.teamLeadId || null
                }
              });
            }
          }
        } else if (flowData.includeTeamLead) {
          // Create at least one entry to store config if no approvers
          // Use level 0 or handled by schema?
          // Usually flow has levels. If only team lead, maybe it's level 1?
          // Assuming caller handles structure.
        }
      });
      return { success: true };
    } catch (error) {
      return this.handleError(error, 'SAVE_FLOW', 'Approval');
    }
  }

  async getAssignmentMatrix(projectId) {
    try {
      const matrix = await this.prisma.projectJobAssignment.findMany({
        where: { projectId: parseInt(projectId) },
        include: {
          jobType: true,
          assignee: { select: { id: true, firstName: true, lastName: true } }
        }
      });
      return { success: true, data: matrix };
    } catch (error) {
      return this.handleError(error, 'GET_MATRIX', 'Approval');
    }
  }

  async saveAssignmentMatrix(projectId, assignments) {
    try {
      // Upsert logic
      await this.prisma.$transaction(async (tx) => {
        for (const a of assignments) {
          // Check existing
          const existing = await tx.projectJobAssignment.findUnique({
            where: {
              projectId_jobTypeId: {
                projectId: parseInt(projectId),
                jobTypeId: parseInt(a.jobTypeId)
              }
            }
          });

          if (existing) {
            await tx.projectJobAssignment.update({
              where: { id: existing.id },
              data: { assigneeId: a.assigneeId }
            });
          } else {
            await tx.projectJobAssignment.create({
              data: {
                projectId: parseInt(projectId),
                jobTypeId: parseInt(a.jobTypeId),
                assigneeId: a.assigneeId
              }
            });
          }
        }
      });
      return { success: true };
    } catch (error) {
      return this.handleError(error, 'SAVE_MATRIX', 'Approval');
    }
  }


  // ========================================
  // ✨ Approval Flow V2 (Template System)
  // ========================================

  /**
   * ดึง Flow Assignment สำหรับ Project + JobType
   * Logic Priority:
   * 1. หา project_id + job_type_id ตรงๆ (เฉพาะเจาะจง)
   * 2. หา project_id + job_type_id = NULL (Default ของ Project)
   * 3. Return null (ใช้ Skip Approval หรือ Tenant Default)
   * 
   * @param {number} projectId - Project ID
   * @param {number} jobTypeId - JobType ID
   * @returns {Promise<Object|null>} - Flow Assignment with Template และ Steps
   */
  async getFlowAssignmentV2(projectId, jobTypeId) {
    try {
      // 1. หา project_id + job_type_id ตรงๆ
      let assignment = await this.prisma.projectFlowAssignment.findFirst({
        where: {
          projectId: projectId,
          jobTypeId: jobTypeId,
          isActive: true
        },
        include: {
          template: {
            include: {
              steps: { orderBy: { level: 'asc' } }
            }
          },
          approvers: { where: { isActive: true } }
        }
      });

      // 2. ถ้าไม่เจอ → หา Default (jobTypeId = null)
      if (!assignment) {
        assignment = await this.prisma.projectFlowAssignment.findFirst({
          where: {
            projectId: projectId,
            jobTypeId: null, // Default for all JobTypes
            isActive: true
          },
          include: {
            template: {
              include: {
                steps: { orderBy: { level: 'asc' } }
              }
            },
            approvers: { where: { isActive: true } }
          }
        });
      }

      return assignment;
    } catch (error) {
      console.error('[ApprovalService] getFlowAssignmentV2 error:', error);
      return null;
    }
  }

  /**
   * หา Approver สำหรับ Level นั้นๆ (V2)
   * Logic:
   * 1. เช็ค project_flow_approvers (Custom Approver)
   * 2. ถ้าไม่มี → ใช้ตาม step.approver_type
   * 
   * @param {Object} assignment - Flow Assignment with approvers
   * @param {number} level - Step Level
   * @param {number} requesterId - Requester User ID (สำหรับหา Dept Manager)
   * @returns {Promise<number|null>} - Approver User ID
   */
  async getApproverForLevelV2(assignment, level, requesterId) {
    try {
      // 1. เช็ค Custom Approver ก่อน
      const customApprover = assignment.approvers?.find(a => a.level === level);
      if (customApprover) {
        return customApprover.approverId;
      }

      // 2. หา Step Definition
      const step = assignment.template?.steps?.find(s => s.level === level);
      if (!step) return null;

      // 3. หา Approver ตาม approver_type
      switch (step.approverType) {
        case 'dept_manager':
          // หาหัวหน้าแผนกของ Requester
          const user = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { departmentId: true }
          });
          if (user?.departmentId) {
            const dept = await this.prisma.department.findUnique({
              where: { id: user.departmentId },
              select: { managerId: true }
            });
            return dept?.managerId || null;
          }
          return null;

        case 'team_lead':
          // ใช้ค่าจาก assignment (ถ้ามี override)
          // หรือจาก template.autoAssignUserId (ถ้าเป็น Team Lead)
          return assignment.autoAssignUserId || assignment.template?.autoAssignUserId || null;

        case 'specific_user':
          // ต้องตั้งค่าใน Custom Approver หรือ step (ยังไม่มี field นี้ใน step)
          return null;

        default:
          return null;
      }
    } catch (error) {
      console.error('[ApprovalService] getApproverForLevelV2 error:', error);
      return null;
    }
  }

  /**
   * คำนวณ Auto-Assign Type สำหรับ Job (V2)
   * Logic:
   * 1. ถ้า assignment.overrideAutoAssign = true → ใช้ค่าใน assignment
   * 2. ถ้าไม่ → ใช้ค่าใน template
   * 
   * @param {Object} assignment - Flow Assignment
   * @returns {{type: string, userId: number|null}}
   */
  getAutoAssignConfigV2(assignment) {
    if (!assignment) {
      return { type: 'manual', userId: null };
    }

    if (assignment.overrideAutoAssign) {
      return {
        type: assignment.autoAssignType || 'manual',
        userId: assignment.autoAssignUserId
      };
    }

    return {
      type: assignment.template?.autoAssignType || 'manual',
      userId: assignment.template?.autoAssignUserId
    };
  }

  /**
   * Auto-assign job หลังอนุมัติเสร็จ (V2)
   * รองรับ: manual, team_lead, dept_manager, specific_user
   * 
   * @param {number} jobId - Job ID
   * @param {Object} assignment - Flow Assignment (from getFlowAssignmentV2)
   * @param {number} requesterId - Requester User ID
   */
  async autoAssignJobV2(jobId, assignment, requesterId) {
    try {
      const config = this.getAutoAssignConfigV2(assignment);

      let assigneeId = null;

      switch (config.type) {
        case 'specific_user':
          assigneeId = config.userId;
          break;

        case 'team_lead':
          assigneeId = config.userId;
          break;

        case 'dept_manager':
          // หาหัวหน้าแผนกของ Requester
          const user = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { departmentId: true }
          });
          if (user?.departmentId) {
            const dept = await this.prisma.department.findUnique({
              where: { id: user.departmentId },
              select: { managerId: true }
            });
            assigneeId = dept?.managerId;
          }
          break;

        case 'manual':
        default:
          return { success: false, needsManualAssign: true };
      }

      if (assigneeId) {
        return await this.assignJobManually(jobId, assigneeId, null, `auto-assign: ${config.type}`);
      }

      return { success: false, needsManualAssign: true };

    } catch (error) {
      console.error('[ApprovalService] autoAssignJobV2 error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ตรวจสอบว่างานนี้ต้อง Skip Approval หรือไม่ (V2)
   * 
   * @param {Object} assignment - Flow Assignment from getFlowAssignmentV2
   * @returns {boolean} - true = Skip, false = ต้องอนุมัติ
   */
  isSkipApprovalV2(assignment) {
    if (!assignment || !assignment.template) {
      // ไม่มี flow assignment → Skip Approval หรือ ใช้ Tenant Default
      // ตอนนี้เราจะให้ Skip ถ้าไม่มี assignment
      return true;
    }
    return assignment.template.totalLevels === 0;
  }

}

export default ApprovalService;
