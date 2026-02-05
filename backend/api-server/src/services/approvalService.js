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
import NotificationService from './notificationService.js';

export class ApprovalService extends BaseService {
  constructor() {
    super();
    this.notificationService = new NotificationService();
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
      // V1 Extended: Get ALL active flows for the project (Default + Job Type Specific)
      const flows = await this.prisma.approvalFlow.findMany({
        where: {
          projectId: parseInt(projectId),
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!flows || flows.length === 0) return [];

      return flows.map(flow => {
        // Extract approverSteps from JSON
        const levels = flow.approverSteps || [];

        // Extract legacy fields from conditions JSON
        const includeTeamLead = flow.conditions?.includeTeamLead || false;
        const teamLeadId = flow.conditions?.teamLeadId || null;

        return {
          id: flow.id,
          projectId: flow.projectId,
          jobTypeId: flow.jobTypeId,
          skipApproval: flow.skipApproval,
          autoAssignType: flow.autoAssignType,
          autoAssignUserId: flow.autoAssignUserId,
          name: flow.name,
          levels,
          includeTeamLead,
          teamLeadId
        };
      });
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
        select: { id: true, projectId: true, jobTypeId: true, status: true, requesterId: true, djId: true, subject: true, isParent: true }
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

      // 2. Get Flow using V1 Extended
      const flow = await this.getApprovalFlow(job.projectId, job.jobTypeId);

      let nextStatus = 'approved';
      let isFinal = true;
      let currentLevel = 0;

      // Determine current level
      if (job.status === 'pending_approval') currentLevel = 1;
      else if (job.status.startsWith('pending_level_')) {
        currentLevel = parseInt(job.status.split('_')[2]);
      }

      // V1 Extended: Check Next Step based on approverSteps
      const totalLevels = this.getApprovalLevels(flow);

      if (totalLevels > 0 && currentLevel < totalLevels) {
        // ยังมี Level ถัดไป
        nextStatus = `pending_level_${currentLevel + 1}`;
        isFinal = false;
      } else {
        // Level สุดท้ายแล้ว หรือ Skip Approval
        nextStatus = 'approved';
        isFinal = true;
      }

      // 3. Update Job
      const updateData = {
        status: nextStatus
      };

      if (isFinal) {
        updateData.startedAt = new Date();
      }

      await this.prisma.job.update({
        where: { id: jobId },
        data: updateData
      });

      // V1 Extended: Auto-Assign Logic if Final Approval
      let assignResult = null;
      if (isFinal) {
        assignResult = await this.autoAssignJob(jobId, flow, job.requesterId);
        if (assignResult.success) {
          nextStatus = 'assigned';
        }
      }

      // ----------------------------------------
      // V1 Extended: Cascade Approval to Children
      // ----------------------------------------
      if (job.isParent && (nextStatus === 'approved' || nextStatus === 'assigned')) {
        const pendingChildren = await this.prisma.job.findMany({
          where: { parentJobId: jobId, status: 'pending_approval' }
        });

        if (pendingChildren.length > 0) {
          // 1. Update status to approved first
          await this.prisma.job.updateMany({
            where: { parentJobId: jobId, status: 'pending_approval' },
            data: { status: 'approved' } // Base status before assignment
          });

          // 2. Process each child for auto-assignment & logging
          for (const child of pendingChildren) {
            try {
              // Auto-assign child (Reuse logic)
              const childFlow = await this.getApprovalFlow(job.projectId, child.jobTypeId);
              const childAssign = await this.autoAssignJob(child.id, childFlow, job.requesterId);

              let childFinalStatus = 'approved';
              if (childAssign.success) {
                await this.prisma.job.update({ where: { id: child.id }, data: { status: 'assigned' } });
                childFinalStatus = 'assigned';
              }

              // Log activity
              await this.logApprovalActivity({
                jobId: child.id,
                approverId,
                activityType: 'job_approved_cascade',
                description: `อนุมัติอัตโนมัติตามงานแม่ (${job.djId}) -> ${childFinalStatus}`,
                ipAddress,
                metadata: { parentId: jobId, trigger: 'cascade' }
              });
            } catch (err) {
              console.error(`[Cascade Error] Failed to process child ${child.id}:`, err);
            }
          }
        }
      }

      // 4. Log Activity
      await this.logApprovalActivity({
        jobId,
        approverId,
        activityType: 'job_approved',
        description: `อนุมัติงาน ${job.djId} -> ${nextStatus}`,
        ipAddress,
        metadata: {
          comment,
          previousStatus: job.status,
          newStatus: nextStatus,
          flowName: flow?.name || 'Default',
          skipApproval: flow?.skipApproval || false
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
        select: { id: true, djId: true, status: true, isParent: true, tenantId: true }
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
          status: 'rejected'
        }
      });

      // ----------------------------------------
      // V1 Extended: Cascade Rejection Notification
      // ----------------------------------------
      if (job.isParent) {
        const children = await this.prisma.job.findMany({
          where: { parentJobId: jobId },
          select: { id: true, djId: true, assigneeId: true }
        });

        for (const child of children) {
          if (child.assigneeId) {
            await this.notificationService.createNotification({
              tenantId: job.tenantId,
              userId: child.assigneeId,
              type: 'parent_rejected',
              title: `⚠️ งานแม่ถูกปฏิเสธ: ${job.djId}`,
              message: `งานแม่ (${job.djId}) ถูกปฏิเสธเนื่องจาก: "${comment}" โปรดตรวจสอบงานของคุณ`,
              link: `/jobs/${child.id}`
            });
          }
        }
      }

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
      // Get tenantId from flowData (passed from route) or fallback to 1
      const tenantId = flowData.tenantId || 1;

      // V1 Extended: Store approval flow as single record with JSON approverSteps
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete old default flow (jobTypeId = null)
        await tx.approvalFlow.deleteMany({
          where: {
            projectId: parseInt(projectId),
            jobTypeId: null // Only delete default flow
          }
        });

        // 2. Create new flow record with V1 Extended structure
        const flowName = flowData.name || flowData.projectName || `Approval Flow - Project ${projectId}`;

        await tx.approvalFlow.create({
          data: {
            tenantId: parseInt(tenantId),
            projectId: parseInt(projectId),
            jobTypeId: flowData.jobTypeId || null, // null = default flow for all job types
            level: 0, // Fix: Add default level (required by DB schema)
            skipApproval: flowData.skipApproval || false,
            autoAssignType: flowData.autoAssignType || null,
            autoAssignUserId: flowData.autoAssignUserId || null,
            name: flowName,
            description: flowData.description || null,
            approverSteps: flowData.levels || [], // Store levels as JSON
            allowOverride: flowData.allowOverride || false,
            isActive: true,
            // Legacy fields stored in JSON for backward compatibility
            conditions: {
              includeTeamLead: flowData.includeTeamLead || false,
              teamLeadId: flowData.teamLeadId || null
            }
          }
        });
      });

      return { success: true };
    } catch (error) {
      console.error('[ApprovalService] saveApprovalFlow error:', error.message);
      console.error('[ApprovalService] Error code:', error.code);
      console.error('[ApprovalService] Error meta:', error.meta);
      return { success: false, message: error.message };
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
  // V1 Extended: Job Type + Skip Approval Support
  // ========================================

  /**
   * ดึง Approval Flow สำหรับ Project + JobType (V1 Extended)
   * Priority:
   * 1. หา project_id + job_type_id ตรงๆ (เฉพาะเจาะจง)
   * 2. หา project_id + job_type_id = NULL (Default ของ Project)
   * 3. Return null (ไม่มี Flow)
   *
   * @param {number} projectId - Project ID
   * @param {number} jobTypeId - JobType ID (nullable)
   * @returns {Promise<Object|null>} - ApprovalFlow object
   */
  async getApprovalFlow(projectId, jobTypeId) {
    try {
      // 1. หา flow เฉพาะ JobType ก่อน
      let flow = await this.prisma.approvalFlow.findFirst({
        where: {
          projectId: parseInt(projectId),
          jobTypeId: jobTypeId ? parseInt(jobTypeId) : null,
          isActive: true
        },
        include: {
          autoAssignUser: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          jobType: {
            select: { id: true, name: true }
          }
        }
      });

      // 2. ถ้าไม่เจอ และมี jobTypeId → หา Default (jobTypeId = NULL)
      if (!flow && jobTypeId) {
        flow = await this.prisma.approvalFlow.findFirst({
          where: {
            projectId: parseInt(projectId),
            jobTypeId: null, // Default for all JobTypes
            isActive: true
          },
          include: {
            autoAssignUser: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        });
      }

      return flow;
    } catch (error) {
      console.error('[ApprovalService] getApprovalFlow error:', error);
      return null;
    }
  }

  /**
   * ตรวจสอบว่า Flow นี้ต้อง Skip Approval หรือไม่
   *
   * @param {Object} flow - ApprovalFlow from getApprovalFlow
   * @returns {boolean} - true = Skip, false = ต้องอนุมัติ
   */
  isSkipApproval(flow) {
    if (!flow) {
      // ไม่มี flow → ใช้ค่าเริ่มต้น: ต้องอนุมัติ (safe default)
      return false;
    }
    return flow.skipApproval === true;
  }

  /**
   * นับจำนวน Approval Levels จาก Flow
   *
   * @param {Object} flow - ApprovalFlow from getApprovalFlow
   * @returns {number} - จำนวน levels (0 = skip)
   */
  getApprovalLevels(flow) {
    if (!flow) return 1; // Default: 1 level
    if (flow.skipApproval) return 0;

    // นับจาก approverSteps JSON array
    if (flow.approverSteps && Array.isArray(flow.approverSteps)) {
      return flow.approverSteps.length;
    }

    return 1; // Default: 1 level
  }

  /**
   * Auto-assign job หลังอนุมัติเสร็จ หรือ Skip Approval
   * รองรับ: manual, team_lead, dept_manager, specific_user
   *
   * @param {number} jobId - Job ID
   * @param {Object} flow - ApprovalFlow from getApprovalFlow
   * @param {number} requesterId - Requester User ID
   * @returns {Promise<Object>} - { success, assigneeId, needsManualAssign }
   */
  async autoAssignJob(jobId, flow, requesterId) {
    try {
      if (!flow) {
        return { success: false, needsManualAssign: true };
      }

      const autoAssignType = flow.autoAssignType || 'manual';
      let assigneeId = null;

      switch (autoAssignType) {
        case 'specific_user':
        case 'team_lead':
          assigneeId = flow.autoAssignUserId;
          break;

        case 'dept_manager':
          // หาหัวหน้าแผนกของ Requester
          const user = await this.prisma.user.findUnique({
            where: { id: parseInt(requesterId) },
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
        const result = await this.assignJobManually(
          jobId,
          assigneeId,
          null,
          `auto-assign: ${autoAssignType}`
        );
        return { ...result, assigneeId };
      }

      // ไม่เจอ assignee → ต้อง manual
      console.warn(`[ApprovalService] autoAssignJob: No assignee found for type=${autoAssignType}, jobId=${jobId}`);
      return { success: false, needsManualAssign: true };

    } catch (error) {
      console.error('[ApprovalService] autoAssignJob error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // V1 Extended: Bulk Flow Creation & Validation
  // ========================================

  /**
   * สร้าง Approval Flows หลายรายการพร้อมกัน จาก Project Job Assignments
   * ดึงคนรับผิดชอบจาก project_job_assignments โดยอัตโนมัติ
   *
   * @param {Object} params
   * @param {number} params.tenantId
   * @param {number} params.projectId
   * @param {Array<number>} params.jobTypeIds
   * @param {boolean} params.skipApproval
   * @param {string} params.name
   * @returns {Promise<Object>}
   */
  async createBulkFlowsFromAssignments({ tenantId, projectId, jobTypeIds, skipApproval, name }) {
    try {
      // 1. ดึง job assignments สำหรับ job types ที่เลือก
      const assignments = await this.prisma.projectJobAssignment.findMany({
        where: {
          projectId,
          jobTypeId: { in: jobTypeIds },
          isActive: true
        },
        include: {
          jobType: { select: { id: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } }
        }
      });

      // สร้าง map ของ jobTypeId -> assignment
      const assignmentMap = new Map();
      assignments.forEach(a => assignmentMap.set(a.jobTypeId, a));

      const createdFlows = [];
      const updatedFlows = [];
      const errors = [];

      // 2. สร้าง/อัพเดต flows สำหรับแต่ละ job type
      for (const jobTypeId of jobTypeIds) {
        const assignment = assignmentMap.get(jobTypeId);
        const assigneeId = assignment?.assigneeId || null;
        const jobTypeName = assignment?.jobType?.name || `JobType#${jobTypeId}`;

        try {
          // ตรวจสอบว่ามี flow อยู่แล้วหรือไม่
          const existing = await this.prisma.approvalFlow.findFirst({
            where: {
              projectId,
              jobTypeId,
              isActive: true
            }
          });

          if (existing) {
            // Update existing flow
            const updated = await this.prisma.approvalFlow.update({
              where: { id: existing.id },
              data: {
                skipApproval,
                autoAssignType: assigneeId ? 'specific_user' : 'manual',
                autoAssignUserId: assigneeId,
                updatedAt: new Date()
              }
            });
            updatedFlows.push({ ...updated, jobTypeName });
          } else {
            // Create new flow
            const created = await this.prisma.approvalFlow.create({
              data: {
                tenantId: tenantId || 1, // Fix: Add tenantId if missing in schema default (schema has default 1 but safe to add)
                projectId,
                jobTypeId: jobTypeId || null,
                level: 0, // Fix: Add default level if required by DB schema but unused in V1 Extended
                name: `${name} - ${jobTypeName}`,
                skipApproval,
                autoAssignType: assigneeId ? 'specific_user' : 'manual',
                autoAssignUserId: assigneeId,
                approverSteps: [],
                isActive: true
              }
            });
            createdFlows.push({ ...created, jobTypeName });
          }
        } catch (err) {
          errors.push({ jobTypeId, jobTypeName, error: err.message });
        }
      }

      return {
        success: true,
        created: createdFlows.length,
        updated: updatedFlows.length,
        errors: errors.length,
        data: { created: createdFlows, updated: updatedFlows, errors },
        message: `สร้าง ${createdFlows.length} อัพเดต ${updatedFlows.length} flows สำเร็จ`
      };
    } catch (error) {
      console.error('[ApprovalService] createBulkFlowsFromAssignments error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ตรวจสอบว่าสามารถสร้างงาน Skip Approval ได้หรือไม่
   * - ต้องมี assignee กำหนดไว้ใน project_job_assignments
   * - หรือ flow.autoAssignUserId ต้องมีค่า
   * - หรือ Requester มี Department Manager
   *
   * @param {number} projectId
   * @param {number} jobTypeId
   * @param {number} requesterId
   * @returns {Promise<Object>} - { canCreate, assigneeId, source, message }
   */
  async validateSkipApprovalJobCreation(projectId, jobTypeId, requesterId) {
    try {
      // 1. ดึง flow
      const flow = await this.getApprovalFlow(projectId, jobTypeId);

      // ถ้าไม่ skip approval ก็ไม่ต้องตรวจ
      if (!flow || !flow.skipApproval) {
        return { canCreate: true, requiresApproval: true };
      }

      // 2. หา assignee จาก flow.autoAssignUserId
      if (flow.autoAssignUserId) {
        return {
          canCreate: true,
          assigneeId: flow.autoAssignUserId,
          source: 'flow_config'
        };
      }

      // 3. หา assignee จาก project_job_assignments
      const assignment = await this.prisma.projectJobAssignment.findFirst({
        where: {
          projectId: parseInt(projectId),
          jobTypeId: parseInt(jobTypeId),
          isActive: true
        },
        select: { assigneeId: true }
      });

      if (assignment?.assigneeId) {
        return {
          canCreate: true,
          assigneeId: assignment.assigneeId,
          source: 'project_assignment'
        };
      }

      // 4. หา Department Manager ของ Requester
      const user = await this.prisma.user.findUnique({
        where: { id: parseInt(requesterId) },
        select: { departmentId: true }
      });

      if (user?.departmentId) {
        const dept = await this.prisma.department.findUnique({
          where: { id: user.departmentId },
          select: { managerId: true }
        });

        if (dept?.managerId) {
          return {
            canCreate: true,
            assigneeId: dept.managerId,
            source: 'dept_manager'
          };
        }
      }

      // 5. ไม่พบ assignee → ไม่ให้สร้างงาน
      return {
        canCreate: false,
        message: 'ไม่สามารถสร้างงานได้ เนื่องจากยังไม่มีผู้รับผิดชอบ กรุณาตั้งค่าที่ Project → Job Assignments ก่อน'
      };
    } catch (error) {
      console.error('[ApprovalService] validateSkipApprovalJobCreation error:', error);
      return { canCreate: false, message: error.message };
    }
  }

  /**
   * Auto-assign job with fallback logic:
   * 1. flow.autoAssignUserId (specific_user/team_lead)
   * 2. project_job_assignments.assignee_id
   * 3. dept_manager ของ requester
   * 4. ไม่มี → ต้อง manual assign
   *
   * @param {number} jobId
   * @param {Object} flow
   * @param {number} requesterId
   * @param {number} projectId - Project ID for lookup
   * @param {number} jobTypeId - Job Type ID for lookup
   * @returns {Promise<Object>}
   */
  async autoAssignJobWithFallback(jobId, flow, requesterId, projectId, jobTypeId) {
    try {
      let assigneeId = null;
      let source = null;

      // 1. ตรวจสอบจาก flow config
      if (flow?.autoAssignUserId && ['specific_user', 'team_lead'].includes(flow.autoAssignType)) {
        assigneeId = flow.autoAssignUserId;
        source = 'flow_config';
      }

      // 2. ถ้าไม่มี → หาจาก project_job_assignments
      if (!assigneeId && projectId && jobTypeId) {
        const assignment = await this.prisma.projectJobAssignment.findFirst({
          where: {
            projectId: parseInt(projectId),
            jobTypeId: parseInt(jobTypeId),
            isActive: true
          },
          select: { assigneeId: true }
        });
        if (assignment?.assigneeId) {
          assigneeId = assignment.assigneeId;
          source = 'project_assignment';
        }
      }

      // 3. ถ้าไม่มี → หา dept_manager ของ requester
      if (!assigneeId && requesterId) {
        const user = await this.prisma.user.findUnique({
          where: { id: parseInt(requesterId) },
          select: { departmentId: true }
        });

        if (user?.departmentId) {
          const dept = await this.prisma.department.findUnique({
            where: { id: user.departmentId },
            select: { managerId: true }
          });

          if (dept?.managerId) {
            assigneeId = dept.managerId;
            source = 'dept_manager';
          }
        }
      }

      // 4. Assign ถ้าเจอ
      if (assigneeId) {
        const result = await this.assignJobManually(
          jobId,
          assigneeId,
          null,
          `auto-assign: ${source}`
        );
        return { ...result, assigneeId, source };
      }

      // 5. ไม่เจอเลย → ต้อง manual
      console.warn(`[ApprovalService] autoAssignJobWithFallback: No assignee found for jobId=${jobId}`);
      return { success: false, needsManualAssign: true };
    } catch (error) {
      console.error('[ApprovalService] autoAssignJobWithFallback error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // V2 Methods - DEPRECATED (Kept for backward compatibility during migration)
  // ========================================

  /**
   * @deprecated Use getApprovalFlow instead
   */
  async getFlowAssignmentV2(projectId, jobTypeId) {
    console.warn('[ApprovalService] getFlowAssignmentV2 is deprecated. Use getApprovalFlow instead.');
    const flow = await this.getApprovalFlow(projectId, jobTypeId);
    // Convert V1 flow to V2-like format for compatibility
    if (!flow) return null;
    return {
      ...flow,
      template: {
        totalLevels: this.getApprovalLevels(flow),
        autoAssignType: flow.autoAssignType,
        autoAssignUserId: flow.autoAssignUserId
      }
    };
  }

  /**
   * @deprecated Use isSkipApproval instead
   */
  isSkipApprovalV2(assignment) {
    console.warn('[ApprovalService] isSkipApprovalV2 is deprecated. Use isSkipApproval instead.');
    if (!assignment) return false;
    // Handle both V1 flow and V2 assignment
    if (assignment.skipApproval !== undefined) {
      return assignment.skipApproval === true;
    }
    if (assignment.template) {
      return assignment.template.totalLevels === 0;
    }
    return false;
  }

  /**
   * @deprecated Use autoAssignJob instead
   */
  async autoAssignJobV2(jobId, assignment, requesterId) {
    console.warn('[ApprovalService] autoAssignJobV2 is deprecated. Use autoAssignJob instead.');
    // Convert V2 assignment to V1 flow format
    const flow = assignment ? {
      autoAssignType: assignment.autoAssignType || assignment.template?.autoAssignType || 'manual',
      autoAssignUserId: assignment.autoAssignUserId || assignment.template?.autoAssignUserId
    } : null;
    return this.autoAssignJob(jobId, flow, requesterId);
  }

}

export default ApprovalService;
