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
import chainService from './chainService.js';
import { cacheService } from './cacheService.js';

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
        data: {
          status: 'rejected',
          rejectionSource: 'approver'  // ✅ Direct rejection by approver (via email)
        }
      });

      // ✅ NEW: Cascade Reject Downstream Jobs (same as web rejection)
      const chainService = require('./chainService.js').default || require('./chainService.js');
      const cascadeResult = await chainService.cascadeRejectDownstream(
        approval.jobId,
        this.prisma,
        comment
      );

      // Send notifications to affected assignees
      if (cascadeResult.rejected > 0) {
        for (const affected of cascadeResult.affected) {
          if (affected.assigneeId) {
            await this.notificationService.createNotification({
              tenantId: approval.job.tenantId,
              userId: affected.assigneeId,
              type: 'cascade_rejected',
              title: `❌ งาน ${affected.djId} ถูกยกเลิก`,
              message: affected.reason,
              link: `/jobs/${affected.jobId}`
            });
          }
        }
        console.log(`[ApprovalService] Email Rejection: Cascade rejected ${cascadeResult.rejected} downstream jobs`);
      }

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
          rejectedAt: new Date(),
          cascaded: cascadeResult.rejected || 0  // ✅ Track cascade count
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
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: { tenantId: true }
      });
      if (!job) return;

      await this.prisma.jobActivity.create({
        data: {
          tenantId: job.tenantId,
          jobId,
          userId: approverId,
          activityType,
          description,
          metadata: {
            ...metadata,
            ipAddress,
            userAgent: metadata?.userAgent || 'Unknown',
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
          // ถ้าอนุมัติสำเร็จแล้วและมี assignee ให้ auto-start เป็น in_progress
          ...(newStatus === 'approved' && {
            status: 'in_progress',
            assignedAt: new Date(),
            startedAt: new Date()
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
        orderBy: { stepNumber: 'asc' },
        take: 100  // ⚡ Performance: Limit to 100 approval steps (prevent large queries)
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
        orderBy: { createdAt: 'desc' },
        take: 200  // ⚡ Performance: Limit to recent 200 activities
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
   * ดึง Approval Flows ทั้งหมด (สำหรับ Admin)
   * ใช้ในหน้า Approval Flow Configuration เพื่อแสดงสถานะโครงการทั้งหมด
   * 
   * @param {number} tenantId - ID ของ Tenant (จาก RLS)
   * @returns {Promise<Array>} - Array ของ Approval Flow configurations ทั้งหมด
   */
  async getAllApprovalFlows(tenantId) {
    try {
      const flows = await this.prisma.approvalFlow.findMany({
        where: {
          // RLS จะ filter tenantId อัตโนมัติ
          isActive: true
        },
        orderBy: [
          { projectId: 'asc' },
          { createdAt: 'desc' }
        ]
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
          teamLeadId,
          createdAt: flow.createdAt,
          updatedAt: flow.updatedAt
        };
      });
    } catch (error) {
      console.error('[ApprovalService] Get all flows error:', error);
      return [];
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
        select: { id: true, projectId: true, jobTypeId: true, status: true, requesterId: true, djId: true, subject: true, isParent: true, predecessorId: true, tenantId: true, priority: true }
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
      const flow = await this.getApprovalFlow(job.projectId, job.jobTypeId, job.priority);

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

      // ✅ FIX: Check for predecessor after final approval
      // If job has predecessor, transition to pending_dependency instead of assigned
      if (isFinal && job.predecessorId) {
        // Job is fully approved but must wait for predecessor to complete
        updateData.status = 'pending_dependency';
        nextStatus = 'pending_dependency';
        console.log(`[Approval] Job ${job.djId} approved but has predecessor → pending_dependency`);
      } else if (isFinal) {
        updateData.startedAt = new Date();
      }

      await this.prisma.job.update({
        where: { id: jobId },
        data: updateData
      });

      // V1 Extended: Auto-Assign Logic if Final Approval (skip if has predecessor)
      let assignResult = null;
      if (isFinal && !job.predecessorId) {
        assignResult = await this.autoAssignJob(jobId, flow, job.requesterId);
        if (assignResult.success) {
          nextStatus = 'in_progress';

          // Auto-Start Notification: แจ้ง Assignee ว่างานเริ่มนับเวลาแล้ว
          if (assignResult.assigneeId && this.notificationService) {
            await this.notificationService.createNotification({
              tenantId: job.tenantId || 1,
              userId: assignResult.assigneeId,
              type: 'job_auto_started',
              title: `งาน ${job.djId} เริ่มทำงานแล้ว`,
              message: `งาน ${job.djId} - ${job.subject} ได้รับการอนุมัติและเริ่มนับเวลาทำงานแล้ว กรุณาดำเนินการ`,
              link: `/jobs/${jobId}`
            }).catch(err => console.warn('[AutoStart] Notification failed:', err.message));
          }
        }
      }

      // ----------------------------------------
      // V1 Extended: Cascade Approval to Children
      // ⚡ Performance: Optimized from N*3 queries → 5 queries for N children
      // ----------------------------------------
      if (job.isParent && (nextStatus === 'approved' || nextStatus === 'in_progress')) {
        // ⚡ Step 1: Get pending children with necessary data
        const pendingChildren = await this.prisma.job.findMany({
          where: { parentJobId: jobId, status: 'pending_approval' },
          select: {
            id: true,
            jobTypeId: true,
            requesterId: true,
            tenantId: true,
            djId: true,
            requester: {
              select: {
                departmentId: true,
                department: {
                  select: { managerId: true }
                }
              }
            }
          }
        });

        if (pendingChildren.length > 0) {
          console.log(`[Cascade] Processing ${pendingChildren.length} pending children...`);

          // ⚡ Step 2: Batch update all children status to 'approved'
          await this.prisma.job.updateMany({
            where: { parentJobId: jobId, status: 'pending_approval' },
            data: { status: 'approved', updatedAt: new Date() }
          });

          // ⚡ Step 3: Batch fetch all approval flows for child job types
          const childJobTypeIds = [...new Set(pendingChildren.map(c => c.jobTypeId))];
          const childFlows = await this.prisma.approvalFlow.findMany({
            where: {
              projectId: job.projectId,
              OR: [
                { jobTypeId: null },  // Default flow
                { jobTypeId: { in: childJobTypeIds } }  // Specific flows
              ],
              isActive: true
            },
            select: {
              id: true,
              jobTypeId: true,
              skipApproval: true,
              autoAssignType: true,
              autoAssignUserId: true
            }
          });

          // Build flow map (specific flows take priority over default)
          const flowMap = new Map();
          childFlows.forEach(flow => {
            if (flow.jobTypeId !== null) {
              flowMap.set(flow.jobTypeId, flow);  // Specific flow
            } else if (!flowMap.has(null)) {
              flowMap.set(null, flow);  // Default flow
            }
          });

          // ⚡ Step 4: Prepare batch auto-assign operations
          const assignOps = [];
          const activityLogs = [];

          for (const child of pendingChildren) {
            try {
              const flow = flowMap.get(child.jobTypeId) || flowMap.get(null);
              let assigneeId = null;
              let childFinalStatus = 'approved';

              // Determine assignee based on flow config
              if (flow?.autoAssignType === 'specific_user' && flow.autoAssignUserId) {
                assigneeId = flow.autoAssignUserId;
                childFinalStatus = 'in_progress';
              } else if (flow?.autoAssignType === 'dept_manager' && child.requester?.department?.managerId) {
                assigneeId = child.requester.department.managerId;
                childFinalStatus = 'in_progress';
              }

              // Prepare update operation
              if (assigneeId) {
                assignOps.push(
                  this.prisma.job.update({
                    where: { id: child.id },
                    data: {
                      assigneeId,
                      status: 'in_progress',
                      assignedAt: new Date(),
                      startedAt: new Date(),
                      updatedAt: new Date()
                    }
                  })
                );
              }

              // Prepare activity log
              activityLogs.push({
                jobId: child.id,
                userId: approverId || job.requesterId,
                activityType: 'job_approved_cascade',
                description: `อนุมัติอัตโนมัติตามงานแม่ (${job.djId}) -> ${childFinalStatus}`,
                metadata: { parentId: jobId, trigger: 'cascade', finalStatus: childFinalStatus },
                tenantId: child.tenantId,
                createdAt: new Date()
              });
            } catch (err) {
              console.error(`[Cascade Error] Failed to prepare child ${child.id}:`, err);
            }
          }

          // ⚡ Step 5: Execute all assignments in parallel
          if (assignOps.length > 0) {
            try {
              await Promise.all(assignOps);
              console.log(`[Cascade] ✅ Assigned ${assignOps.length} children`);
            } catch (err) {
              console.error('[Cascade Error] Batch assignment failed:', err);
            }
          }

          // ⚡ Step 6: Batch create activity logs
          if (activityLogs.length > 0) {
            try {
              await this.prisma.jobActivity.createMany({
                data: activityLogs
              });
              console.log(`[Cascade] ✅ Logged ${activityLogs.length} activities`);
            } catch (err) {
              console.error('[Cascade Error] Batch logging failed:', err);
            }
          }

          console.log(`[Cascade] ✅ Completed cascade approval for ${pendingChildren.length} children`);
        }
      }

      // ----------------------------------------
      // Cascade Approval to Sequential Jobs (Successors)
      // เมื่องานผ่าน level ปัจจุบัน → งานที่ต่อเนื่อง (predecessorId = jobId) ควรผ่าน level เดียวกันด้วย
      // ตัวอย่าง: A อนุมัติ lv1 → B (successor ของ A) ก็อนุมัติ lv1 ไปด้วย
      // ถ้ายังมี lv2 → B จะเป็น pending_level_2 รอ; ถ้า final → B เป็น pending_dependency
      // ----------------------------------------
      {
        const successors = await this.prisma.job.findMany({
          where: {
            predecessorId: jobId,
            status: { in: ['pending_approval', `pending_level_${currentLevel}`] }
          },
          select: { id: true, djId: true, status: true, projectId: true, jobTypeId: true, assigneeId: true }
        });

        if (successors.length > 0) {
          console.log(`[CascadeSeq] Found ${successors.length} sequential successors to cascade approval`);

          for (const successor of successors) {
            try {
              // ตรวจสอบ flow ของ successor (อาจต่างจาก job หลัก)
              const successorFlow = await this.getApprovalFlow(successor.projectId, successor.jobTypeId);
              const successorTotalLevels = this.getApprovalLevels(successorFlow);

              let successorNextStatus;
              if (successorTotalLevels > currentLevel) {
                // ยังมี level ถัดไป → ไปรอ level ถัดไป
                successorNextStatus = `pending_level_${currentLevel + 1}`;
              } else {
                // ผ่าน final level → รอ predecessor เสร็จ (pending_dependency)
                successorNextStatus = 'pending_dependency';
              }

              // บันทึก approval record สำหรับ level ปัจจุบัน
              await this.prisma.approval.create({
                data: {
                  jobId: successor.id,
                  approverId,
                  stepNumber: currentLevel,
                  status: 'approved',
                  approvedAt: new Date(),
                  comment: `Cascade approved level ${currentLevel} จากงาน ${job.djId} (sequential job)`,
                  tenantId: job.tenantId
                }
              });

              // อัปเดตสถานะ successor
              await this.prisma.job.update({
                where: { id: successor.id },
                data: { status: successorNextStatus }
              });

              // บันทึก activity log
              await this.prisma.jobActivity.create({
                data: {
                  tenantId: job.tenantId,
                  jobId: successor.id,
                  userId: approverId,
                  activityType: 'job_approved_cascade_sequential',
                  description: `อนุมัติอัตโนมัติ Level ${currentLevel} ตามงานก่อนหน้า (${job.djId}) → ${successorNextStatus}`,
                  metadata: {
                    predecessorJobId: jobId,
                    predecessorDjId: job.djId,
                    level: currentLevel,
                    totalLevels: successorTotalLevels,
                    newStatus: successorNextStatus
                  }
                }
              });

              console.log(`[CascadeSeq] ✅ Successor ${successor.djId} → ${successorNextStatus} (level ${currentLevel}/${successorTotalLevels})`);
            } catch (err) {
              console.error(`[CascadeSeq] Failed to cascade for successor ${successor.djId}:`, err.message);
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
          status: 'rejected',
          rejectionSource: 'approver'  // ✅ Direct rejection by approver
        }
      });

      // ----------------------------------------
      // V2: Cascade Reject Downstream Jobs
      // ----------------------------------------
      const cascadeResult = await chainService.cascadeRejectDownstream(
        jobId,
        this.prisma,
        comment
      );

      // Send notifications to affected assignees
      if (cascadeResult.rejected > 0) {
        for (const affected of cascadeResult.affected) {
          if (affected.assigneeId) {
            await this.notificationService.createNotification({
              tenantId: job.tenantId,
              userId: affected.assigneeId,
              type: 'cascade_rejected',
              title: `❌ งาน ${affected.djId} ถูกยกเลิก`,
              message: affected.reason,
              link: `/jobs/${affected.jobId}`
            });
          }
        }
        console.log(`[ApprovalService] Cascade rejected ${cascadeResult.rejected} downstream jobs`);
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

      // ✅ NEW: Insert the final links/files into MediaFile table 
      // so they can be shown in MediaPortal / UserPortal.
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const mediaFilePromises = attachments.map(async (acc) => {
          if (acc.url) {
            return this.prisma.mediaFile.create({
              data: {
                tenantId: job.tenantId,
                jobId: job.id,
                projectId: job.projectId,
                fileName: acc.name || `ลิงก์ส่งงาน - ${job.djId}`,
                filePath: acc.url,
                fileType: 'link',
                mimeType: 'text/uri-list',
                uploadedBy: userId,
                fileSize: 0,
              }
            });
          }
          return Promise.resolve();
        });
        await Promise.all(mediaFilePromises);
      }

      // Log Activity
      await this.logApprovalActivity({
        jobId,
        approverId: userId, // Assignee
        activityType: 'job_completed',
        description: 'ส่งมอบงาน (Job Completed)',
        metadata: { note, attachments }
      });

      // Add note as comment if present
      if (note) {
        await this.prisma.jobComment.create({
          data: {
            tenantId: job.tenantId,
            jobId: jobId,
            userId: userId,
            comment: `[ส่งงาน] ${note}`
          }
        });
      }

      // Notify Requester
      if (this.notificationService && job.requesterId) {
        await this.notificationService.createNotification({
          tenantId: job.tenantId,
          userId: job.requesterId, // The person who requested the job
          type: 'job_completed',
          title: `✅ งานส่งมอบแล้ว: ${job.djId}`,
          message: note ? `หมายเหตุ: ${note}` : `งาน ${job.subject} ดำเนินการเสร็จสิ้น`,
          link: `/jobs/${job.id}`
        });
      }

      return { success: true, data: updatedJob };
    } catch (error) {
      return this.handleError(error, 'COMPLETE_JOB', 'Job');
    }
  }

  /**
   * Assignee ปฏิเสธงาน - ส่งกลับไปให้ Approver คนสุดท้ายพิจารณา
   */
  async rejectJobByAssignee({ jobId, assigneeId, comment }) {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true, djId: true, status: true, tenantId: true,
          assigneeId: true, requesterId: true, subject: true,
          flowSnapshot: true  // ✅ เพิ่ม flowSnapshot เพื่อหา Approver จาก flow
        }
      });

      if (!job) throw new Error('Job not found');

      // ตรวจสอบว่าเป็น assignee จริงหรือไม่
      if (job.assigneeId !== assigneeId) {
        return {
          success: false,
          error: 'NOT_ASSIGNEE',
          message: 'คุณไม่ใช่ผู้รับผิดชอบงานนี้'
        };
      }

      // ตรวจสอบสถานะงาน (ต้องเป็น in_progress หรือ assigned)
      if (!['in_progress', 'assigned'].includes(job.status)) {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `ไม่สามารถปฏิเสธงานในสถานะ ${job.status} ได้`
        };
      }

      // ต้องระบุเหตุผล
      if (!comment || comment.trim() === '') {
        return {
          success: false,
          error: 'COMMENT_REQUIRED',
          message: 'กรุณาระบุเหตุผลในการปฏิเสธงาน'
        };
      }

      // หา Approver คนสุดท้ายที่อนุมัติงานนี้
      const lastApproval = await this.prisma.approval.findFirst({
        where: {
          jobId: jobId,
          status: 'approved'
        },
        orderBy: { stepNumber: 'desc' },
        select: {
          id: true,
          approverId: true,
          stepNumber: true,
          approver: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      // อัพเดทสถานะงานเป็น assignee_rejected
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'assignee_rejected',
          rejectedBy: assigneeId,
          rejectionSource: 'assignee',
          rejectionComment: comment.trim()
        }
      });

      // Log Activity
      await this.logApprovalActivity({
        jobId,
        userId: assigneeId,
        activityType: 'job_rejected_by_assignee',
        description: `ผู้รับงานปฏิเสธงาน ${job.djId} - เหตุผล: ${comment}`,
        metadata: {
          comment,
          previousStatus: job.status,
          lastApproverId: lastApproval?.approverId
        }
      });

      // ✅ NEW: แจ้งเตือน Approver (จาก record → flow → requester)
      if (this.notificationService) {
        let notifyUserId = null;
        let notifyRole = '';

        // Step 1: ลองหาจาก approval record ก่อน
        if (lastApproval?.approverId) {
          notifyUserId = lastApproval.approverId;
          notifyRole = 'Approver (from approval record)';
        }
        // Step 2: ถ้าไม่มี ลองหาจาก flowSnapshot (ใช้ Level สุดท้ายก่อนจ่ายงาน)
        else if (job.flowSnapshot?.levels && job.flowSnapshot.levels.length > 0) {
          const lastLevel = job.flowSnapshot.levels[job.flowSnapshot.levels.length - 1];
          if (lastLevel.approvers && lastLevel.approvers.length > 0) {
            // ใช้ Approver Level สุดท้ายก่อนหน้าที่จะจ่ายงานให้ผู้รับงาน
            const lastApprover = lastLevel.approvers[0];
            notifyUserId = lastApprover.id || lastApprover.userId;
            notifyRole = `Approver Level ${lastLevel.level} (last before assignment: ${lastApprover.name})`;
          }
        }
        // Step 3: ถ้ายังไม่มี fallback ไป Requester
        if (!notifyUserId) {
          notifyUserId = job.requesterId;
          notifyRole = 'Requester (no approver in flow)';
        }

        await this.notificationService.createNotification({
          tenantId: job.tenantId,
          userId: notifyUserId,
          type: 'assignee_rejected',
          title: `ผู้รับงานปฏิเสธงาน ${job.djId}`,
          message: `ผู้รับงานปฏิเสธงาน "${job.subject}" เหตุผล: ${comment}`,
          link: `/jobs/${jobId}`
        }).catch(err => console.warn('[RejectByAssignee] Notification failed:', err.message));

        console.log(`[RejectByAssignee] Notified ${notifyRole} (userId: ${notifyUserId}) for job ${job.djId}`);
      }

      return {
        success: true,
        data: {
          status: 'assignee_rejected',
          lastApprover: lastApproval?.approver || null
        }
      };
    } catch (error) {
      return this.handleError(error, 'REJECT_BY_ASSIGNEE', 'Job');
    }
  }

  /**
   * Approver ยืนยันการปฏิเสธของ Assignee → งานเปลี่ยนเป็น rejected แจ้ง Requester
   */
  async confirmAssigneeRejection({ jobId, approverId, comment, ccEmails = [] }) {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true, djId: true, status: true, tenantId: true,
          requesterId: true, rejectedBy: true, rejectionComment: true, subject: true,
          requester: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        }
      });

      if (!job) throw new Error('Job not found');

      // ตรวจสอบสถานะต้องเป็น assignee_rejected
      if (job.status !== 'assignee_rejected') {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `งานไม่อยู่ในสถานะรอยืนยันการปฏิเสธ (สถานะปัจจุบัน: ${job.status})`
        };
      }

      // อัพเดทสถานะเป็น rejected
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'rejected'
        }
      });

      // Log Activity
      await this.logApprovalActivity({
        jobId,
        userId: approverId,
        activityType: 'assignee_rejection_confirmed',
        description: `ผู้อนุมัติยืนยันการปฏิเสธงาน ${job.djId}${comment ? ` - หมายเหตุ: ${comment}` : ''}`,
        metadata: {
          approverComment: comment,
          assigneeComment: job.rejectionComment,
          previousStatus: job.status,
          ccEmails: ccEmails
        }
      });

      // แจ้งเตือน Requester (ผู้สร้าง DJ) ว่างานถูกปฏิเสธ
      if (job.requesterId && this.notificationService) {
        const rejectionReason = job.rejectionComment || 'ไม่ระบุเหตุผล';
        await this.notificationService.createNotification({
          tenantId: job.tenantId,
          userId: job.requesterId,
          type: 'job_rejected_final',
          title: `งาน ${job.djId} ถูกปฏิเสธ`,
          message: `งาน "${job.subject}" ถูกปฏิเสธโดยผู้รับงาน เหตุผล: ${rejectionReason}`,
          link: `/jobs/${jobId}`
        }).catch(err => console.warn('[ConfirmRejection] Notification failed:', err.message));
      }

      // ส่ง Email แจ้งเตือน Requester และ CC
      if (job.requester?.email) {
        try {
          const EmailService = require('./emailService');
          const emailService = new EmailService();

          const rejectionReason = job.rejectionComment || 'ไม่ระบุเหตุผล';
          const recipientEmails = [job.requester.email];

          // เพิ่ม CC emails (กรอง duplicate)
          const uniqueCcEmails = ccEmails.filter(email =>
            email && !recipientEmails.includes(email)
          );

          await emailService.sendJobRejectionNotification({
            to: job.requester.email,
            cc: uniqueCcEmails,
            jobId: job.djId,
            jobSubject: job.subject,
            rejectionReason: rejectionReason,
            approverComment: comment,
            jobLink: `/jobs/${jobId}`
          });
        } catch (emailErr) {
          console.warn('[ConfirmRejection] Email notification failed:', emailErr.message);
        }
      }

      return {
        success: true,
        data: { status: 'rejected' }
      };
    } catch (error) {
      return this.handleError(error, 'CONFIRM_ASSIGNEE_REJECTION', 'Job');
    }
  }

  /**
   * Deny Assignee Rejection (Approver forces Assignee to continue working)
   *
   * @param {Object} params
   * @param {number} params.jobId - Job ID
   * @param {number} params.approverId - Approver who denies the rejection
   * @param {string} params.reason - Reason for denial
   * @returns {Promise<Object>} Result object
   */
  async denyAssigneeRejection({ jobId, approverId, reason }) {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true, djId: true, status: true, tenantId: true,
          requesterId: true, assigneeId: true, rejectedBy: true,
          rejectionComment: true, subject: true,
          assignee: {
            select: { id: true, email: true, firstName: true, lastName: true, displayName: true }
          }
        }
      });

      if (!job) throw new Error('Job not found');

      // ตรวจสอบสถานะต้องเป็น assignee_rejected
      if (job.status !== 'assignee_rejected') {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `งานไม่อยู่ในสถานะรอยืนยันการปฏิเสธ (สถานะปัจจุบัน: ${job.status})`
        };
      }

      // อัพเดทสถานะกลับเป็น in_progress และ set rejection denial flags
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'in_progress',
          rejectionDeniedAt: new Date(),
          rejectionDeniedBy: approverId,
          // Clear rejection fields
          rejectedBy: null,
          rejectionSource: null,
          rejectionComment: null
        }
      });

      // Log Activity
      await this.logApprovalActivity({
        jobId,
        userId: approverId,
        activityType: 'assignee_rejection_denied',
        description: `ผู้อนุมัติไม่อนุมัติการปฏิเสธงาน ${job.djId} - ${reason}`,
        metadata: {
          denialReason: reason,
          assigneeComment: job.rejectionComment,
          previousStatus: job.status
        }
      });

      // แจ้งเตือน Assignee ว่าคำขอปฏิเสธถูกปฏิเสธ (ต้องทำงานต่อ)
      if (job.assigneeId && this.notificationService) {
        await this.notificationService.createNotification({
          tenantId: job.tenantId,
          userId: job.assigneeId,
          type: 'rejection_denied',
          title: `คำขอปฏิเสธงาน ${job.djId} ไม่ได้รับอนุมัติ`,
          message: `กรุณาทำงาน "${job.subject}" ต่อ หรือขอขยายเวลา (Extend)\n\nเหตุผล: ${reason}`,
          link: `/jobs/${jobId}`
        }).catch(err => console.warn('[DenyRejection] Notification failed:', err.message));
      }

      // ส่ง Email แจ้งเตือน Assignee พร้อมแนะนำให้ใช้ Extend
      if (job.assignee?.email) {
        try {
          const EmailService = require('./emailService');
          const emailService = new EmailService();

          await emailService.sendRejectionDeniedNotification({
            to: job.assignee.email,
            jobId: job.djId,
            jobSubject: job.subject,
            denialReason: reason,
            assigneeName: job.assignee.displayName || `${job.assignee.firstName} ${job.assignee.lastName}`,
            jobLink: `/jobs/${jobId}`
          });
        } catch (emailErr) {
          console.warn('[DenyRejection] Email notification failed:', emailErr.message);
        }
      }

      return {
        success: true,
        data: {
          status: 'in_progress',
          rejectionDeniedAt: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error, 'DENY_ASSIGNEE_REJECTION', 'Job');
    }
  }

  /**
   * Auto-assign job after approval (Internal use)
   * ⚡ Performance: Optimized from 3 queries → 1 query with includes
   */
  async autoAssignJob(jobId) {
    try {
      // ⚡ Performance: Single query with all needed data
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          projectId: true,
          requesterId: true,
          jobTypeId: true,
          tenantId: true,
          requester: {
            select: {
              id: true,
              departmentId: true,
              tenantId: true,
              // ⚡ Include department with manager in one query
              department: {
                select: {
                  id: true,
                  managerId: true,
                  manager: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                  }
                }
              }
            }
          },
          // ⚡ Include approval flow in same query
          project: {
            select: {
              id: true,
              approvalFlows: {
                where: {
                  isActive: true,
                  OR: [
                    { jobTypeId: null },  // Default flow
                    { jobTypeId: jobId }  // Specific flow for this job type
                  ]
                },
                orderBy: { jobTypeId: 'desc' },  // Specific flow takes priority
                take: 1,
                select: {
                  id: true,
                  skipApproval: true,
                  autoAssignType: true,
                  autoAssignUserId: true,
                  autoAssignUser: {
                    select: { id: true, firstName: true, lastName: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!job) return { success: false, message: 'Job not found' };

      // Get approval flow config (already loaded)
      const approvalFlow = job.project?.approvalFlows?.[0];

      // 1. Check Approval Flow Config (auto-assign specific user)
      if (approvalFlow?.autoAssignType === 'specific_user' && approvalFlow.autoAssignUserId) {
        return await this.assignJobManually(jobId, approvalFlow.autoAssignUserId, null, 'auto-assign: specific-user');
      }

      // 2. Check Approval Flow Config (auto-assign department manager)
      if (approvalFlow?.autoAssignType === 'dept_manager' && job.requester?.department?.managerId) {
        return await this.assignJobManually(jobId, job.requester.department.managerId, null, 'auto-assign: dept-manager');
      }

      // 3. Fallback: Check Department Manager (legacy logic)
      if (job.requester?.department?.managerId) {
        return await this.assignJobManually(jobId, job.requester.department.managerId, null, 'auto-assign: dept-manager');
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
          startedAt: new Date(),
          status: 'in_progress'
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

      // ⚡ Performance: Invalidate cache for this project's approval flows
      cacheService.invalidateByPrefix(`approval_flow:${projectId}:`);
      console.log(`[Cache] Invalidated approval flows for project ${projectId}`);

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
  async getApprovalFlow(projectId, jobTypeId, priority = 'normal') {
    try {
      // ⚡ Performance: Check cache first (1 hour TTL)
      // Append priority to cache key to separate urgent/normal flows
      const isUrgent = priority.toLowerCase() === 'urgent';
      const cacheKey = `approval_flow:${projectId}:${jobTypeId || 'default'}:${isUrgent ? 'urgent' : 'normal'}`;
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;

      // ⚡ Performance: Fetch both specific and default flows in single query
      // NOTE: Prisma does not support null inside `in` clause, must use OR
      const flows = await this.prisma.approvalFlow.findMany({
        where: {
          projectId: parseInt(projectId),
          isActive: true,
          OR: jobTypeId
            ? [
                { jobTypeId: parseInt(jobTypeId) }, // Specific flow for this jobType
                { jobTypeId: null }                 // Default flow (fallback)
              ]
            : [{ jobTypeId: null }]                 // Default flow only (no jobType)
        },
        include: {
          autoAssignUser: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          jobType: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
          { id: 'desc' } // Latest flow if multiple
        ],
        take: 2 // Max 2: specific + default
      });

      let flow = null;
      const specificFlow = flows.find(f => f.jobTypeId !== null);
      const defaultFlow = flows.find(f => f.jobTypeId === null);

      // ถ้าเป็นงาน Urgent และ Specific Flow ตั้งค่าให้ข้าม (Skip Approval)
      // ให้ถือว่าไม่มี Flow เฉพาะ (เพื่อไปดึง Default Flow ของโครงการมาใช้แทน)
      if (isUrgent && specificFlow && specificFlow.skipApproval) {
        flow = defaultFlow || null;
      } else {
        flow = specificFlow || defaultFlow || null;
      }

      // ⚡ Performance: Cache for 1 hour (3600 seconds)
      cacheService.set(cacheKey, flow, 3600);

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
   * Auto-approve ถ้า requester อยู่ใน approval flow ของ level ปัจจุบัน
   * เหมือนกับ requester กด approve ด้วยตัวเอง — เฉพาะ level ที่ตัวเองมีสิทธิ์
   *
   * @param {Object} params
   * @param {number} params.jobId - Job ID
   * @param {number} params.requesterId - Requester User ID
   * @param {number} params.projectId - Project ID
   * @param {number} params.jobTypeId - JobType ID
   * @param {number} params.tenantId - Tenant ID
   * @param {string} params.priority - Job priority ('normal', 'urgent')
   * @returns {Promise<Object>} - { autoApproved, newStatus, isFinal, approvalId }
   */
  async autoApproveIfRequesterIsApprover({ jobId, requesterId, projectId, jobTypeId, tenantId, priority = 'normal' }) {
    try {
      // 1. ดึง approval flow
      const flow = await this.getApprovalFlow(projectId, jobTypeId, priority);
      if (!flow || !flow.approverSteps || !Array.isArray(flow.approverSteps)) {
        console.log(`[AutoApprove] No flow or approverSteps for project=${projectId}, jobType=${jobTypeId}. Flow:`, flow ? { id: flow.id, name: flow.name, hasSteps: !!flow.approverSteps } : null);
        return { autoApproved: false };
      }

      console.log(`[AutoApprove] Flow found: id=${flow.id}, name="${flow.name}", steps=${flow.approverSteps.length}`);

      // 2. หา level 1 (pending_approval = level 1)
      const level1 = flow.approverSteps.find(s =>
        s.stepNumber === 1 || s.level === 1
      );
      if (!level1 || !level1.approvers || !Array.isArray(level1.approvers)) {
        console.log(`[AutoApprove] No level 1 found. Steps:`, JSON.stringify(flow.approverSteps.map(s => ({ stepNumber: s.stepNumber, level: s.level }))));
        return { autoApproved: false };
      }

      console.log(`[AutoApprove] Level 1 approvers:`, JSON.stringify(level1.approvers.map(a => ({ id: a.id, userId: a.userId, type: typeof (a.id || a.userId) }))));

      // 3. เช็ค: requester อยู่ใน level 1 approvers ไหม?
      const isApproverAtLevel1 = level1.approvers.some(a => {
        const approverId = a.id || a.userId;
        // Compare with both number and string to handle type mismatches
        return approverId == requesterId; // loose equality handles string/number
      });

      if (!isApproverAtLevel1) {
        console.log(`[AutoApprove] Requester ${requesterId} (type: ${typeof requesterId}) NOT found in level 1 approvers`);
        return { autoApproved: false };
      }

      console.log(`[AutoApprove] Requester ${requesterId} is approver at Level 1 for job ${jobId}`);

      // 4. สร้าง approval record + mark as approved (เหมือน approveJobViaWeb)
      console.log(`[AutoApprove] 🔍 Creating approval record:`, {
        jobId,
        approverId: requesterId,
        approverIdType: typeof requesterId,
        stepNumber: 1
      });

      const approval = await this.prisma.approval.create({
        data: {
          jobId,
          approverId: requesterId,
          stepNumber: 1,
          status: 'approved',
          approvedAt: new Date(),
          comment: 'Auto-approved: ผู้สร้างงานเป็นผู้อนุมัติ',
          tenantId
        }
      });

      console.log(`[AutoApprove] ✅ Created approval record ID: ${approval.id}, approverId: ${approval.approverId}`);

      // 5. Advance job status (reuse logic from approveJobViaWeb)
      const totalLevels = this.getApprovalLevels(flow);
      let newStatus, isFinal;

      if (totalLevels > 1) {
        // ยังมี level ถัดไป → pending_level_2
        newStatus = 'pending_level_2';
        isFinal = false;
      } else {
        // level เดียว → approved (แต่ถ้ามี assignee อยู่แล้วให้เป็น in_progress)
        newStatus = 'approved';
        isFinal = true;
      }

      // 5.1 ตรวจสอบ predecessorId และ assigneeId
      if (isFinal) {
        const currentJob = await this.prisma.job.findUnique({
          where: { id: jobId },
          select: { assigneeId: true, predecessorId: true, djId: true }
        });

        // ✅ FIX: Check predecessor first (higher priority than assignee)
        if (currentJob?.predecessorId) {
          // Has predecessor → must wait regardless of assignee
          newStatus = 'pending_dependency';
          console.log(`[AutoApprove] Job ${currentJob.djId || jobId} approved but has predecessor → pending_dependency`);
        } else if (currentJob?.assigneeId) {
          // No predecessor but has assignee → start immediately
          newStatus = 'in_progress';
          console.log(`[AutoApprove] Job ${currentJob.djId || jobId} has assignee → status set to in_progress`);
        }
      }

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: newStatus,
          ...(isFinal && newStatus !== 'pending_dependency' ? { startedAt: new Date() } : {})
        }
      });

      // 6. Log activity พร้อม detail ครบถ้วน (non-blocking)
      // บันทึก: Level ที่อนุมัติ, จำนวน Level ทั้งหมด, สถานะใหม่, และ Auto-approval indicator
      await this.prisma.activityLog.create({
        data: {
          jobId,
          userId: requesterId,
          action: 'job_auto_approved',
          message: `Auto-approved Level 1/${totalLevels}: ผู้สร้างเป็นผู้อนุมัติ → ${newStatus}`,
          detail: JSON.stringify({
            autoApproved: true,
            level: 1,
            totalLevels,
            newStatus,
            approverId: requesterId,
            isFinal
          })
        }
      }).catch(err => console.warn('[AutoApprove] Activity log failed:', err.message));

      console.log(`[AutoApprove] Job ${jobId} auto-approved → ${newStatus} (isFinal: ${isFinal}, totalLevels: ${totalLevels})`);

      return {
        autoApproved: true,
        newStatus,
        isFinal,
        approvalId: approval.id
      };
    } catch (error) {
      console.error('[ApprovalService] autoApproveIfRequesterIsApprover error:', error);
      return { autoApproved: false };
    }
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

      // 1.5 🔄 SYNC: deactivate skip flows ของ job types ที่ไม่ได้อยู่ใน list นี้
      // เพื่อให้ UI แสดงเฉพาะ job types ที่เลือกในรอบปัจจุบัน
      if (jobTypeIds.length >= 0) {
        await this.prisma.approvalFlow.updateMany({
          where: {
            projectId,
            skipApproval: true,
            jobTypeId: { not: null, notIn: jobTypeIds },
            isActive: true
          },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });
        console.log(`[BulkFlow] Deactivated skip flows NOT in selection for project ${projectId}`);
      }

      // ⚡ Performance: Batch fetch all existing flows at once (1 query instead of N)
      const existingFlows = await this.prisma.approvalFlow.findMany({
        where: {
          projectId,
          jobTypeId: { in: jobTypeIds },
          isActive: true
        }
      });

      // Build map for quick lookup
      const existingFlowMap = new Map();
      existingFlows.forEach(f => existingFlowMap.set(f.jobTypeId, f));

      // ⚡ Performance: Prepare batch operations
      const createOperations = [];
      const updateOperations = [];
      const errors = [];

      // 2. สร้าง/อัพเดต flows สำหรับแต่ละ job type
      for (const jobTypeId of jobTypeIds) {
        const assignment = assignmentMap.get(jobTypeId);
        const assigneeId = assignment?.assigneeId || null;
        const jobTypeName = assignment?.jobType?.name || `JobType#${jobTypeId}`;

        try {
          const existing = existingFlowMap.get(jobTypeId);

          const flowData = {
            skipApproval,
            autoAssignType: assigneeId ? 'specific_user' : 'manual',
            autoAssignUserId: assigneeId,
            updatedAt: new Date()
          };

          if (existing) {
            // Prepare update operation
            updateOperations.push({
              operation: this.prisma.approvalFlow.update({
                where: { id: existing.id },
                data: flowData
              }),
              jobTypeName,
              jobTypeId
            });
          } else {
            // Prepare create operation
            createOperations.push({
              operation: this.prisma.approvalFlow.create({
                data: {
                  tenantId: tenantId || 1,
                  projectId,
                  jobTypeId: jobTypeId || null,
                  level: 0,
                  name: `${name} - ${jobTypeName}`,
                  approverSteps: [],
                  isActive: true,
                  ...flowData
                }
              }),
              jobTypeName,
              jobTypeId
            });
          }
        } catch (err) {
          errors.push({ jobTypeId, jobTypeName, error: err.message });
        }
      }

      // ⚡ Performance: Execute all operations in parallel
      const createdFlows = [];
      const updatedFlows = [];

      try {
        // Execute creates
        if (createOperations.length > 0) {
          const createResults = await Promise.all(
            createOperations.map(op => op.operation.catch(err => ({ error: err.message, jobTypeId: op.jobTypeId })))
          );
          createResults.forEach((result, index) => {
            if (result.error) {
              errors.push({ jobTypeId: createOperations[index].jobTypeId, jobTypeName: createOperations[index].jobTypeName, error: result.error });
            } else {
              createdFlows.push({ ...result, jobTypeName: createOperations[index].jobTypeName });
            }
          });
        }

        // Execute updates
        if (updateOperations.length > 0) {
          const updateResults = await Promise.all(
            updateOperations.map(op => op.operation.catch(err => ({ error: err.message, jobTypeId: op.jobTypeId })))
          );
          updateResults.forEach((result, index) => {
            if (result.error) {
              errors.push({ jobTypeId: updateOperations[index].jobTypeId, jobTypeName: updateOperations[index].jobTypeName, error: result.error });
            } else {
              updatedFlows.push({ ...result, jobTypeName: updateOperations[index].jobTypeName });
            }
          });
        }
      } catch (err) {
        console.error('[ApprovalService] Batch operation error:', err);
        errors.push({ error: err.message });
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
