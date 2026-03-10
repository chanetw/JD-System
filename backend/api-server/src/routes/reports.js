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
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

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

    // ⚡ Performance: ใช้ select เฉพาะ field ที่จำเป็นแทน include ทั้ง model
    const rejections = await prisma.approval.findMany({
      where: whereCondition,
      select: {
        id: true,
        jobId: true,
        comment: true,
        approvedAt: true,
        ipAddress: true,
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
    const tenantId = req.user.tenantId;

    // ⚡ Performance: Use parallel queries with select only needed fields
    const [statusCounts, approvedApprovals, dayOfWeekApprovals] = await Promise.all([
      // 1. Count by status using groupBy (no row fetching)
      prisma.approval.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true }
      }),
      // 2. Only fetch approved approvals with time data (for avg calculation)
      prisma.approval.findMany({
        where: { tenantId, status: 'approved', approvedAt: { not: null } },
        select: {
          createdAt: true,
          approvedAt: true,
          job: { select: { startedAt: true } }
        }
      }),
      // 3. Fetch minimal data for day-of-week analysis
      prisma.approval.findMany({
        where: { tenantId },
        select: { status: true, createdAt: true }
      })
    ]);

    // คำนวณ counts จาก groupBy
    const countMap = {};
    statusCounts.forEach(s => { countMap[s.status] = s._count.id; });
    const totalApprovals = Object.values(countMap).reduce((sum, c) => sum + c, 0);
    const approvedCount = countMap['approved'] || 0;
    const rejectedCount = countMap['rejected'] || 0;
    const pendingCount = countMap['pending'] || 0;

    const approvalRate = totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0;
    const rejectionRate = totalApprovals > 0 ? (rejectedCount / totalApprovals) * 100 : 0;

    // คำนวณเวลาเฉลี่ยในการอนุมัติ
    const avgApprovalTime = approvedApprovals.length > 0 ?
      approvedApprovals.reduce((sum, a) => sum + (new Date(a.approvedAt) - new Date(a.createdAt)), 0) / approvedApprovals.length : 0;

    // คำนวณเวลาเฉลี่ยจาก submission ถึง approval
    const submissionToApproval = approvedApprovals.filter(a => a.job?.startedAt);
    const avgSubmissionToApproval = submissionToApproval.length > 0 ?
      submissionToApproval.reduce((sum, a) => sum + (new Date(a.approvedAt) - new Date(a.job.startedAt)), 0) / submissionToApproval.length : 0;

    // จัดกลุ่มตามวันในสัปดาห์
    const dayOfWeekStats = {};
    dayOfWeekApprovals.forEach(approval => {
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
          avgApprovalTimeHours: avgApprovalTime / (1000 * 60 * 60),
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

/**
 * GET /api/reports/user-performance/:userId
 * รายงานผลงานรายบุคคล
 * 
 * @param {number} userId - ID ของผู้ใช้
 * @query {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @query {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 */
router.get('/user-performance/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { startDate, endDate } = req.query;
    const prisma = getDatabase();

    // ตรวจสอบสิทธิ์: Admin ดูได้ทุกคน, User ดูได้แค่ตัวเอง
    const userRole = (req.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    if (!isAdmin && req.user?.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'คุณไม่มีสิทธิ์ดูรายงานของผู้ใช้คนนี้'
      });
    }

    // สร้าง where conditions
    const whereCondition = {
      tenantId: req.user.tenantId,
      assigneeId: userId
    };

    if (startDate && endDate) {
      whereCondition.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // ⚡ Performance: ดึง user + jobs แบบ parallel และ select เฉพาะ field ที่จำเป็น
    const [user, jobs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          userRoles: {
            select: { roleName: true }
          }
        }
      }),
      prisma.job.findMany({
        where: whereCondition,
        select: {
          id: true,
          djId: true,
          subject: true,
          status: true,
          createdAt: true,
          completedAt: true,
          dueDate: true,
          draftCount: true,
          jobType: {
            select: { name: true, icon: true }
          },
          project: {
            select: { name: true, code: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'ไม่พบผู้ใช้นี้'
      });
    }

    // คำนวณ Summary
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const completedCount = completedJobs.length;

    // งานที่ส่งตรงเวลา
    const onTimeJobs = completedJobs.filter(j => {
      if (!j.completedAt || !j.dueDate) return false;
      return new Date(j.completedAt) <= new Date(j.dueDate);
    });
    const onTimeCount = onTimeJobs.length;

    // งานที่ดีเลย์
    const delayedJobs = completedJobs.filter(j => {
      if (!j.completedAt || !j.dueDate) return false;
      return new Date(j.completedAt) > new Date(j.dueDate);
    }).map(j => {
      const daysLate = Math.ceil((new Date(j.completedAt) - new Date(j.dueDate)) / (1000 * 60 * 60 * 24));
      return {
        id: j.id,
        djId: j.djId,
        subject: j.subject,
        dueDate: j.dueDate,
        completedAt: j.completedAt,
        daysLate
      };
    });

    // คำนวณเวลาเฉลี่ยในการทำงาน
    const turnaroundTimes = completedJobs
      .filter(j => j.createdAt && j.completedAt)
      .map(j => Math.ceil((new Date(j.completedAt) - new Date(j.createdAt)) / (1000 * 60 * 60 * 24)));
    const avgTurnaroundDays = turnaroundTimes.length > 0
      ? (turnaroundTimes.reduce((sum, days) => sum + days, 0) / turnaroundTimes.length).toFixed(1)
      : '0.0';

    // คำนวณอัตราส่งตรงเวลา
    const onTimeRate = completedCount > 0
      ? ((onTimeCount / completedCount) * 100).toFixed(1)
      : '0.0';

    // คำนวณ Revision Rate (ใช้ draftCount เป็น proxy)
    const jobsWithRevision = jobs.filter(j => (j.draftCount || 0) > 1);
    const revisionRate = totalJobs > 0
      ? ((jobsWithRevision.length / totalJobs) * 100).toFixed(1)
      : '0.0';

    // จัดกลุ่มตามสถานะ
    const jobsByStatus = {};
    jobs.forEach(j => {
      const status = j.status || 'unknown';
      if (!jobsByStatus[status]) {
        jobsByStatus[status] = { status, count: 0 };
      }
      jobsByStatus[status].count++;
    });
    const jobsByStatusArray = Object.values(jobsByStatus).map(item => ({
      ...item,
      percentage: ((item.count / totalJobs) * 100).toFixed(1)
    }));

    // จัดกลุ่มตามประเภทงาน
    const jobsByType = {};
    jobs.forEach(j => {
      const typeName = j.jobType?.name || 'Unknown';
      if (!jobsByType[typeName]) {
        jobsByType[typeName] = { jobType: typeName, count: 0 };
      }
      jobsByType[typeName].count++;
    });
    const jobsByTypeArray = Object.values(jobsByType).sort((a, b) => b.count - a.count);

    // คำนวณแนวโน้มรายเดือน (6 เดือนล่าสุด)
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthDate.toLocaleString('default', { month: 'short' });
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthJobs = jobs.filter(j => {
        const createdDate = new Date(j.createdAt);
        return createdDate >= monthStart && createdDate <= monthEnd;
      });

      const monthCompleted = monthJobs.filter(j => j.status === 'completed');
      const monthDelayed = monthCompleted.filter(j => {
        if (!j.completedAt || !j.dueDate) return false;
        return new Date(j.completedAt) > new Date(j.dueDate);
      });
      const monthOnTime = monthCompleted.filter(j => {
        if (!j.completedAt || !j.dueDate) return false;
        return new Date(j.completedAt) <= new Date(j.dueDate);
      });

      monthlyTrend.push({
        month: monthKey,
        completed: monthCompleted.length,
        delayed: monthDelayed.length,
        onTime: monthOnTime.length
      });
    }

    // งานล่าสุด (10 งาน)
    const recentJobs = jobs.slice(0, 10).map(j => ({
      id: j.id,
      djId: j.djId,
      subject: j.subject,
      status: j.status,
      dueDate: j.dueDate,
      completedAt: j.completedAt,
      isOnTime: j.completedAt && j.dueDate ? new Date(j.completedAt) <= new Date(j.dueDate) : null
    }));

    res.json({
      success: true,
      data: {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userRole: user.userRoles?.[0]?.roleName || 'Unknown',
        period: {
          startDate: startDate || 'all',
          endDate: endDate || 'all'
        },
        summary: {
          totalJobs,
          completedJobs: completedCount,
          onTimeJobs: onTimeCount,
          delayedJobs: delayedJobs.length,
          avgTurnaroundDays: parseFloat(avgTurnaroundDays),
          onTimeRate: parseFloat(onTimeRate),
          revisionCount: jobsWithRevision.length,
          revisionRate: parseFloat(revisionRate)
        },
        jobsByStatus: jobsByStatusArray,
        jobsByType: jobsByTypeArray,
        monthlyTrend,
        recentJobs,
        delayedJobs: delayedJobs.slice(0, 10) // Top 10 delayed jobs
      }
    });

  } catch (error) {
    console.error('[Reports] User performance error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_USER_PERFORMANCE_FAILED',
      message: 'ไม่สามารถดึงรายงานผลงานได้'
    });
  }
});

/**
 * GET /api/reports/team-comparison
 * เปรียบเทียบผลงานของทีม
 * 
 * @query {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @query {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 */
router.get('/team-comparison', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const prisma = getDatabase();

    // ตรวจสอบสิทธิ์: เฉพาะ Admin
    console.log('[Reports] Team comparison - User:', {
      userId: req.user?.userId,
      roleName: req.user?.roleName,
      role: req.user?.role
    });
    
    const userRole = (req.user?.roleName || req.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'ADMIN_ONLY',
        message: 'เฉพาะ Admin เท่านั้นที่สามารถดูรายงานเปรียบเทียบทีมได้'
      });
    }

    // สร้าง where conditions
    const whereCondition = {
      tenantId: req.user.tenantId,
      assigneeId: { not: null }
    };

    if (startDate && endDate) {
      whereCondition.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // ⚡ Performance: ดึงเฉพาะ field ที่จำเป็นแทน include ทั้ง model
    const jobs = await prisma.job.findMany({
      where: whereCondition,
      select: {
        status: true,
        createdAt: true,
        completedAt: true,
        dueDate: true,
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            userRoles: {
              select: { roleName: true }
            }
          }
        }
      }
    });

    // จัดกลุ่มตาม assignee
    const userMap = {};
    jobs.forEach(job => {
      if (!job.assignee) return;

      const userId = job.assignee.id;
      if (!userMap[userId]) {
        userMap[userId] = {
          userId,
          userName: `${job.assignee.firstName} ${job.assignee.lastName}`,
          userEmail: job.assignee.email,
          userRole: job.assignee.userRoles?.[0]?.roleName || 'Unknown',
          totalJobs: 0,
          completedJobs: 0,
          onTimeJobs: 0,
          delayedJobs: 0,
          turnaroundDays: []
        };
      }

      userMap[userId].totalJobs++;

      if (job.status === 'completed') {
        userMap[userId].completedJobs++;

        // Check on-time
        if (job.completedAt && job.dueDate) {
          if (new Date(job.completedAt) <= new Date(job.dueDate)) {
            userMap[userId].onTimeJobs++;
          } else {
            userMap[userId].delayedJobs++;
          }
        }

        // Calculate turnaround
        if (job.createdAt && job.completedAt) {
          const days = Math.ceil((new Date(job.completedAt) - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));
          userMap[userId].turnaroundDays.push(days);
        }
      }
    });

    // คำนวณ metrics สำหรับแต่ละคน
    const users = Object.values(userMap).map(user => {
      const avgTurnaroundDays = user.turnaroundDays.length > 0
        ? parseFloat((user.turnaroundDays.reduce((sum, d) => sum + d, 0) / user.turnaroundDays.length).toFixed(1))
        : 0;

      const onTimeRate = user.completedJobs > 0
        ? parseFloat(((user.onTimeJobs / user.completedJobs) * 100).toFixed(1))
        : 0;

      const completionRate = user.totalJobs > 0
        ? parseFloat(((user.completedJobs / user.totalJobs) * 100).toFixed(1))
        : 0;

      return {
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        userRole: user.userRole,
        totalJobs: user.totalJobs,
        completedJobs: user.completedJobs,
        onTimeRate,
        avgTurnaroundDays,
        completionRate,
        delayedJobs: user.delayedJobs
      };
    });

    // จัดอันดับ
    const rankings = {
      byCompletedJobs: [...users]
        .sort((a, b) => b.completedJobs - a.completedJobs)
        .slice(0, 10)
        .map((u, index) => ({
          rank: index + 1,
          userId: u.userId,
          userName: u.userName,
          count: u.completedJobs
        })),
      byOnTimeRate: [...users]
        .filter(u => u.completedJobs > 0)
        .sort((a, b) => b.onTimeRate - a.onTimeRate)
        .slice(0, 10)
        .map((u, index) => ({
          rank: index + 1,
          userId: u.userId,
          userName: u.userName,
          rate: u.onTimeRate
        })),
      bySpeed: [...users]
        .filter(u => u.avgTurnaroundDays > 0)
        .sort((a, b) => a.avgTurnaroundDays - b.avgTurnaroundDays)
        .slice(0, 10)
        .map((u, index) => ({
          rank: index + 1,
          userId: u.userId,
          userName: u.userName,
          avgDays: u.avgTurnaroundDays
        }))
    };

    res.json({
      success: true,
      data: {
        period: {
          startDate: startDate || 'all',
          endDate: endDate || 'all'
        },
        users: users.sort((a, b) => b.onTimeRate - a.onTimeRate), // Sort by on-time rate by default
        rankings
      }
    });

  } catch (error) {
    console.error('[Reports] Team comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_TEAM_COMPARISON_FAILED',
      message: 'ไม่สามารถดึงรายงานเปรียบเทียบทีมได้'
    });
  }
});

/**
 * GET /api/reports/analytics
 * ข้อมูล Analytics Dashboard
 * 
 * @query {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @query {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @query {string} status - Filter by status (optional)
 * @query {number} projectId - Filter by project (optional)
 * @query {number} assigneeId - Filter by assignee (optional)
 */
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, status, projectId, assigneeId } = req.query;
    const prisma = getDatabase();

    // สร้าง where conditions
    const whereCondition = {
      tenantId: req.user.tenantId
    };

    if (startDate && endDate) {
      whereCondition.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (status) whereCondition.status = status;
    if (projectId) whereCondition.projectId = parseInt(projectId);
    if (assigneeId) whereCondition.assigneeId = parseInt(assigneeId);

    // ดึงงานทั้งหมด
    const jobs = await prisma.job.findMany({
      where: whereCondition,
      include: {
        jobType: {
          select: { name: true, icon: true }
        },
        project: {
          select: { name: true, code: true }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        requester: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // คำนวณ KPI
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const completedCount = completedJobs.length;

    const onTimeJobs = completedJobs.filter(j => {
      if (!j.completedAt || !j.dueDate) return false;
      return new Date(j.completedAt) <= new Date(j.dueDate);
    });

    const avgTurnaround = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => {
          if (!j.createdAt || !j.completedAt) return sum;
          const days = Math.ceil((new Date(j.completedAt) - new Date(j.createdAt)) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / completedJobs.length
      : 0;

    const jobsWithRevision = jobs.filter(j => (j.draftCount || 0) > 1);
    const revisionRate = totalJobs > 0 ? (jobsWithRevision.length / totalJobs * 100) : 0;
    const onTimeRate = completedCount > 0 ? (onTimeJobs.length / completedCount * 100) : 0;
    const completionRate = totalJobs > 0 ? (completedCount / totalJobs * 100) : 0;

    // จัดกลุ่มตามสถานะ
    const byStatus = {};
    jobs.forEach(j => {
      const s = j.status || 'unknown';
      if (!byStatus[s]) byStatus[s] = { status: s, count: 0 };
      byStatus[s].count++;
    });
    const byStatusArray = Object.values(byStatus).map(item => ({
      ...item,
      label: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '),
      percentage: ((item.count / totalJobs) * 100).toFixed(1),
      color: getStatusColor(item.status)
    }));

    // จัดกลุ่มตามประเภทงาน
    const byJobType = {};
    jobs.forEach(j => {
      const typeName = j.jobType?.name || 'Unknown';
      if (!byJobType[typeName]) {
        byJobType[typeName] = { id: typeName, name: typeName, count: 0, icon: j.jobType?.icon || '📝' };
      }
      byJobType[typeName].count++;
    });
    const byJobTypeArray = Object.values(byJobType).sort((a, b) => b.count - a.count);

    // จัดกลุ่มตามโปรเจค
    const byProject = {};
    jobs.forEach(j => {
      const projectName = j.project?.name || 'No Project';
      if (!byProject[projectName]) {
        byProject[projectName] = { id: projectName, name: projectName, count: 0 };
      }
      byProject[projectName].count++;
    });
    const byProjectArray = Object.values(byProject)
      .map(p => ({
        ...p,
        percentage: ((p.count / totalJobs) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Assignee Performance
    const assigneeMap = {};
    jobs.forEach(j => {
      if (!j.assignee) return;
      const aid = j.assignee.id;
      if (!assigneeMap[aid]) {
        assigneeMap[aid] = {
          id: aid,
          name: `${j.assignee.firstName} ${j.assignee.lastName}`,
          initials: `${j.assignee.firstName[0]}${j.assignee.lastName[0]}`.toUpperCase(),
          title: 'Designer',
          total: 0,
          completed: 0,
          onTime: 0,
          avgDays: []
        };
      }
      assigneeMap[aid].total++;
      if (j.status === 'completed') {
        assigneeMap[aid].completed++;
        if (j.completedAt && j.dueDate && new Date(j.completedAt) <= new Date(j.dueDate)) {
          assigneeMap[aid].onTime++;
        }
        if (j.createdAt && j.completedAt) {
          const days = Math.ceil((new Date(j.completedAt) - new Date(j.createdAt)) / (1000 * 60 * 60 * 24));
          assigneeMap[aid].avgDays.push(days);
        }
      }
    });

    const assigneePerformance = Object.values(assigneeMap).map(a => ({
      id: a.id,
      initials: a.initials,
      name: a.name,
      title: a.title,
      completed: a.completed,
      onTimeRate: a.completed > 0 ? ((a.onTime / a.completed) * 100).toFixed(1) : '0.0',
      avgDays: a.avgDays.length > 0
        ? (a.avgDays.reduce((sum, d) => sum + d, 0) / a.avgDays.length).toFixed(1)
        : '0.0'
    })).sort((a, b) => b.completed - a.completed);

    // Monthly Trend (6 เดือนล่าสุด)
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthDate.toLocaleString('default', { month: 'short' });
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthJobs = jobs.filter(j => {
        const d = new Date(j.createdAt);
        return d >= monthStart && d <= monthEnd;
      });

      const monthCompleted = monthJobs.filter(j => j.status === 'completed');

      monthlyTrend.push({
        name: monthKey,
        jobs: monthJobs.length,
        completed: monthCompleted.length
      });
    }

    res.json({
      success: true,
      data: {
        jobs,
        kpi: {
          totalDJ: totalJobs,
          completed: completedCount,
          completionRate: completionRate.toFixed(1),
          onTimeRate: onTimeRate.toFixed(1),
          avgTurnaround: avgTurnaround.toFixed(1),
          revisionRate: revisionRate.toFixed(1)
        },
        byStatus: byStatusArray,
        byJobType: byJobTypeArray,
        byProject: byProjectArray,
        assigneePerformance,
        monthlyTrend
      }
    });

  } catch (error) {
    console.error('[Reports] Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_ANALYTICS_FAILED',
      message: 'ไม่สามารถดึงข้อมูล Analytics ได้'
    });
  }
});

function getStatusColor(status) {
  const colors = {
    completed: 'bg-green-500',
    in_progress: 'bg-blue-500',
    pending_approval: 'bg-yellow-500',
    rejected: 'bg-red-500',
    pending: 'bg-gray-500'
  };
  return colors[status] || 'bg-gray-400';
}

export default router;
