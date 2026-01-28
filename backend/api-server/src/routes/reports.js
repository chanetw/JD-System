/**
 * @file reports.js
 * @description Approval Reports & Analytics Routes
 * 
 * Features:
 * - Approval statistics
 * - Rejection reasons analysis
 * - IP-based audit reports
 * - Performance metrics
 */

import express from 'express';
import { authenticateToken } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// ทุก routes ต้องมีการ authenticate
router.use(authenticateToken);

/**
 * GET /api/reports/approval-stats
 * สถิติการอนุมัติงาน
 * 
 * @query {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @query {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @query {string} approverId - ID ของผู้อนุมัติ (optional)
 */
router.get('/approval-stats', async (req, res) => {
  try {
    const { startDate, endDate, approverId } = req.query;
    const prisma = getDatabase();

    // สร้าง where conditions
    const whereCondition = {
      tenantId: req.user.tenantId,
      createdAt: {}
    };

    if (startDate) {
      whereCondition.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      whereCondition.createdAt.lte = new Date(endDate);
    }
    if (approverId) {
      whereCondition.approverId = parseInt(approverId);
    }

    // ดึงสถิติการอนุมัติ
    const approvalStats = await prisma.approval.groupBy({
      by: ['status'],
      where: whereCondition,
      _count: {
        id: true
      }
    });

    // ดึงข้อมูลผู้อนุมัติ
    const approverStats = await prisma.approval.groupBy({
      by: ['approverId', 'status'],
      where: whereCondition,
      _count: {
        id: true
      }
    });

    // ดึงข้อมูลผู้อนุมัติพร้อมชื่อ
    const approvers = await prisma.user.findMany({
      where: {
        id: { in: approverStats.map(s => s.approverId) }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    // จัดรูปข้อมูล
    const formattedStats = approverStats.map(stat => {
      const approver = approvers.find(a => a.id === stat.approverId);
      return {
        approverId: stat.approverId,
        approverName: approver ? `${approver.firstName} ${approver.lastName}` : 'Unknown',
        approverEmail: approver?.email || 'unknown',
        status: stat.status,
        count: stat._count.id
      };
    });

    res.json({
      success: true,
      data: {
        summary: approvalStats,
        approverBreakdown: formattedStats,
        totalApprovals: approvalStats.reduce((sum, stat) => sum + stat._count.id, 0)
      }
    });

  } catch (error) {
    console.error('[Reports] Approval stats error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_APPROVAL_STATS_FAILED',
      message: 'ไม่สามารถดึงสถิติการอนุมัติได้'
    });
  }
});

/**
 * GET /api/reports/rejection-reasons
 * รายงานเหตุผลการปฏิเสธงาน
 * 
 * @query {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @query {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 */
router.get('/rejection-reasons', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const prisma = getDatabase();

    const whereCondition = {
      tenantId: req.user.tenantId,
      status: 'rejected',
      createdAt: {}
    };

    if (startDate) {
      whereCondition.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      whereCondition.createdAt.lte = new Date(endDate);
    }

    // ดึงข้อมูลการปฏิเสฐทั้งหมด
    const rejections = await prisma.approval.findMany({
      where: whereCondition,
      include: {
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        job: {
          select: {
            djId: true,
            subject: true,
            jobType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // วิเคราะห์เหตุผลการปฏิเสฐ (keyword analysis)
    const reasonAnalysis = {};
    const commonReasons = [
      'ไม่ตรงตาม requirement',
      'ข้อมูลไม่ครบถ้วน',
      'ต้องแก้ไข',
      'ไม่มีงบประมาณ',
      'ไม่อยู่ในแผน',
      'รอประสานงาน',
      'ข้อมูลผิดพลาด',
      'ไม่เป็นไปตาม policy'
    ];

    rejections.forEach(rejection => {
      if (rejection.comment) {
        const comment = rejection.comment.toLowerCase();
        
        // ตรวจสอบ keyword ที่พบบ่อย
        commonReasons.forEach(reason => {
          if (comment.includes(reason.toLowerCase())) {
            reasonAnalysis[reason] = (reasonAnalysis[reason] || 0) + 1;
          }
        });

        // ถ้าไม่พบ keyword ให้จัดเป็น "อื่นๆ"
        const hasCommonReason = commonReasons.some(reason => 
          comment.includes(reason.toLowerCase())
        );
        
        if (!hasCommonReason) {
          reasonAnalysis['อื่นๆ'] = (reasonAnalysis['อื่นๆ'] || 0) + 1;
        }
      }
    });

    // จัดอันดับเหตุผล
    const sortedReasons = Object.entries(reasonAnalysis)
      .sort(([,a], [,b]) => b - a)
      .map(([reason, count]) => ({ reason, count }));

    res.json({
      success: true,
      data: {
        totalRejections: rejections.length,
        reasonAnalysis: sortedReasons,
        rejections: rejections.map(r => ({
          id: r.id,
          jobId: r.jobId,
          jobDjId: r.job.djId,
          jobSubject: r.job.subject,
          jobType: r.job.jobType?.name || 'N/A',
          approverName: `${r.approver.firstName} ${r.approver.lastName}`,
          approverEmail: r.approver.email,
          comment: r.comment,
          rejectedAt: r.approvedAt,
          ipAddress: r.ipAddress
        }))
      }
    });

  } catch (error) {
    console.error('[Reports] Rejection reasons error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_REJECTION_REASONS_FAILED',
      message: 'ไม่สามารถดึงรายงานเหตุผลการปฏิเสฐได้'
    });
  }
});

/**
 * GET /api/reports/ip-audit
 * รายงาน IP Address Audit Trail
 * 
 * @query {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @query {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @query {string} ipAddress - IP address ที่ต้องการตรวจสอบ (optional)
 */
router.get('/ip-audit', async (req, res) => {
  try {
    const { startDate, endDate, ipAddress } = req.query;
    const prisma = getDatabase();

    const whereCondition = {
      tenantId: req.user.tenantId,
      createdAt: {}
    };

    if (startDate) {
      whereCondition.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      whereCondition.createdAt.lte = new Date(endDate);
    }
    if (ipAddress) {
      whereCondition.ipAddress = ipAddress;
    }

    // ดึงข้อมูลการอนุมัติทั้งหมดพร้อม IP
    const approvalActivities = await prisma.approval.findMany({
      where: whereCondition,
      include: {
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        job: {
          select: {
            djId: true,
            subject: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // จัดกลุ่มตาม IP Address
    const ipGroups = {};
    approvalActivities.forEach(activity => {
      if (activity.ipAddress) {
        if (!ipGroups[activity.ipAddress]) {
          ipGroups[activity.ipAddress] = {
            ipAddress: activity.ipAddress,
            activities: [],
            uniqueUsers: new Set(),
            approvedCount: 0,
            rejectedCount: 0
          };
        }

        ipGroups[activity.ipAddress].activities.push({
          id: activity.id,
          jobId: activity.jobId,
          jobDjId: activity.job.djId,
          jobSubject: activity.job.subject,
          approverName: `${activity.approver.firstName} ${activity.approver.lastName}`,
          approverEmail: activity.approver.email,
          status: activity.status,
          comment: activity.comment,
          approvedAt: activity.approvedAt,
          userAgent: activity.userAgent
        });

        ipGroups[activity.ipAddress].uniqueUsers.add(activity.approverId);
        
        if (activity.status === 'approved') {
          ipGroups[activity.ipAddress].approvedCount++;
        } else if (activity.status === 'rejected') {
          ipGroups[activity.ipAddress].rejectedCount++;
        }
      }
    });

    // แปลง Set เป็น count
    Object.keys(ipGroups).forEach(ip => {
      ipGroups[ip].uniqueUserCount = ipGroups[ip].uniqueUsers.size;
      delete ipGroups[ip].uniqueUsers;
    });

    // จัดเรียงตามจำนวน activities
    const sortedIpGroups = Object.values(ipGroups)
      .sort((a, b) => b.activities.length - a.activities.length);

    res.json({
      success: true,
      data: {
        totalActivities: approvalActivities.length,
        ipGroups: sortedIpGroups,
        summary: {
          uniqueIPs: Object.keys(ipGroups).length,
          totalApproved: approvalActivities.filter(a => a.status === 'approved').length,
          totalRejected: approvalActivities.filter(a => a.status === 'rejected').length
        }
      }
    });

  } catch (error) {
    console.error('[Reports] IP audit error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_IP_AUDIT_FAILED',
      message: 'ไม่สามารถดึงรายงาน IP audit ได้'
    });
  }
});

/**
 * GET /api/reports/performance-metrics
 * สถิติประสิทธิภาพการอนุมัติ
 */
router.get('/performance-metrics', async (req, res) => {
  try {
    const prisma = getDatabase();

    // ดึงข้อมูลการอนุมัติทั้งหมดของ tenant
    const approvals = await prisma.approval.findMany({
      where: {
        tenantId: req.user.tenantId
      },
      include: {
        job: {
          select: {
            createdAt: true,
            submittedAt: true,
            deadline: true
          }
        }
      }
    });

    // คำนวณเวลาเฉลี่ยในการอนุมัติ
    const approvedJobs = approvals.filter(a => a.status === 'approved' && a.approvedAt);
    const avgApprovalTime = approvedJobs.length > 0 ? 
      approvedJobs.reduce((sum, a) => {
        const createdTime = new Date(a.createdAt);
        const approvedTime = new Date(a.approvedAt);
        return sum + (approvedTime - createdTime);
      }, 0) / approvedJobs.length : 0;

    // คำนวณเวลาเฉลี่ยจาก submission ถึง approval
    const submissionToApproval = approvedJobs.filter(a => a.job.submittedAt);
    const avgSubmissionToApproval = submissionToApproval.length > 0 ?
      submissionToApproval.reduce((sum, a) => {
        const submittedTime = new Date(a.job.submittedAt);
        const approvedTime = new Date(a.approvedAt);
        return sum + (approvedTime - submittedTime);
      }, 0) / submissionToApproval.length : 0;

    // คำนวณอัตราการอนุมัติ
    const totalApprovals = approvals.length;
    const approvedCount = approvals.filter(a => a.status === 'approved').length;
    const rejectedCount = approvals.filter(a => a.status === 'rejected').length;
    const pendingCount = approvals.filter(a => a.status === 'pending').length;

    const approvalRate = totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0;
    const rejectionRate = totalApprovals > 0 ? (rejectedCount / totalApprovals) * 100 : 0;

    // จัดกลุ่มตามวันในสัปดาห์
    const dayOfWeekStats = {};
    approvals.forEach(approval => {
      const dayOfWeek = new Date(approval.createdAt).toLocaleDateString('th-TH', { weekday: 'long' });
      if (!dayOfWeekStats[dayOfWeek]) {
        dayOfWeekStats[dayOfWeek] = { approved: 0, rejected: 0, total: 0 };
      }
      dayOfWeekStats[dayOfWeek].total++;
      if (approval.status === 'approved') dayOfWeekStats[dayOfWeek].approved++;
      if (approval.status === 'rejected') dayOfWeekStats[dayOfWeek].rejected++;
    });

    res.json({
      success: true,
      data: {
        performance: {
          avgApprovalTimeHours: avgApprovalTime / (1000 * 60 * 60), // แปลงเป็นชั่วโมง
          avgSubmissionToApprovalHours: avgSubmissionToApproval / (1000 * 60 * 60),
          approvalRate: Math.round(approvalRate * 100) / 100,
          rejectionRate: Math.round(rejectionRate * 100) / 100,
          pendingCount
        },
        volume: {
          totalApprovals,
          approvedCount,
          rejectedCount,
          pendingCount
        },
        dayOfWeekAnalysis: dayOfWeekStats
      }
    });

  } catch (error) {
    console.error('[Reports] Performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_PERFORMANCE_METRICS_FAILED',
      message: 'ไม่สามารถดึงสถิติประสิทธิภาพได้'
    });
  }
});

export default router;
