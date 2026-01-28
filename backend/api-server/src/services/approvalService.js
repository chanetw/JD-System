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
      await this.prisma.designJob.update({
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

      await this.prisma.designJob.update({
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
}

export default ApprovalService;
