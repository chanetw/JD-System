/**
 * @file jobs.js
 * @description Job Routes with RLS Context
 *
 * Features:
 * - Role-based job filtering
 * - RLS tenant isolation
 * - Pagination support
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';
import { chainConfig } from '../config/chainConfig.js';
import ApprovalService from '../services/approvalService.js';
import JobService from '../services/jobService.js';
import chainService from '../services/chainService.js';
import jobChainService from '../services/jobChainService.js';
import * as workingHoursHelper from '../utils/workingHoursHelper.js';
import EmailService from '../services/emailService.js';
import NotificationService from '../services/notificationService.js';
import MagicLinkService from '../services/magicLinkService.js';
import {
  createJobApprovalEmail,
  createJobAssignmentEmail,
  createJobExtensionEmail,
  createRejectionRequestEmail,
  createRejectionApprovedEmail,
  createRejectionDeniedEmail
} from '../utils/emailTemplates.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const approvalService = new ApprovalService();
const jobService = new JobService();
const notificationService = new NotificationService();
const magicLinkService = new MagicLinkService();

const router = express.Router();

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/jobs
 * ดึงงานตามบทบาทและ filters
 *
 * @query {string} role - 'requester' | 'assignee' | 'approver' | 'admin'
 * @query {string} status - Filter by status
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 50)
 */
router.get('/', async (req, res) => {
  try {
    const { role = 'requester', status, page = 1, limit = 50 } = req.query;
    const prisma = getDatabase();
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;


    let where = { tenantId };
    // Track jobs where user is the CURRENT level approver (for Approvals Queue filter)
    const currentApproverJobIds = new Set();

    // Multi-role support: role can be comma-separated (e.g. "requester,approver")
    const roles = role.split(',').map(r => r.trim().toLowerCase()).filter(Boolean);

    // Helper: build where condition for a single role
    const buildRoleCondition = async (singleRole) => {
      switch (singleRole) {
        case 'requester':
          // ✅ Requester sees ALL jobs they created (parent, child, and single jobs)
          // This provides full transparency
          return {
            requesterId: userId
          };
        case 'assignee':
          // ✅ NEW: Assignee sees only child jobs assigned to them or single jobs (not parent)
          return {
            assigneeId: userId,
            OR: [
              { isParent: false, parentJobId: { not: null } }, // child jobs assigned to them
              {
                isParent: false,                         // ✅ FIX: Boolean NOT NULL, use false only
                parentJobId: null                        // not a child (single jobs)
              }
            ]
          };
        case 'approver': {
          console.time('[Approver Query] Total');
          console.time('[Approver Query] 1. Fetch allJobs');
          // ✅ Approver sees ALL jobs with any pending approval status AND rejected/returned jobs
          // Frontend JobActionPanel will determine if user can approve based on approval flow
          // This query gets all pending + rejected jobs - both explicit (pending_approval/pending_level_N)
          // + pending_dependency: sequential jobs waiting for predecessor (Approver should know about them)
          // + approved: for history tab (We get jobs where this user has approved)
          const allJobs = await prisma.job.findMany({
            where: {
              tenantId,
              OR: [
                { status: 'pending_approval' },
                { status: { startsWith: 'pending_level_' } },
                { status: 'pending_dependency' },  // ✅ Sequential jobs waiting for predecessor
                { status: 'pending_rejection' },   // ✅ Request to cancel job
                { status: 'rejected' },
                { status: 'returned' },
                // Include jobs this user has already approved (for history)
                {
                  approvals: {
                    some: {
                      approverId: userId
                    }
                  }
                }
              ],
              isParent: false  // Only child + single jobs (not parent jobs)
            },
            select: {
              id: true,
              status: true,
              projectId: true,
              jobTypeId: true,
              priority: true,
              djId: true,
              createdAt: true
            },
            orderBy: [
              { priority: 'desc' },  // urgent > high > normal > low
              { createdAt: 'desc' }  // newest first
            ]
          });
          console.timeEnd('[Approver Query] 1. Fetch allJobs');

          const validJobIds = [];

          if (allJobs.length === 0) {
            console.timeEnd('[Approver Query] Total');
            return null;
          }

          console.time('[Approver Query] 2. Fetch approvedJobs');
          // ⚡ Performance Fix: Batch query for history approvals
          const approvedJobs = await prisma.approval.findMany({
            where: {
              jobId: { in: allJobs.map(j => j.id) },
              approverId: userId,
              status: { in: ['approved', 'rejected', 'returned'] } // รวมงานที่เคย reject/return/approve ด้วย
            },
            select: {
              jobId: true,
              approvedAt: true,
              comment: true,
              status: true
            },
            orderBy: {
              approvedAt: 'desc' // กรณีที่มีหลาย approval (เช่น return แล้ว approve ใหม่) เอาล่าสุด
            }
          });

          console.timeEnd('[Approver Query] 2. Fetch approvedJobs');
          console.log(`[Approver Query] Found ${approvedJobs.length} approved jobs`);

          const approvedJobMap = new Map();
          approvedJobs.forEach(a => {
            if (!approvedJobMap.has(a.jobId)) {
              approvedJobMap.set(a.jobId, a);
            }
          });
          const approvedJobIds = new Set(approvedJobs.map(a => a.jobId));

          console.time('[Approver Query] 3. Build flow keys');
          // ⚡ Performance Fix: Batch query for approval flows
          // We need unique projectId + jobTypeId combinations
          const flowKeys = new Set();
          allJobs.forEach(j => {
            // Include jobs that need flow evaluation (pending statuses)
            if (j.status.startsWith('pending_') || j.status === 'pending_dependency') {
              flowKeys.add(`${j.projectId}_${j.jobTypeId || 'null'}`);
            }
          });

          // ⚡ Performance: Fetch all approval flows in parallel instead of sequential loop
          const flowMap = new Map();
          const flowEntries = [...flowKeys].map(key => {
            const [projIdStr, jobTypeIdStr] = key.split('_');
            const pId = parseInt(projIdStr, 10);
            const jtId = jobTypeIdStr !== 'null' ? parseInt(jobTypeIdStr, 10) : null;
            const sampleJob = allJobs.find(j => j.projectId === pId && j.jobTypeId === jtId);
            const priority = sampleJob ? sampleJob.priority : 'normal';
            return { key, pId, jtId, priority };
          });

          console.timeEnd('[Approver Query] 3. Build flow keys');
          console.log(`[Approver Query] Need to fetch ${flowEntries.length} approval flows`);

          console.time('[Approver Query] 4. Fetch approval flows');
          const flowResults = await Promise.all(
            flowEntries.map(entry => approvalService.getApprovalFlow(entry.pId, entry.jtId, entry.priority))
          );
          flowEntries.forEach((entry, i) => flowMap.set(entry.key, flowResults[i]));
          console.timeEnd('[Approver Query] 4. Fetch approval flows');

          console.time('[Approver Query] 5. Pre-build approver lookup');
          // ⚡ Performance: Pre-build approver lookup maps to avoid nested loops
          // Map: flowKey -> { currentLevelApprovers: Set, anyLevelApprovers: Set }
          const approverLookup = new Map();
          flowMap.forEach((flow, key) => {
            const currentLevelMap = new Map(); // level -> Set of approverIds
            const anyLevelApprovers = new Set();

            if (flow?.approverSteps && Array.isArray(flow.approverSteps)) {
              flow.approverSteps.forEach(step => {
                const stepNum = step.stepNumber || step.level;
                if (step.approvers && Array.isArray(step.approvers)) {
                  const approverSet = new Set();
                  step.approvers.forEach(a => {
                    const approverId = String(a.id || a.userId);
                    approverSet.add(approverId);
                    anyLevelApprovers.add(approverId);
                  });
                  currentLevelMap.set(stepNum, approverSet);
                }
              });
            }
            approverLookup.set(key, { currentLevelMap, anyLevelApprovers });
          });

          console.timeEnd('[Approver Query] 5. Pre-build approver lookup');

          console.time('[Approver Query] 6. Filter jobs by approver');
          const userIdStr = String(userId);

          // For 'approver' role, we need to check if the user is actually an approver for the CURRENT step of each job
          // or if they have already approved it (for history tab).

          for (const job of allJobs) {
            // If they already approved it, always include it (for history)
            if (approvedJobIds.has(job.id)) {
              validJobIds.push(job.id);
              currentApproverJobIds.add(job.id); // history = they were the approver
              continue;
            }

            // If job is rejected/returned/pending_rejection, skip current level check (active participant)
            if (['rejected', 'returned', 'pending_rejection'].includes(job.status)) {
              validJobIds.push(job.id);
              currentApproverJobIds.add(job.id); // rejected/returned/pending_rejection = active participant
              continue;
            }
            // pending_dependency = waiting for predecessor, include but NOT as current approver
            if (job.status === 'pending_dependency') {
              validJobIds.push(job.id);
              continue;
            }

            // Determine current level
            let currentLevel = 0;
            if (job.status === 'pending_approval') currentLevel = 1;
            else if (job.status.startsWith('pending_level_')) {
              currentLevel = parseInt(job.status.split('_')[2], 10);
            }

            if (currentLevel > 0) {
              // ⚡ Performance: Use pre-built lookup map instead of nested loops
              const flowKey = `${job.projectId}_${job.jobTypeId || 'null'}`;
              const lookup = approverLookup.get(flowKey);

              if (lookup) {
                const isApproverForCurrentLevel = lookup.currentLevelMap.get(currentLevel)?.has(userIdStr) || false;
                const isApproverInAnyLevel = lookup.anyLevelApprovers.has(userIdStr);

                if (isApproverForCurrentLevel) {
                  validJobIds.push(job.id);
                  currentApproverJobIds.add(job.id);
                } else if (isApproverInAnyLevel) {
                  validJobIds.push(job.id);
                }
              }
            } else {
              // Fallback for other statuses not handled above
              validJobIds.push(job.id);
            }
          }

          console.timeEnd('[Approver Query] 6. Filter jobs by approver');

          if (validJobIds.length === 0) {
            console.timeEnd('[Approver Query] Total');
            return null;  // Signal no jobs found
          }

          console.time('[Approver Query] 7. Fetch parent jobs');
          // ✅ Also include parent jobs of child jobs in validJobIds
          // Frontend DJList needs parent jobs to render parent-child accordion correctly
          const childJobsWithParent = await prisma.job.findMany({
            where: {
              id: { in: validJobIds },
              parentJobId: { not: null }
            },
            select: { id: true, parentJobId: true }
          });
          const allParentJobIds = [...new Set(
            childJobsWithParent.map(j => j.parentJobId).filter(Boolean)
          )].filter(pid => !validJobIds.includes(pid));

          if (allParentJobIds.length > 0) {
            console.log(`[Approver Queue] Adding ${allParentJobIds.length} parent jobs for accordion display`);
            validJobIds.push(...allParentJobIds);
            // Only mark parent as currentApprover if at least one child is a current approver job
            allParentJobIds.forEach(pid => {
              const hasCurrentApproverChild = childJobsWithParent.some(
                c => c.parentJobId === pid && currentApproverJobIds.has(c.id)
              );
              if (hasCurrentApproverChild) {
                currentApproverJobIds.add(pid);
              }
            });
          }

          console.timeEnd('[Approver Query] 7. Fetch parent jobs');
          console.timeEnd('[Approver Query] Total');
          console.log(`[Approver Query] Final job count: ${validJobIds.length}`);

          return {
            id: { in: validJobIds }
          };
        }
        case 'manager':
          return {
            OR: [
              { status: 'pending_approval' },
              { status: { startsWith: 'pending_level_' } }
            ],
            AND: [{
              OR: [
                { isParent: true },
                { parentJobId: null },
                { parentJob: { status: { notIn: ['pending_approval'] } } }
              ]
            }]
          };
        case 'superadmin':
        case 'admin': {
          // ✅ Admin/Superadmin = Superuser mode: see all jobs and can approve all pending jobs
          // Mark all pending jobs as isCurrentApprover=true for admin
          const allJobs = await prisma.job.findMany({
            where: {
              tenantId,
              OR: [
                { status: 'pending_approval' },
                { status: { startsWith: 'pending_level_' } },
                { status: 'pending_dependency' },
                { status: 'pending_rejection' },
                { status: 'rejected' },
                { status: 'returned' },
                { status: 'approved' },
                // Include jobs this user has already approved (for history)
                {
                  approvals: {
                    some: {
                      approverId: userId
                    }
                  }
                }
              ]
            },
            select: { id: true, status: true }
          });

          // Admin can approve all pending jobs
          allJobs.forEach(job => {
            if (job.status === 'pending_approval' ||
              job.status?.startsWith('pending_level_') ||
              job.status === 'assignee_rejected' ||
              job.status === 'pending_rejection') {
              currentApproverJobIds.add(job.id);
            }
          });

          return {}; // no additional filter = see all
        }
        default:
          return { requesterId: userId }; // fallback to requester
      }
    };

    if (roles.length === 1) {
      // Single role: backward compatible (same logic as before)
      const condition = await buildRoleCondition(roles[0]);
      if (condition === null) {
        // approver with no pending jobs
        return res.json({
          success: true,
          data: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
        });
      }
      Object.assign(where, condition);
    } else {
      // Multi-role: union with OR
      const orConditions = [];
      for (const r of roles) {
        const condition = await buildRoleCondition(r);
        if (condition !== null && Object.keys(condition).length > 0) {
          orConditions.push(condition);
        }
        // admin/superadmin = see all → skip OR, just use tenant filter
        if (r === 'admin' || r === 'superadmin') {
          orConditions.length = 0; // clear, admin sees everything
          break;
        }
      }
      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
      // if orConditions is empty (admin case), where stays as { tenantId } = see all
    }

    // Status filtering
    if (status) {
      if (status === 'todo') {
        where.status = { in: ['assigned'] };
      } else if (status === 'in_progress') {
        // รวม: approved, assigned, in_progress, correction, rework, returned, pending_dependency
        where.status = { in: ['approved', 'assigned', 'in_progress', 'correction', 'rework', 'returned', 'pending_dependency'] };
      } else if (status === 'completed') {
        where.status = { in: ['completed', 'closed'] };
      } else if (status === 'rejected') {
        where.status = { in: ['rejected', 'rejected_by_assignee'] };
      } else if (status === 'waiting') {
        where.status = { in: ['correction', 'pending_approval'] };
      } else if (status === 'done') {
        where.status = { in: ['completed', 'closed'] };
      } else if (status === 'all') {
        // No status filter - return all jobs
      } else {
        where.status = status;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        select: {
          id: true,
          djId: true,
          subject: true,
          status: true,
          priority: true,
          dueDate: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          acceptanceDate: true,
          slaDays: true,
          activityLogs: {
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          // Relations with selected fields only
          project: {
            select: { id: true, name: true, code: true }
          },
          jobType: {
            select: { id: true, name: true, icon: true, colorTheme: true, slaWorkingDays: true }
          },
          requester: {
            select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true }
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true }
          },
          approvals: { // Fetch approvals for history data
            where: { approverId: userId, status: { in: ['approved', 'rejected', 'returned'] } },
            select: { approverId: true, status: true, approvedAt: true, createdAt: true, comment: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          // Parent-Child relationship fields
          isParent: true,
          parentJobId: true,
          // Sequential dependency fields
          predecessorId: true,
          predecessor: {
            select: { id: true, djId: true, subject: true, status: true }
          }
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take
      }),
      prisma.job.count({ where })
    ]);

    const transformed = jobs.map(j => {
      // Find history data if user has acted on this job
      let historyData = null;
      if (req.user?.userId) {
        // We'd need the approvedJobMap here, but it's only available inside the role condition builder.
        // Instead, we can fetch history for all returned jobs for the current user, or just use a separate query.
        // For simplicity and performance, if the job has approvals, we find the one for the user.
        const userApproval = j.approvals?.find(a => a.approverId === req.user.userId && ['approved', 'rejected', 'returned'].includes(a.status));
        if (userApproval) {
          historyData = {
            actionDate: userApproval.approvedAt || userApproval.createdAt,
            comment: userApproval.comment,
            action: userApproval.status
          };
        }
      }

      return {
        id: j.id,
        djId: j.djId,
        subject: j.subject,
        status: j.status,
        priority: j.priority,
        jobType: j.jobType?.name,
        jobTypeId: j.jobTypeId,
        jobTypeIcon: j.jobType?.icon,
        jobTypeColor: j.jobType?.colorTheme,
        slaWorkingDays: j.jobType?.slaWorkingDays,
        project: j.project?.name,
        projectId: j.projectId,
        projectCode: j.project?.code,
        deadline: j.dueDate,
        createdAt: j.createdAt,
        acceptanceDate: j.acceptanceDate,
        startedAt: j.startedAt,
        slaDays: j.slaDays,
        updatedAt: j.completedAt || j.activityLogs?.[0]?.createdAt || j.createdAt,
        requesterId: j.requesterId,
        requester: j.requester?.displayName || `${j.requester?.firstName} ${j.requester?.lastName}`.trim(),
        requesterAvatar: j.requester?.avatarUrl,
        assigneeId: j.assigneeId,
        assignee: j.assignee?.displayName || (j.assignee ? `${j.assignee?.firstName} ${j.assignee?.lastName}`.trim() : null),
        assigneeAvatar: j.assignee?.avatarUrl,
        // Parent-Child relationship metadata
        isParent: j.isParent || false,
        parentJobId: j.parentJobId || null,
        completedAt: j.completedAt,
        // Sequential dependency metadata
        predecessorId: j.predecessorId || null,
        predecessorDjId: j.predecessor?.djId || null,
        predecessorSubject: j.predecessor?.subject || null,
        predecessorStatus: j.predecessor?.status || null,
        lastActivityAt: j.activityLogs?.[0]?.createdAt || j.createdAt,
        historyData: historyData, // ส่งข้อมูลประวัติแนบไปด้วย
        // ✅ Flag: user is the approver for the CURRENT level of this job (for Approvals Queue)
        // false = user is a future-level approver (can see in DJ List but cannot approve yet)
        isCurrentApprover: currentApproverJobIds.has(j.id)
      }
    });

    // We also need to add 'historyData' logic for returned jobs from the loaded 'historyData' where possible:
    // This is just mapping, historyData already set correctly above inside the map function.

    res.json({
      success: true,
      data: transformed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[Jobs] Get jobs error:', error.message, { role: req.query.role, userId: req.user?.userId, stack: error.stack?.split('\n').slice(0, 5).join('\n') });
    res.status(500).json({
      success: false,
      error: 'GET_JOBS_FAILED',
      message: 'ไม่สามารถดึงรายการงานได้'
    });
  }
});

/**
 * GET /api/jobs/counts
 * ดึงจำนวนงานแบ่งตาม status group สำหรับ Assignee (1 query แทน 4)
 *
 * @returns {Object} { in_progress, completed, rejected, all, todo, waiting }
 */
router.get('/counts', async (req, res) => {
  try {
    const prisma = getDatabase();
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const statusGroups = {
      in_progress: ['approved', 'assigned', 'in_progress', 'correction', 'rework', 'returned', 'pending_dependency'],
      completed: ['completed', 'closed'],
      rejected: ['rejected', 'rejected_by_assignee', 'assignee_rejected'],
      todo: ['assigned'],
      waiting: ['correction', 'pending_approval']
    };

    // ดึง counts ทั้งหมดใน 1 query
    const countResults = await prisma.job.groupBy({
      by: ['status'],
      where: {
        tenantId,
        assigneeId: userId,
        OR: [
          { isParent: false, parentJobId: { not: null } },
          { isParent: false, parentJobId: null }
        ]
      },
      _count: { id: true }
    });

    // แปลงผลลัพธ์เป็น map
    const statusMap = {};
    countResults.forEach(r => {
      statusMap[r.status] = r._count.id;
    });

    // รวมตาม group
    const sumGroup = (statuses) => statuses.reduce((sum, s) => sum + (statusMap[s] || 0), 0);

    const counts = {
      in_progress: sumGroup(statusGroups.in_progress),
      completed: sumGroup(statusGroups.completed),
      rejected: sumGroup(statusGroups.rejected),
      todo: sumGroup(statusGroups.todo),
      waiting: sumGroup(statusGroups.waiting),
      all: Object.values(statusMap).reduce((sum, c) => sum + c, 0)
    };

    res.json({ success: true, data: counts });
  } catch (error) {
    console.error('[Jobs] Get counts error:', error.message);
    res.status(500).json({ success: false, error: 'GET_COUNTS_FAILED' });
  }
});

/**
 * GET /api/jobs/dashboard-stats
 * ดึง stats สำหรับ Dashboard ด้วย aggregate COUNT (ไม่ดึงทุก row)
 * แทน getDashboardStats ที่ดึงผ่าน Supabase ตรง
 *
 * @returns {Object} { newToday, dueToday, overdue, totalJobs, pending, myJobs }
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const prisma = getDatabase();
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // ดึงทุก count ด้วย Promise.all ใน parallel
    const [
      newToday,
      dueToday,
      overdue,
      totalJobs,
      pending,
      myJobs
    ] = await Promise.all([
      // งานสร้างวันนี้ (ไม่นับ Parent Jobs)
      prisma.job.count({
        where: { tenantId, isParent: false, createdAt: { gte: todayStart, lte: todayEnd } }
      }),
      // งานถึงกำหนดวันนี้ (ไม่นับ Parent Jobs)
      prisma.job.count({
        where: {
          tenantId,
          isParent: false,
          dueDate: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['completed', 'closed', 'cancelled'] }
        }
      }),
      // งาน overdue (ไม่นับ Parent Jobs)
      prisma.job.count({
        where: {
          tenantId,
          isParent: false,
          dueDate: { lt: todayStart },
          status: { notIn: ['completed', 'closed', 'cancelled'] }
        }
      }),
      // งานทั้งหมด (ไม่นับ Parent Jobs)
      prisma.job.count({ where: { tenantId, isParent: false } }),
      // งานรออนุมัติ (ไม่นับ Parent Jobs)
      prisma.job.count({
        where: {
          tenantId,
          isParent: false,
          status: { in: ['pending_approval', 'pending_rejection'] }
        }
      }),
      // งานของฉัน requester (ไม่นับ Parent Jobs)
      prisma.job.count({
        where: { tenantId, isParent: false, requesterId: userId }
      })
    ]);

    res.json({
      success: true,
      data: { newToday, dueToday, overdue, totalJobs, pending, myJobs }
    });
  } catch (error) {
    console.error('[Jobs] Get dashboard stats error:', error.message);
    res.status(500).json({ success: false, error: 'GET_DASHBOARD_STATS_FAILED' });
  }
});

/**
 * GET /api/jobs/dashboard-jobs
 * ดึงรายการงานสำหรับ KPI Card Drill-down พร้อม Pagination (Lazy Load)
 *
 * @query {string} type - ประเภท: 'newToday' | 'dueToday' | 'overdue'
 * @query {number} page - หน้าที่ต้องการ (default: 1)
 * @query {number} limit - จำนวนต่อหน้า (default: 20, max: 50)
 *
 * @returns {Object} { success, data: { jobs[], total, page, hasMore } }
 */
router.get('/dashboard-jobs', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;

    // ดึง query params และ validate
    const type = req.query.type || 'newToday'; // newToday | dueToday | overdue
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // คำนวณช่วงวันที่สำหรับ filter
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // สร้าง where clause ตามประเภท (ไม่รวม Parent Jobs ให้ตัวเลขตรงกับ stats)
    const EXCLUDED_STATUSES = ['completed', 'closed', 'cancelled'];
    let where = { tenantId, isParent: false };
    switch (type) {
      case 'newToday':
        // งานที่สร้างในวันนี้
        where = { ...where, createdAt: { gte: todayStart, lte: todayEnd } };
        break;
      case 'dueToday':
        // งานครบกำหนดวันนี้ และยังไม่เสร็จ
        where = {
          ...where,
          dueDate: { gte: todayStart, lte: todayEnd },
          status: { notIn: EXCLUDED_STATUSES }
        };
        break;
      case 'overdue':
        // งานเลยกำหนด และยังไม่เสร็จ
        where = {
          ...where,
          dueDate: { lt: todayStart },
          status: { notIn: EXCLUDED_STATUSES }
        };
        break;
      default:
        return res.status(400).json({ success: false, error: 'INVALID_TYPE', message: 'type ต้องเป็น newToday, dueToday หรือ overdue' });
    }

    // ดึงข้อมูลและนับ total พร้อมกัน
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: type === 'overdue' ? { dueDate: 'asc' } : { createdAt: 'desc' },
        select: {
          id: true,
          djId: true,
          subject: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
          project: { select: { id: true, name: true } },
          jobType: { select: { id: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true } },
          requester: { select: { id: true, firstName: true, lastName: true, displayName: true } }
        }
      }),
      prisma.job.count({ where })
    ]);

    // คำนวณว่ายังมีข้อมูลเพิ่มหรือไม่
    const hasMore = skip + jobs.length < total;

    // แปลงข้อมูลสำหรับ frontend
    const transformedJobs = jobs.map(job => {
      const dueDateObj = job.dueDate ? new Date(job.dueDate) : null;
      const isOverdue = dueDateObj && dueDateObj < todayStart &&
        !EXCLUDED_STATUSES.includes(job.status);
      const overdueDays = isOverdue
        ? Math.floor((todayStart - dueDateObj) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: job.id,
        djId: job.djId,
        subject: job.subject,
        status: job.status,
        priority: job.priority,
        deadline: job.dueDate,
        createdAt: job.createdAt,
        project: job.project?.name || null,
        jobType: job.jobType?.name || null,
        assignee: job.assignee
          ? (job.assignee.displayName || `${job.assignee.firstName || ''} ${job.assignee.lastName || ''}`.trim())
          : null,
        assigneeAvatar: job.assignee?.avatarUrl || null,
        requester: job.requester
          ? `${job.requester.firstName || ''} ${job.requester.lastName || ''}`.trim()
          : null,
        isOverdue,
        overdueDays
      };
    });

    res.json({
      success: true,
      data: {
        jobs: transformedJobs,
        total,
        page,
        limit,
        hasMore
      }
    });
  } catch (error) {
    console.error('[Jobs] Get dashboard jobs error:', error.message);
    res.status(500).json({ success: false, error: 'GET_DASHBOARD_JOBS_FAILED' });
  }
});


/**
 * POST /api/jobs
 * สร้างงานใหม่พร้อม Approval Flow V2 Logic
 * 
 * Logic Flow:
 * 1. Validate Input - ตรวจสอบข้อมูลที่จำเป็น
 * 2. Get Flow Assignment V2 - หา Template ที่ใช้กับ Project+JobType นี้
 * 3. Check Skip Approval - ถ้า Template มี totalLevels = 0 ให้ข้ามการอนุมัติ
 * 4. Create Job - สร้างงานพร้อม Status ที่เหมาะสม
 * 5. Auto-Assign (ถ้า Skip) - มอบหมายงานอัตโนมัติตาม Template Config
 * 6. Create Job Items - สร้างรายการงานย่อย (ถ้ามี)
 * 7. Send Notifications - แจ้งเตือนผู้ที่เกี่ยวข้อง
 * 
 * @body {number} projectId - รหัสโปรเจกต์ (Required)
 * @body {number} jobTypeId - รหัสประเภทงาน (Required)
 * @body {string} subject - หัวข้องาน (Required)
 * @body {string} dueDate - วันกำหนดส่ง ISO 8601 (Required)
 * @body {string} priority - ความเร่งด่วน: 'low' | 'normal' | 'urgent'
 * @body {string} objective - วัตถุประสงค์
 * @body {string} headline - หัวข้อหลัก
 * @body {string} subHeadline - หัวข้อรอง
 * @body {string} description - รายละเอียด
 * @body {number} assigneeId - ระบุผู้รับผิดชอบโดยตรง (ถ้าต้องการ)
 * @body {Array} items - รายการงานย่อย [{name, quantity, size}]
 * 
 * @returns {Object} - ข้อมูลงานที่สร้างพร้อม flowInfo
 */
router.post('/', async (req, res) => {
  try {
    const prisma = getDatabase();
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    // ============================================
    // Step 1: Validate Input - ตรวจสอบข้อมูลที่จำเป็น
    // ============================================
    const {
      projectId,
      jobTypeId,
      subject,
      dueDate,
      priority = 'normal',
      objective,
      headline,
      subHeadline,
      description,
      assigneeId,
      items = []
    } = req.body;

    // ตรวจสอบ Required Fields
    if (!projectId || !jobTypeId || !subject || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'กรุณาระบุ projectId, jobTypeId, subject และ dueDate'
      });
    }

    // ตรวจสอบว่า Project มีอยู่จริงและอยู่ใน Tenant เดียวกัน
    const project = await prisma.project.findFirst({
      where: { id: parseInt(projectId), tenantId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'PROJECT_NOT_FOUND',
        message: 'ไม่พบโปรเจกต์ที่ระบุ หรือไม่มีสิทธิ์เข้าถึง'
      });
    }

    // ตรวจสอบว่า JobType มีอยู่จริง
    const jobType = await prisma.jobType.findFirst({
      where: { id: parseInt(jobTypeId), tenantId }
    });

    if (!jobType) {
      return res.status(404).json({
        success: false,
        error: 'JOB_TYPE_NOT_FOUND',
        message: 'ไม่พบประเภทงานที่ระบุ'
      });
    }

    // ============================================
    // Step 2: Get Approval Flow (V1 Extended)
    // หา Flow ที่ใช้กับ Project+JobType นี้
    // Priority: Specific (Project+JobType) > Default (Project+NULL)
    // ============================================
    const flow = await approvalService.getApprovalFlow(projectId, jobTypeId, priority);

    // ============================================
    // Step 3: Check Skip Approval
    // ถ้า flow.skipApproval = true หมายถึงไม่ต้องผ่านการอนุมัติ
    // ============================================
    // ============================================
    // Step 3: Check Skip Approval
    // 🔥 NEW LOGIC: งานด่วนต้องผ่าน Approval เสมอ
    // ============================================
    let isSkip = false;

    if (priority.toLowerCase() === 'urgent') {
      // งานด่วน: บังคับให้ผ่าน Approval Flow
      isSkip = false;
      console.log('[Jobs] Urgent job detected → Force Approval Flow');
    } else {
      // งานปกติ: ใช้ skipApproval ตาม Template
      isSkip = approvalService.isSkipApproval(flow);
    }

    // ============================================
    // Step 3.1: Validate Skip Approval (ต้องมี Assignee)
    // ถ้า Skip = true ต้องตรวจสอบว่ามีคนรับผิดชอบหรือไม่
    // ============================================
    if (isSkip) {
      const validation = await approvalService.validateSkipApprovalJobCreation(
        projectId,
        jobTypeId,
        userId
      );

      if (!validation.canCreate) {
        return res.status(400).json({
          success: false,
          error: 'NO_ASSIGNEE_CONFIGURED',
          message: validation.message || 'ไม่สามารถสร้างงานได้ เนื่องจากยังไม่มีผู้รับผิดชอบ กรุณาตั้งค่าที่ Project → Job Assignments ก่อน'
        });
      }
    }

    // กำหนด Status เริ่มต้นตาม Skip Logic
    // - Skip = true → status = 'approved' (พร้อมมอบหมายงาน)
    // - Skip = false → status = 'pending_approval' (รอการอนุมัติ)
    let initialStatus = isSkip ? 'approved' : 'pending_approval';

    // ============================================
    // Step 4: Generate DJ ID
    // รูปแบบใหม่: DJ-YYMMDD-XXXX (เช่น DJ-260206-0001)
    // ============================================
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = `DJ-${yy}${mm}${dd}-`;

    const jobCount = await prisma.job.count({
      where: {
        tenantId,
        djId: { startsWith: datePrefix }
      }
    });
    const djId = `${datePrefix}${String(jobCount + 1).padStart(4, '0')}`;

    // ============================================
    // Step 4.5: Handle Acceptance Date & SLA Calculation
    // คำนวณวันรับงานและ Due Date จาก SLA
    // ============================================
    const jobAcceptanceService = require('../services/jobAcceptanceService');

    let acceptanceDate = req.body.acceptanceDate ? new Date(req.body.acceptanceDate) : null;
    let calculatedDueDate = new Date(dueDate);
    let acceptanceMethod = 'auto';
    let dueDateAdjustmentReasons = [];

    // ============================================
    // Step 4.6: Validate and Adjust Working Hours
    // ตรวจสอบและปรับ dueDate ให้อยู่ในเวลาทำการ
    // ============================================
    const dueDateValidation = workingHoursHelper.validateAndAdjustDueDate(dueDate);

    if (dueDateValidation.needsAdjustment) {
      dueDateAdjustmentReasons = dueDateValidation.reasons;
      console.log(`[Jobs] Due Date adjusted: ${workingHoursHelper.formatAdjustmentMessage(
        dueDateValidation.originalDate,
        dueDateValidation.adjustedDate,
        dueDateValidation.reasons
      )}`);
    }

    // ถ้ามีการระบุ Acceptance Date มา
    if (acceptanceDate) {
      acceptanceMethod = 'manual';

      // ปรับ acceptanceDate ให้อยู่ในเวลาทำการก่อน
      const acceptanceDateValidation = workingHoursHelper.validateAndAdjustDueDate(acceptanceDate);
      if (acceptanceDateValidation.needsAdjustment) {
        acceptanceDate = acceptanceDateValidation.adjustedDate;
        console.log(`[Jobs] Acceptance Date adjusted to working hours: ${acceptanceDate}`);
      }

      // คำนวณ Due Date ใหม่จาก Acceptance Date + SLA
      if (jobType.slaWorkingDays) {
        calculatedDueDate = jobAcceptanceService.calculateDueDate(
          acceptanceDate,
          jobType.slaWorkingDays
        );

        console.log(`[Jobs] Calculated Due Date from Acceptance Date: ${calculatedDueDate}`);
      }
    } else {
      // ถ้าไม่ระบุ Acceptance Date ให้ใช้วันที่สร้างงาน (ปรับแล้ว)
      acceptanceDate = dueDateValidation.adjustedDate;
      acceptanceMethod = 'auto';

      // คำนวณ Due Date จาก SLA
      if (jobType.slaWorkingDays) {
        calculatedDueDate = jobAcceptanceService.calculateDueDate(
          acceptanceDate,
          jobType.slaWorkingDays
        );
      } else {
        // ถ้าไม่มี SLA ให้ใช้ dueDate ที่ปรับแล้ว
        calculatedDueDate = dueDateValidation.adjustedDate;
      }
    }

    // ============================================
    // Step 5: Create Job (Transaction)
    // ใช้ Transaction เพื่อรับประกันความสมบูรณ์ของข้อมูล
    // ============================================
    const result = await prisma.$transaction(async (tx) => {
      // สร้างงานหลัก
      const newJob = await tx.job.create({
        data: {
          tenantId,
          projectId: parseInt(projectId),
          jobTypeId: parseInt(jobTypeId),
          djId,
          subject,
          status: initialStatus,
          priority,
          requesterId: userId,
          dueDate: calculatedDueDate,
          objective: objective || null,
          headline: headline || null,
          subHeadline: subHeadline || null,
          description: description || null,
          assigneeId: assigneeId ? parseInt(assigneeId) : null,
          // Job Acceptance fields
          acceptanceDate: acceptanceDate,
          acceptanceMethod: acceptanceMethod,
          originalDueDate: calculatedDueDate,
          slaDays: jobType.slaWorkingDays || 0
        }
      });

      // ============================================
      // Step 6: Create Job Items (ถ้ามี)
      // สร้างรายการงานย่อย เช่น ขนาดและจำนวนชิ้นงาน
      // ============================================
      if (items && items.length > 0) {
        await tx.designJobItem.createMany({
          data: items.map(item => ({
            jobId: newJob.id,
            jobTypeItemId: item.jobTypeItemId ? parseInt(item.jobTypeItemId) : null,
            name: item.name,
            quantity: item.quantity || 1,
            status: 'pending'
          }))
        });
      }

      // ============================================
      // Step 7: Auto-Assign Logic (ถ้า Skip Approval)
      // ถ้าไม่ต้องอนุมัติ และ Template กำหนดให้ Auto-Assign
      // ============================================
      let finalAssigneeId = assigneeId ? parseInt(assigneeId) : null;
      let autoAssigned = false;

      if (isSkip && !finalAssigneeId) {
        // เรียก Auto-Assign Service with Fallback:
        // 1. flow.autoAssignUserId
        // 2. project_job_assignments
        // 3. dept_manager ของ requester
        const assignResult = await approvalService.autoAssignJobWithFallback(
          newJob.id,
          flow,
          userId,
          parseInt(projectId),
          parseInt(jobTypeId)
        );

        if (assignResult.success && assignResult.assigneeId) {
          finalAssigneeId = assignResult.assigneeId;
          autoAssigned = true;

          // อัปเดตงานให้เป็น 'in_progress' พร้อมระบุผู้รับผิดชอบ
          await tx.job.update({
            where: { id: newJob.id },
            data: {
              status: 'in_progress',
              assigneeId: finalAssigneeId,
              // ถ้ามอบหมายแล้ว ถือว่าเริ่มงานทันที
              startedAt: new Date()
            }
          });

          // อัปเดต Status ใน result
          newJob.status = 'in_progress';
          newJob.assigneeId = finalAssigneeId;
        }
      }

      return {
        job: newJob,
        assigneeId: finalAssigneeId,
        autoAssigned
      };
    });

    // ============================================
    // Step 7.5: Auto-Approve if requester is approver at level 1
    // ถ้าผู้สร้างงานอยู่ใน Approval Flow level ปัจจุบัน → auto-approve เฉพาะ level นั้น
    // ============================================
    let autoApproveResult = null;
    if (!isSkip && result.job.status === 'pending_approval') {
      autoApproveResult = await approvalService.autoApproveIfRequesterIsApprover({
        jobId: result.job.id,
        requesterId: userId,
        projectId: parseInt(projectId),
        jobTypeId: parseInt(jobTypeId),
        tenantId,
        priority: priority
      });

      if (autoApproveResult.autoApproved) {
        result.job.status = autoApproveResult.newStatus;

        // ถ้า final approval (level เดียว) → auto-assign ด้วย
        if (autoApproveResult.isFinal && !result.assigneeId) {
          const assignResult = await approvalService.autoAssignJobWithFallback(
            result.job.id,
            flow,
            userId,
            parseInt(projectId),
            parseInt(jobTypeId)
          );

          if (assignResult.success && assignResult.assigneeId) {
            result.assigneeId = assignResult.assigneeId;
            result.autoAssigned = true;
            result.job.status = 'in_progress';
            result.job.assigneeId = assignResult.assigneeId;
          }
        }

        console.log(`[Jobs] Auto-approved job ${djId}: ${autoApproveResult.newStatus}`);
      }
    } else if (isSkip) {
      // ✅ FIX: Create implicit approval record for skipped approval flows
      // When approval flow is skipped, still create an approval record for audit trail
      try {
        const finalStatus = result.job.status; // Will be 'approved' or 'in_progress'

        await prisma.approval.create({
          data: {
            jobId: result.job.id,
            approverId: userId, // Requester implicitly approves
            stepNumber: 1,
            status: 'approved',
            approvedAt: new Date(),
            comment: result.autoAssigned
              ? `Auto-approved & auto-assigned: Skipped approval flow with auto-assignment`
              : `Auto-approved: Skipped approval flow (awaiting assignee)`,
            tenantId
          }
        });

        console.log(`[Jobs] Created implicit approval for ${djId} (skip approval, status: ${finalStatus})`);
      } catch (approvalErr) {
        console.warn(`[Jobs] Failed to create approval record for ${djId}:`, approvalErr.message);
        // Don't fail the whole operation if approval record creation fails
      }
    }

    // ============================================
    // Step 8: Create Activity Log
    // บันทึกประวัติการสร้างงาน
    // ============================================
    try {
      const logMessage = autoApproveResult?.autoApproved
        ? `สร้างงาน ${djId} (Auto-Approved Level 1)`
        : isSkip
          ? `สร้างงาน ${djId} (Skip Approval)`
          : `สร้างงาน ${djId} รอการอนุมัติ`;

      await prisma.activityLog.create({
        data: {
          jobId: result.job.id,
          userId,
          action: 'job_created',
          message: logMessage,
          detail: {
            isSkip,
            flowName: flow?.name || 'Default',
            skipApproval: flow?.skipApproval || false,
            autoAssignType: flow?.autoAssignType || 'manual',
            autoAssigned: result.autoAssigned,
            autoApproved: autoApproveResult?.autoApproved || false
          }
        }
      });

      // บันทึก activity log สำหรับการปรับ dueDate (ถ้ามี)
      if (dueDateAdjustmentReasons.length > 0) {
        const adjustmentMessage = workingHoursHelper.formatAdjustmentMessage(
          dueDateValidation.originalDate,
          dueDateValidation.adjustedDate,
          dueDateAdjustmentReasons
        );

        await prisma.activityLog.create({
          data: {
            jobId: result.job.id,
            userId,
            action: 'due_date_adjusted',
            message: adjustmentMessage,
            detail: {
              originalDueDate: dueDateValidation.originalDate,
              adjustedDueDate: dueDateValidation.adjustedDate,
              reasons: dueDateAdjustmentReasons,
              validation: dueDateValidation.validation
            }
          }
        });
      }
    } catch (logError) {
      // ถ้า Log ไม่สำเร็จไม่ต้องหยุดการทำงาน
      console.warn('[Jobs] Activity log failed:', logError.message);
    }

    // ============================================
    // Step 9: Send Notifications
    // - pending_approval → แจ้ง Approver Level 1
    // - in_progress/approved → แจ้ง Assignee
    // ============================================
    try {
      const emailService = new EmailService();
      const jobStatus = result.job.status;
      const jobLink = `/jobs/${result.job.id}`;

      if (['pending_approval', 'pending_level_1'].includes(jobStatus)) {
        // แจ้ง Approver Level 1
        const level1ApproverIds = [];
        if (flow?.approverSteps && Array.isArray(flow.approverSteps) && flow.approverSteps.length > 0) {
          const step1 = flow.approverSteps.find(s => (s.stepNumber || s.level) === 1) || flow.approverSteps[0];
          if (step1?.approvers && Array.isArray(step1.approvers)) {
            step1.approvers.forEach(a => {
              const aid = a.id || a.userId;
              if (aid) level1ApproverIds.push(aid);
            });
          }
        }

        for (const approverId of level1ApproverIds) {
          await notificationService.createNotification({
            tenantId,
            userId: approverId,
            type: 'job_pending_approval',
            title: `📋 งานใหม่รออนุมัติ: ${djId}`,
            message: `งาน "${subject}" รอการอนุมัติจากคุณ`,
            link: jobLink
          }).catch(err => console.warn('[Jobs] Noti to approver failed:', err.message));
        }

        // Email Approver(s) with Magic Link
        if (level1ApproverIds.length > 0) {
          const approvers = await prisma.user.findMany({
            where: { id: { in: level1ApproverIds } },
            select: { id: true, email: true, firstName: true, lastName: true }
          });
          await Promise.allSettled(
            approvers.filter(a => a.email).map(async (a) => {
              const magicLink = await magicLinkService.createJobActionLink({
                userId: a.id,
                jobId: result.job.id,
                action: 'approve',
                djId: djId
              });
              const emailHtml = createJobApprovalEmail({
                djId,
                subject,
                priority,
                magicLink,
                approverName: `${a.firstName} ${a.lastName}`
              });
              return emailService.sendEmail(a.email, `📋 งานใหม่รออนุมัติ: ${djId}`, emailHtml)
                .catch(err => console.warn('[Jobs] Email to approver failed:', err.message));
            })
          );
        }
      } else if (result.assigneeId && ['in_progress', 'approved', 'assigned'].includes(jobStatus)) {
        // แจ้ง Assignee
        await notificationService.createNotification({
          tenantId,
          userId: result.assigneeId,
          type: 'job_assigned',
          title: `👤 คุณได้รับมอบหมายงาน: ${djId}`,
          message: `งาน "${subject}" ถูกมอบหมายให้คุณ${result.autoAssigned ? ' (อัตโนมัติ)' : ''}`,
          link: jobLink
        }).catch(err => console.warn('[Jobs] Noti to assignee failed:', err.message));

        // Email Assignee with Magic Link
        const assignee = await prisma.user.findUnique({
          where: { id: result.assigneeId },
          select: { email: true, firstName: true, lastName: true }
        });
        if (assignee?.email) {
          const magicLink = await magicLinkService.createJobActionLink({
            userId: result.assigneeId,
            jobId: result.job.id,
            action: 'view',
            djId: djId
          });
          const emailHtml = createJobAssignmentEmail({
            djId,
            subject,
            priority,
            dueDate: result.job.dueDate ? new Date(result.job.dueDate).toLocaleDateString('th-TH') : null,
            magicLink,
            assigneeName: `${assignee.firstName} ${assignee.lastName}`
          });
          await emailService.sendEmail(assignee.email, `👤 คุณได้รับมอบหมายงาน: ${djId}`, emailHtml)
            .catch(err => console.warn('[Jobs] Email to assignee failed:', err.message));
        }
      }
    } catch (notiError) {
      console.warn('[Jobs] Job created notification failed (non-blocking):', notiError.message);
    }

    // ============================================
    // Step 10: Return Response
    // ส่งข้อมูลงานที่สร้างกลับไปพร้อม Flow Info
    // ============================================
    console.log(`[Jobs] Created job ${djId} with status: ${result.job.status}, skip: ${isSkip}, autoAssigned: ${result.autoAssigned}, autoApproved: ${autoApproveResult?.autoApproved || false}`);

    res.status(201).json({
      success: true,
      data: {
        id: result.job.id,
        djId: result.job.djId,
        subject: result.job.subject,
        status: result.job.status,
        priority: result.job.priority,
        projectId: result.job.projectId,
        jobTypeId: result.job.jobTypeId,
        requesterId: result.job.requesterId,
        assigneeId: result.assigneeId,
        dueDate: result.job.dueDate,
        createdAt: result.job.createdAt,
        // Flow Info - ข้อมูลเกี่ยวกับ Approval Flow ที่ใช้
        flowInfo: {
          templateName: assignment?.template?.name || 'Default (No Template)',
          isSkipped: isSkip,
          autoApproved: autoApproveResult?.autoApproved || false,
          autoAssigned: result.autoAssigned
        }
      }
    });

  } catch (error) {
    console.error('[Jobs] Create job error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_JOB_FAILED',
      message: 'ไม่สามารถสร้างงานได้ กรุณาลองใหม่อีกครั้ง',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/jobs/:id
 * ดึงรายละเอียดงานเดี่ยว
 *
 * @param {number} id - Job ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getDatabase();
    const jobId = parseInt(id);

    if (isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JOB_ID',
        message: 'Job ID ไม่ถูกต้อง'
      });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        project: {
          select: { id: true, name: true, code: true }
        },
        jobType: {
          select: {
            id: true, name: true, icon: true, colorTheme: true, slaWorkingDays: true,
            jobTypeItems: { select: { id: true, name: true, defaultSize: true } }
          }
        },
        requester: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true, email: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true, email: true }
        },
        completedByUser: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true, email: true }
        },
        jobItems: {
          select: {
            id: true, name: true, quantity: true, status: true,
            jobTypeItem: { select: { defaultSize: true } }
          },
          take: 100  // ⚡ Performance: Limit to 100 items
        },
        attachments: {
          select: { id: true, filePath: true, fileName: true, fileSize: true, createdAt: true },
          take: 50  // ⚡ Performance: Limit to 50 attachments
        },
        // Include comments for discussion thread
        comments: {
          select: {
            id: true,
            comment: true,
            createdAt: true,
            user: {
              select: { id: true, displayName: true, firstName: true, lastName: true, avatarUrl: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50  // ⚡ Performance: Limit to recent 50 comments
        },
        // Include activities for history log
        // Include activities for history log
        // jobActivities: { ... } // Legacy unused
        activityLogs: {
          select: {
            id: true,
            action: true,
            message: true,
            detail: true,
            createdAt: true,
            user: {
              select: { id: true, displayName: true, firstName: true, lastName: true, avatarUrl: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50 // Limit to recent 50 activities
        },
        // 🆕 Include approvals with approver details
        approvals: {
          select: {
            id: true,
            stepNumber: true,
            status: true,
            comment: true,
            approvedAt: true,
            approver: {
              select: {
                id: true,
                displayName: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: { stepNumber: 'asc' }
        },
        // Include child jobs if this is a parent job
        childJobs: {
          select: {
            id: true,
            djId: true,
            subject: true,
            status: true,
            jobType: { select: { id: true, name: true } },
            assignee: { select: { id: true, firstName: true, lastName: true, displayName: true } },
            dueDate: true,
            jobItems: {
              select: {
                id: true, name: true, quantity: true, status: true,
                jobTypeItem: { select: { defaultSize: true } }
              }
            } // ✅ NEW: ดึง items ของงานย่อยมาด้วย
          },
          where: { isParent: false },  // ⚡ Performance: Only non-parent children
          orderBy: { createdAt: 'asc' },
          take: 100  // ⚡ Performance: Limit to 100 children
        },
        // Include parent job if this is a child job
        parentJob: {
          select: {
            id: true,
            djId: true,
            subject: true,
            status: true
          }
        },
        // Include pending rejection request
        rejectionRequests: {
          where: { status: 'pending' },
          select: {
            id: true,
            reason: true,
            status: true,
            autoCloseAt: true,
            autoCloseEnabled: true,
            createdAt: true,
            requester: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true
              }
            }
          },
          take: 1
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'ไม่พบงานนี้'
      });
    }

    // ตรวจสอบสิทธิ์การเข้าถึง (Permission Check)
    // รองรับทั้ง V1 (user.roles array) และ V2 (user.roleName string) auth formats
    // และรองรับ case ทั้ง 'admin' และ 'Admin' จาก token ทั้ง V1 และ V2
    const normalizedRoles = [];
    if (Array.isArray(req.user.roles)) {
      normalizedRoles.push(...req.user.roles.map(r => r?.toLowerCase() || ''));
    }
    if (req.user.roleName) {
      normalizedRoles.push(req.user.roleName.toLowerCase());
    }

    const hasAccess = job.requesterId === req.user.userId ||
      job.assigneeId === req.user.userId ||
      normalizedRoles.includes('admin') ||
      normalizedRoles.includes('manager') ||
      normalizedRoles.includes('approver');  // ✅ Allow approvers to view jobs

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ดูงานนี้'
      });
    }

    // ดึงข้อมูล ApprovalFlow สำหรับ render UI (หลังจาก Permission Check)
    // ห่อด้วย try-catch เพื่อป้องกัน timeout ไม่ให้กระทบ response หลัก
    let approvalFlow = null;
    try {
      approvalFlow = await approvalService.getApprovalFlow(job.projectId, job.jobTypeId);
    } catch (flowErr) {
      console.warn('[Jobs] getApprovalFlow warning (non-blocking):', flowErr.message);
    }

    // Transform to frontend format
    const transformed = {
      id: job.id,
      djId: job.djId,
      subject: job.subject,
      status: job.status,
      priority: job.priority,
      objective: job.objective,
      description: job.description,
      headline: job.headline,
      subHeadline: job.subHeadline,
      briefLink: job.briefLink,
      briefFiles: job.briefFiles || [],
      jobTypeId: job.jobTypeId,
      jobType: job.jobType?.name,
      slaWorkingDays: job.jobType?.slaWorkingDays,
      projectId: job.projectId,
      project: job.project?.name,
      projectCode: job.project?.code,
      deadline: job.dueDate,
      createdAt: job.createdAt,
      requesterId: job.requesterId,
      requester: {
        id: job.requester?.id,
        name: `${job.requester?.firstName || ''} ${job.requester?.lastName || ''}`.trim(),
        email: job.requester?.email,
        avatar: job.requester?.avatarUrl
      },
      assigneeId: job.assigneeId,
      assignee: job.assignee ? {
        id: job.assignee.id,
        name: `${job.assignee.firstName || ''} ${job.assignee.lastName || ''}`.trim(),
        email: job.assignee.email,
        avatar: job.assignee.avatarUrl
      } : null,
      isParent: job.isParent,
      parentJobId: job.parentJobId,
      // Child jobs for parent
      childJobs: job.childJobs?.map(child => ({
        id: child.id,
        djId: child.djId,
        subject: child.subject,
        status: child.status,
        jobType: child.jobType?.name,
        assignee: child.assignee ? (child.assignee.displayName || `${child.assignee.firstName || ''} ${child.assignee.lastName || ''}`.trim()) : null,
        deadline: child.dueDate,
        items: (child.jobItems || []).map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          status: item.status,
          defaultSize: item.jobTypeItem?.defaultSize || null
        })) // ✅ NEW: Pass items for UI with defaultSize
      })) || [],
      // Parent job for child
      parentJob: job.parentJob ? {
        id: job.parentJob.id,
        djId: job.parentJob.djId,
        subject: job.parentJob.subject,
        status: job.parentJob.status
      } : null,
      items: (job.jobItems || []).map(item => {
        // ดึง defaultSize จาก jobTypeItem (ถ้ามี link ตรง)
        let defaultSize = item.jobTypeItem?.defaultSize || null;

        // Fallback: ถ้าไม่มี jobTypeItemId (งานเก่า) ให้ match ชื่อจาก jobType.jobTypeItems
        if (!defaultSize && job.jobType?.jobTypeItems) {
          const matched = job.jobType.jobTypeItems.find(jti => jti.name === item.name);
          if (matched) {
            defaultSize = matched.defaultSize || null;
          }
        }

        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          status: item.status,
          defaultSize
        };
      }),
      attachments: job.attachments || [],

      // Draft Review Details
      draftFiles: job.draftFiles || [],
      draftSubmittedAt: job.draftSubmittedAt,
      draftCount: job.draftCount || 0,

      // Rebrief Details
      rebriefReason: job.rebriefReason,
      rebriefResponse: job.rebriefResponse,
      rebriefCount: job.rebriefCount || 0,
      rebriefAt: job.rebriefAt,

      // Completion Details
      completedAt: job.completedAt,
      finalFiles: job.finalFiles,
      completedByUser: job.completedByUser ? {
        id: job.completedByUser.id,
        name: `${job.completedByUser.firstName || ''} ${job.completedByUser.lastName || ''}`.trim(),
        email: job.completedByUser.email,
        avatar: job.completedByUser.avatarUrl
      } : null,

      // Rejection Details (Assignee Rejection Workflow)
      rejectionComment: job.rejectionComment,
      rejectionSource: job.rejectionSource,
      rejectedBy: job.rejectedBy,
      rejectionDeniedAt: job.rejectionDeniedAt,
      rejectionDeniedBy: job.rejectionDeniedBy,

      // Comments for discussion thread
      comments: job.comments?.map(c => ({
        id: c.id,
        comment: c.comment,
        createdAt: c.createdAt,
        user: {
          id: c.user?.id,
          name: `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim(),
          avatar: c.user?.avatarUrl
        }
      })) || [],

      // NEW: Pending Rejection Request for Approver Action
      rejectionRequest: job.rejectionRequests && job.rejectionRequests.length > 0 ? {
        id: job.rejectionRequests[0].id,
        reason: job.rejectionRequests[0].reason,
        status: job.rejectionRequests[0].status,
        autoCloseAt: job.rejectionRequests[0].autoCloseAt,
        autoCloseEnabled: job.rejectionRequests[0].autoCloseEnabled,
        createdAt: job.rejectionRequests[0].createdAt,
        requester: job.rejectionRequests[0].requester ? {
          id: job.rejectionRequests[0].requester.id,
          name: job.rejectionRequests[0].requester.displayName || `${job.rejectionRequests[0].requester.firstName || ''} ${job.rejectionRequests[0].requester.lastName || ''}`.trim()
        } : null
      } : null,

      // Activities for history log (using ActivityLog model)
      activities: job.activityLogs?.map(a => ({
        id: a.id,
        action: a.action,
        message: a.message,
        detail: a.detail,
        createdAt: a.createdAt,
        user: a.user ? {
          id: a.user.id,
          name: `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim(),
          avatar: a.user.avatarUrl
        } : null
      })) || [],
      // Transform approvals with approver details
      approvals: job.approvals?.map(a => ({
        id: a.id,
        stepNumber: a.stepNumber,
        status: a.status,
        comment: a.comment,
        approvedAt: a.approvedAt,
        approver: {
          id: a.approver.id,
          name: `${a.approver.firstName || ''} ${a.approver.lastName || ''}`.trim(),
          email: a.approver.email,
          avatar: a.approver.avatarUrl
        }
      })) || [],
      // flowSnapshot: ข้อมูล ApprovalFlow template สำหรับ render UI
      // Frontend ใช้ค่านี้เพื่อแสดง Timeline ของ Approval Flow
      // หมายเหตุ: ApprovalFlow model เก็บขั้นตอนการอนุมัติใน field `approverSteps` (ชื่อใน DB)
      // แต่ Frontend component (JobApprovalFlow.jsx) รับข้อมูลในรูปแบบ `levels` (ชื่อที่ Front ใช้)
      // ดังนั้นต้อง map approverSteps → levels ตรงนี้
      flowSnapshot: approvalFlow ? {
        levels: Array.isArray(approvalFlow.approverSteps) ? approvalFlow.approverSteps : [],
        skipApproval: approvalFlow.skipApproval || false,
        defaultAssignee: approvalFlow.autoAssignUser || null
      } : null
    };

    // 🔍 Debug: Log rejection details if status is assignee_rejected
    if (job.status === 'assignee_rejected') {
      console.log('[Jobs GET/:id] 🔍 Assignee Rejection Debug:', {
        jobId: job.id,
        djId: job.djId,
        status: job.status,
        rejectionComment: job.rejectionComment,
        rejectionCommentLength: job.rejectionComment?.length,
        rejectionSource: job.rejectionSource,
        rejectedBy: job.rejectedBy,
        transformed_rejectionComment: transformed.rejectionComment
      });
    }

    res.json({
      success: true,
      data: transformed
    });


  } catch (error) {
    console.error('[Jobs] Get job by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_JOB_FAILED',
      message: 'ไม่สามารถดึงข้อมูลงานได้'
    });
  }
});


/**
 * POST /api/jobs/:id/approve
 * อนุมัติงาน (Web Action)
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    const result = await approvalService.approveJobViaWeb({
      jobId: parseInt(id),
      approverId: userId,
      comment,
      ipAddress
    });

    // ✅ NEW: Handle Urgent Job Rescheduling - Trigger เมื่ออนุมัติครบทุก level
    if (result.success) {
      try {
        const prisma = getDatabase();
        const jobId = parseInt(id);

        // Get job details
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            djId: true,
            priority: true,
            assigneeId: true,
            dueDate: true,
            status: true,
            tenantId: true
          }
        });

        // If urgent job, check if final approval and reschedule
        if (job && job.priority === 'urgent' && job.assigneeId && job.dueDate) {
          // ตรวจสอบว่าผ่านการอนุมัติครบหรือไม่
          const approvalRecords = await prisma.approval.findMany({
            where: { jobId: job.id },
            orderBy: { level: 'asc' }
          });

          // ถ้ามี approval records และ level สุดท้ายอนุมัติแล้ว
          const isFinalApproved = approvalRecords.length > 0 &&
            approvalRecords.every(a => a.status === 'approved');

          // หรือถ้าเป็นงานที่ skip approval (status = 'assigned' หรือ 'approved' โดยตรง)
          const isSkipApproval = ['assigned', 'approved'].includes(job.status) &&
            approvalRecords.length === 0;

          if (isFinalApproved || isSkipApproval) {
            console.log(`[Jobs] 🚨 Urgent job ${job.djId} passed final approval - triggering reschedule`);

            const rescheduleResult = await chainService.rescheduleForUrgent(job, prisma);

            if (rescheduleResult.rescheduled > 0) {
              console.log(
                `[Jobs] ✅ Urgent Job Rescheduled: ${rescheduleResult.rescheduled} jobs extended +${rescheduleResult.shiftDays} working days`,
                { affected: rescheduleResult.affected.map(a => a.djId) }
              );

              // Append reschedule info to result
              result.rescheduled = rescheduleResult;
            } else {
              console.log(`[Jobs] ℹ️  No jobs to reschedule for urgent job ${job.djId}`);
            }
          } else {
            console.log(`[Jobs] ⏸️  Urgent job ${job.djId} not yet final approved - skip reschedule`);
          }
        }
      } catch (rescheduleError) {
        console.warn('[Jobs] Urgent Reschedule Warning (non-blocking):', rescheduleError);
        // Don't fail approval, just log warning
      }
    }

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Jobs] Approve error:', error);
    res.status(500).json({
      success: false,
      error: 'APPROVE_FAILED',
      message: 'ไม่สามารถอนุมัติงานได้'
    });
  }
});

/**
 * POST /api/jobs/:id/reject
 * ปฏิเสธงาน (Web Action)
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const prisma = getDatabase();

    const result = await approvalService.rejectJobViaWeb({
      jobId: parseInt(id),
      approverId: userId,
      comment,
      ipAddress
    });

    // ✅ NEW: Cancel chained/child jobs when job is rejected
    if (result.success) {
      try {
        // Get job details to check for chains/children
        const job = await prisma.job.findUnique({
          where: { id: parseInt(id) },
          select: {
            djId: true,
            isParent: true,
            nextJobId: true
          }
        });

        let cancelledJobIds = [];

        if (job) {
          if (job.isParent) {
            // Cancel all child jobs
            cancelledJobIds = await jobChainService.cancelChildJobs(
              parseInt(id),
              tenantId,
              `Parent job (${job.djId}) rejected by approver`,
              userId
            );
            console.log(`[Jobs] Cancelled ${cancelledJobIds.length} child jobs after parent rejection`);
          } else if (job.nextJobId) {
            // Cancel downstream chain
            cancelledJobIds = await jobChainService.cancelChainedJobs(
              parseInt(id),
              tenantId,
              `Previous job (${job.djId}) rejected by approver`,
              userId
            );
            console.log(`[Jobs] Cancelled ${cancelledJobIds.length} downstream jobs in chain`);
          }

          // Add cancelled jobs info to result
          if (cancelledJobIds.length > 0) {
            result.cancelledJobs = cancelledJobIds.length;
          }
        }
      } catch (chainErr) {
        console.error('[Jobs] Chain cancellation warning (non-blocking):', chainErr);
        // Don't fail the rejection if chain cancellation fails
      }

      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Jobs] Reject error:', error);
    res.status(500).json({
      success: false,
      error: 'REJECT_FAILED',
      message: 'ไม่สามารถปฏิเสธงานได้'
    });
  }
});

/**
 * POST /api/jobs/:id/reject-by-assignee
 * Assignee ปฏิเสธงาน - ส่งกลับให้ Approver คนสุดท้ายพิจารณา
 */
router.post('/:id/reject-by-assignee', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;

    const result = await approvalService.rejectJobByAssignee({
      jobId: parseInt(id),
      assigneeId: userId,
      comment
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Jobs] Reject by assignee error:', error);
    res.status(500).json({
      success: false,
      error: 'REJECT_BY_ASSIGNEE_FAILED',
      message: 'ไม่สามารถปฏิเสธงานได้'
    });
  }
});

/**
 * POST /api/jobs/:id/confirm-assignee-rejection
 * Approver ยืนยันการปฏิเสธของ Assignee → งานเปลี่ยนเป็น rejected แจ้ง Requester + CC emails
 *
 * Body: {
 *   comment?: string,
 *   ccEmails?: string[] // Optional CC email list
 * }
 */
router.post('/:id/confirm-assignee-rejection', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, ccEmails } = req.body;
    const userId = req.user.userId;

    const result = await approvalService.confirmAssigneeRejection({
      jobId: parseInt(id),
      approverId: userId,
      comment,
      ccEmails: ccEmails || []
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Jobs] Confirm assignee rejection error:', error);
    res.status(500).json({
      success: false,
      error: 'CONFIRM_REJECTION_FAILED',
      message: 'ไม่สามารถยืนยันการปฏิเสธได้'
    });
  }
});

/**
 * POST /api/jobs/:id/deny-assignee-rejection
 * Approver ไม่อนุมัติการปฏิเสธ → สั่งให้ Assignee ทำงานต่อ + แนะนำให้ Extend
 *
 * Body: {
 *   reason: string // Required - เหตุผลที่ไม่อนุมัติการปฏิเสธ
 * }
 */
router.post('/:id/deny-assignee-rejection', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'REASON_REQUIRED',
        message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติการปฏิเสธ'
      });
    }

    const result = await approvalService.denyAssigneeRejection({
      jobId: parseInt(id),
      approverId: userId,
      reason: reason.trim()
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Jobs] Deny assignee rejection error:', error);
    res.status(500).json({
      success: false,
      error: 'DENY_REJECTION_FAILED',
      message: 'ไม่สามารถปฏิเสธคำขอยกเลิกได้'
    });
  }
});

/**
 * POST /api/jobs/:id/request-rejection
 * Assignee ขอปฏิเสธงาน - สร้าง rejection_request รอ Approver อนุมัติ
 *
 * ระบบใหม่: ใช้ rejection_requests table พร้อม auto-close timeout (24h)
 * - Assignee ส่งคำขอปฏิเสธพร้อมเหตุผล
 * - Approver จะได้รับการแจ้งเตือน
 * - ถ้า Approver ไม่ตอบกลับภายใน 24h → auto-approve
 *
 * @body {string} reason - เหตุผลในการขอปฏิเสธ (Required)
 */
router.post('/:id/request-rejection', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const prisma = getDatabase();

    // Validation
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'REASON_REQUIRED',
        message: 'กรุณาระบุเหตุผลในการขอปฏิเสธงาน'
      });
    }

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: parseInt(id), tenantId },
      select: {
        id: true,
        djId: true,
        subject: true,
        status: true,
        assigneeId: true,
        projectId: true,
        jobTypeId: true,
        requesterId: true,
        priority: true,
        flowSnapshot: true,
        assignee: {
          select: { id: true, firstName: true, lastName: true }
        },
        approvals: {
          where: { status: 'approved' },
          select: { id: true, approverId: true, stepNumber: true },
          orderBy: { stepNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'ไม่พบงานที่ระบุ'
      });
    }

    // Check if user is the assignee
    if (job.assigneeId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่ได้เป็นผู้รับผิดชอบงานนี้'
      });
    }

    // Check if job can be rejected
    const validStatuses = ['in_progress', 'assigned', 'rework'];
    if (!validStatuses.includes(job.status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `ไม่สามารถขอปฏิเสธงานในสถานะ ${job.status} ได้`
      });
    }

    // Check if there's already a pending rejection request
    const existingRequest = await prisma.rejectionRequest.findFirst({
      where: {
        jobId: parseInt(id),
        status: 'pending',
        tenantId
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'REJECTION_REQUEST_EXISTS',
        message: 'มีคำขอปฏิเสธงานนี้อยู่แล้ว กรุณารอการพิจารณา'
      });
    }

    // หาผู้อนุมัติสำหรับ rejection request:
    // ใช้คนที่อนุมัติงานล่าสุด (stepNumber สูงสุด) ก่อน endprocess/assign
    let approverIds = [];
    let approverLevel = null;
    let approvalLogic = 'ANY';

    // Step 1: ลองหาจาก Approval record จริง (คนที่อนุมัติงานล่าสุด)
    if (job.approvals && job.approvals.length > 0) {
      const lastApproval = job.approvals[0]; // ถูก order by stepNumber desc แล้ว
      approverIds = [lastApproval.approverId];
      approverLevel = lastApproval.stepNumber;
      console.log(`[Jobs] Rejection approver from approval record: userId=${lastApproval.approverId}, step=${lastApproval.stepNumber}`);
    }

    // Step 2: ถ้าไม่มี Approval record → หาจาก flowSnapshot (Level สูงสุดก่อน endprocess)
    if (approverIds.length === 0 && job.flowSnapshot?.levels && job.flowSnapshot.levels.length > 0) {
      try {
        const sortedLevels = [...job.flowSnapshot.levels].sort((a, b) => (b.level || b.stepNumber || 0) - (a.level || a.stepNumber || 0));
        const lastLevel = sortedLevels[0];
        if (lastLevel.approvers && lastLevel.approvers.length > 0) {
          approverIds = lastLevel.approvers.map(a => a.id || a.userId).filter(Boolean);
          approverLevel = lastLevel.level || lastLevel.stepNumber || null;
          console.log(`[Jobs] Rejection approver from flowSnapshot level ${approverLevel}: ${approverIds}`);
        }
      } catch (snapErr) {
        console.warn('[Jobs] Could not parse flowSnapshot for rejection request:', snapErr);
      }
    }

    // Step 3: ถ้ายังไม่มี → ดึงจาก Approval Flow template (Level สูงสุด)
    if (approverIds.length === 0) {
      try {
        const approvalFlow = await approvalService.getApprovalFlow(job.projectId, job.jobTypeId, job.priority);
        if (approvalFlow && approvalFlow.approverSteps && approvalFlow.approverSteps.length > 0) {
          const sortedSteps = [...approvalFlow.approverSteps].sort((a, b) => (b.stepNumber || 0) - (a.stepNumber || 0));
          const lastStep = sortedSteps[0];
          if (lastStep.approvers && Array.isArray(lastStep.approvers)) {
            approverIds = lastStep.approvers.map(a => a.id || a.userId).filter(Boolean);
            approverLevel = lastStep.stepNumber || null;
            console.log(`[Jobs] Rejection approver from flow template step ${approverLevel}: ${approverIds}`);
          }
        }
      } catch (flowErr) {
        console.warn('[Jobs] Could not get approval flow for rejection request:', flowErr);
      }
    }

    // Fallback: ถ้าไม่มีอะไรเลย → ใช้ requesterId
    if (approverIds.length === 0) {
      approverIds = [job.requesterId];
      approvalLogic = 'ANY';
      console.warn(`[Jobs] Rejection approver fallback to requesterId=${job.requesterId}`);
    }

    // Calculate auto-close time: 1 วันทำงาน (ข้ามเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์)
    const autoCloseAt = await calculateNextWorkingDay(new Date(), tenantId);

    // Create rejection request
    const rejectionRequest = await prisma.rejectionRequest.create({
      data: {
        jobId: parseInt(id),
        requestedBy: userId,
        reason: reason.trim(),
        status: 'pending',
        approverLevel,
        approverIds,
        approvalLogic,
        autoCloseAt,
        autoCloseEnabled: true,
        tenantId
      }
    });

    // Update job status to pending_rejection
    await prisma.job.update({
      where: { id: parseInt(id) },
      data: { status: 'pending_rejection' }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        jobId: parseInt(id),
        userId,
        action: 'rejection_requested',
        message: 'Assignee ขอปฏิเสธงาน',
        detail: {
          reason: reason.trim(),
          rejectionRequestId: rejectionRequest.id,
          autoCloseAt: autoCloseAt.toISOString()
        }
      }
    }).catch(err => console.error('[Jobs] Failed to log activity:', err));

    // Notify Approver(s)
    try {
      for (const approverId of approverIds) {
        await notificationService.createNotification({
          tenantId,
          userId: approverId,
          type: 'rejection_requested',
          title: `⚠️ Assignee ขอปฏิเสธงาน: ${job.djId}`,
          message: `ผู้รับงานขอปฏิเสธงาน "${job.subject || ''}" เหตุผล: ${reason.trim()}`,
          link: `/jobs/${id}`
        }).catch(err => console.warn('[RequestRejection] Noti failed:', err.message));
      }

      // Email Approver(s) with Magic Link
      const approverUsers = await prisma.user.findMany({
        where: { id: { in: approverIds } },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      const emailService = new EmailService();
      await Promise.allSettled(
        approverUsers.filter(a => a.email).map(async (a) => {
          const magicLink = await magicLinkService.createJobActionLink({
            userId: a.id,
            jobId: Number(id),
            action: 'view',
            djId: job.djId
          });
          const emailHtml = createRejectionRequestEmail({
            djId: job.djId,
            subject: job.subject || '',
            assigneeName: `${job.assignee?.firstName || 'ผู้รับงาน'} ${job.assignee?.lastName || ''}`,
            reason: reason.trim(),
            magicLink,
            approverName: `${a.firstName} ${a.lastName}`
          });
          return emailService.sendEmail(a.email, `⚠️ Assignee ขอปฏิเสธงาน: ${job.djId}`, emailHtml)
            .catch(err => console.warn('[RequestRejection] Email failed:', err.message));
        })
      );
    } catch (notiErr) {
      console.warn('[RequestRejection] Notification failed (non-blocking):', notiErr.message);
    }

    res.json({
      success: true,
      message: 'ส่งคำขอปฏิเสธงานเรียบร้อย รอการพิจารณา',
      data: {
        rejectionRequestId: rejectionRequest.id,
        status: 'pending',
        autoCloseAt: autoCloseAt.toISOString()
      }
    });

  } catch (error) {
    console.error('[Jobs] Request rejection error:', error.message);
    console.error('[Jobs] Request rejection stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    res.status(500).json({
      success: false,
      error: 'REQUEST_REJECTION_FAILED',
      message: 'ไม่สามารถส่งคำขอปฏิเสธงานได้',
      debug: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

/**
 * POST /api/rejection-requests/:id/approve
 * Approver อนุมัติคำขอปฏิเสธจาก Assignee
 *
 * - อัปเดตสถานะ rejection_request เป็น 'approved'
 * - เปลี่ยนสถานะงานเป็น 'rejected_by_assignee'
 * - ยกเลิกงานที่เชื่อมโยง (chain/children)
 *
 * @body {string} comment - ความเห็นจาก Approver (Optional)
 */
router.post('/rejection-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const prisma = getDatabase();

    // Get rejection request
    const rejectionRequest = await prisma.rejectionRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        job: {
          select: {
            id: true,
            djId: true,
            status: true,
            isParent: true,
            nextJobId: true,
            parentJobId: true
          }
        }
      }
    });

    if (!rejectionRequest) {
      return res.status(404).json({
        success: false,
        error: 'REQUEST_NOT_FOUND',
        message: 'ไม่พบคำขอปฏิเสธที่ระบุ'
      });
    }

    // Check tenant
    if (rejectionRequest.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์เข้าถึงคำขอนี้'
      });
    }

    // Check if user is in approver list
    let approvers = rejectionRequest.approverIds;
    if (typeof approvers === 'string') {
      try {
        approvers = JSON.parse(approvers);
      } catch (e) {
        approvers = [];
      }
    }
    if (!Array.isArray(approvers)) {
      approvers = [];
    }

    // แปลง userId และ approver id ให้เป็น string เพื่อเทียบอย่างปลอดภัย
    const isApprover = approvers.some(id => String(id) === String(userId));

    if (!isApprover) {
      return res.status(403).json({
        success: false,
        error: 'NOT_APPROVER',
        message: 'คุณไม่ใช่ผู้อนุมัติสำหรับคำขอนี้'
      });
    }

    // Check if request is still pending
    if (rejectionRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'REQUEST_ALREADY_PROCESSED',
        message: `คำขอนี้ถูกดำเนินการแล้ว (${rejectionRequest.status})`
      });
    }

    // Update rejection request to approved
    await prisma.rejectionRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date()
      }
    });

    // Update job status to rejected_by_assignee
    await prisma.job.update({
      where: { id: rejectionRequest.jobId },
      data: { status: 'rejected_by_assignee' }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        jobId: rejectionRequest.jobId,
        userId,
        action: 'rejection_approved',
        message: 'Approver อนุมัติคำขอปฏิเสธจาก Assignee',
        detail: {
          rejectionRequestId: rejectionRequest.id,
          comment: comment || null
        }
      }
    }).catch(err => console.error('[Jobs] Failed to log activity:', err));

    // Optional: Add comment if provided
    if (comment && comment.trim().length > 0) {
      await prisma.jobComment.create({
        data: {
          jobId: rejectionRequest.jobId,
          userId,
          comment: comment.trim(),
          tenantId
        }
      }).catch(err => console.error('[Jobs] Failed to create comment:', err));
    }

    // Cancel chained jobs (if any)
    let cancelledJobIds = [];
    try {
      if (rejectionRequest.job.isParent) {
        // Cancel all child jobs
        cancelledJobIds = await jobChainService.cancelChildJobs(
          rejectionRequest.jobId,
          tenantId,
          `Parent job (${rejectionRequest.job.djId}) rejected by assignee`,
          userId
        );
      } else if (rejectionRequest.job.nextJobId) {
        // Cancel downstream chain
        cancelledJobIds = await jobChainService.cancelChainedJobs(
          rejectionRequest.jobId,
          tenantId,
          `Previous job (${rejectionRequest.job.djId}) rejected by assignee`,
          userId
        );
      }
    } catch (chainErr) {
      console.error('[Jobs] Chain cancellation warning (non-blocking):', chainErr);
    }

    // ✅ NEW: Check Parent Job Closure (Partial Rejection Support)
    try {
      if (rejectionRequest.job.parentJobId) {
        // This is a child job, check if parent can be closed
        const closureCheck = await jobChainService.checkParentJobClosure(
          rejectionRequest.job.parentJobId,
          tenantId
        );

        if (closureCheck.canClose) {
          // Update parent job status
          await prisma.job.update({
            where: { id: rejectionRequest.job.parentJobId },
            data: { status: closureCheck.newStatus }
          });

          // Log activity on parent job
          await prisma.activityLog.create({
            data: {
              jobId: rejectionRequest.job.parentJobId,
              userId,
              action: 'parent_job_closed',
              message: closureCheck.newStatus === 'partially_completed'
                ? 'Parent job partially completed: บาง child jobs ถูกปฏิเสธ'
                : `Parent job status updated: ${closureCheck.reason}`,
              detail: {
                closureReason: closureCheck.reason,
                stats: closureCheck.stats,
                triggeredByRejection: true
              }
            }
          }).catch(err => console.error('[Jobs] Failed to log parent closure:', err));

          console.log(
            `[Jobs] Parent Job Closure (after rejection): Parent ${rejectionRequest.job.parentJobId} → ${closureCheck.newStatus}`,
            closureCheck.stats
          );
        }
      }
    } catch (closureError) {
      console.error('[Jobs] Parent job closure check failed (non-blocking):', closureError);
      // Don't fail the request
    }

    // Notify Requester + Assignee
    try {
      const jobDetail = await prisma.job.findUnique({
        where: { id: rejectionRequest.jobId },
        select: { djId: true, subject: true, requesterId: true, assigneeId: true, tenantId: true }
      });
      if (jobDetail) {
        const notiTargets = [jobDetail.requesterId, rejectionRequest.requestedBy].filter(Boolean);
        const uniqueTargets = [...new Set(notiTargets)];
        for (const targetId of uniqueTargets) {
          await notificationService.createNotification({
            tenantId,
            userId: targetId,
            type: 'rejection_approved',
            title: `✅ คำขอปฏิเสธงาน ${jobDetail.djId} ได้รับอนุมัติ`,
            message: `คำขอปฏิเสธงาน "${jobDetail.subject || ''}" ได้รับการอนุมัติแล้ว งานถูกยกเลิก`,
            link: `/jobs/${rejectionRequest.jobId}`
          }).catch(err => console.warn('[ApproveRejReq] Noti failed:', err.message));
        }

        // Email with Magic Link
        const emailService = new EmailService();
        const targetUsers = await prisma.user.findMany({
          where: { id: { in: uniqueTargets } },
          select: { id: true, email: true, firstName: true, lastName: true }
        });
        await Promise.allSettled(
          targetUsers.filter(u => u.email).map(async (u) => {
            const magicLink = await magicLinkService.createJobActionLink({
              userId: u.id,
              jobId: rejectionRequest.jobId,
              action: 'view',
              djId: jobDetail.djId
            });
            const emailHtml = createRejectionApprovedEmail({
              djId: jobDetail.djId,
              subject: jobDetail.subject || '',
              magicLink,
              userName: `${u.firstName} ${u.lastName}`
            });
            return emailService.sendEmail(u.email, `✅ คำขอปฏิเสธงาน ${jobDetail.djId} ได้รับอนุมัติ`, emailHtml)
              .catch(err => console.warn('[ApproveRejReq] Email failed:', err.message));
          })
        );
      }
    } catch (notiErr) {
      console.warn('[ApproveRejReq] Notification failed (non-blocking):', notiErr.message);
    }

    res.json({
      success: true,
      message: 'อนุมัติคำขอปฏิเสธเรียบร้อย',
      data: {
        jobId: rejectionRequest.jobId,
        status: 'rejected_by_assignee',
        cancelledJobs: cancelledJobIds.length
      }
    });

  } catch (error) {
    console.error('[Jobs] Approve rejection request error:', error);
    res.status(500).json({
      success: false,
      error: 'APPROVE_REJECTION_FAILED',
      message: 'ไม่สามารถอนุมัติคำขอปฏิเสธได้'
    });
  }
});

/**
 * POST /api/rejection-requests/:id/deny
 * Approver ปฏิเสธคำขอปฏิเสธจาก Assignee - สั่งให้ทำงานต่อ
 *
 * - อัปเดตสถานะ rejection_request เป็น 'denied'
 * - เปลี่ยนสถานะงานกลับเป็น 'in_progress'
 * - แนะนำให้ Assignee ขอ Extend deadline
 *
 * @body {string} reason - เหตุผลที่ไม่อนุมัติ (Required)
 */
router.post('/rejection-requests/:id/deny', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const prisma = getDatabase();

    // Validation
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'REASON_REQUIRED',
        message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอปฏิเสธ'
      });
    }

    // Get rejection request
    const rejectionRequest = await prisma.rejectionRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        job: {
          select: {
            id: true,
            djId: true,
            status: true
          }
        }
      }
    });

    if (!rejectionRequest) {
      return res.status(404).json({
        success: false,
        error: 'REQUEST_NOT_FOUND',
        message: 'ไม่พบคำขอปฏิเสธที่ระบุ'
      });
    }

    // Check tenant
    if (rejectionRequest.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์เข้าถึงคำขอนี้'
      });
    }

    // Check if user is in approver list
    let approvers = rejectionRequest.approverIds;
    if (typeof approvers === 'string') {
      try {
        approvers = JSON.parse(approvers);
      } catch (e) {
        approvers = [];
      }
    }
    if (!Array.isArray(approvers)) {
      approvers = [];
    }

    // แปลง userId และ approver id ให้เป็น string เพื่อเทียบอย่างปลอดภัย
    const isApprover = approvers.some(id => String(id) === String(userId));

    if (!isApprover) {
      return res.status(403).json({
        success: false,
        error: 'NOT_APPROVER',
        message: 'คุณไม่ใช่ผู้อนุมัติสำหรับคำขอนี้'
      });
    }

    // Check if request is still pending
    if (rejectionRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'REQUEST_ALREADY_PROCESSED',
        message: `คำขอนี้ถูกดำเนินการแล้ว (${rejectionRequest.status})`
      });
    }

    // Update rejection request to denied
    await prisma.rejectionRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'denied',
        approvedBy: userId,
        approvedAt: new Date()
      }
    });

    // Revert job status back to in_progress
    await prisma.job.update({
      where: { id: rejectionRequest.jobId },
      data: { status: 'in_progress' }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        jobId: rejectionRequest.jobId,
        userId,
        action: 'rejection_denied',
        message: 'Approver ไม่อนุมัติคำขอปฏิเสธ - สั่งให้ Assignee ทำงานต่อ',
        detail: {
          rejectionRequestId: rejectionRequest.id,
          reason: reason.trim()
        }
      }
    }).catch(err => console.error('[Jobs] Failed to log activity:', err));

    // Add comment with reason
    await prisma.jobComment.create({
      data: {
        jobId: rejectionRequest.jobId,
        userId,
        comment: `❌ ไม่อนุมัติคำขอปฏิเสธ: ${reason.trim()}\n\n💡 แนะนำ: หากต้องการเวลาเพิ่ม กรุณาขอ Extend Deadline แทน`,
        tenantId
      }
    }).catch(err => console.error('[Jobs] Failed to create comment:', err));

    // Notify Assignee
    try {
      const jobDetail = await prisma.job.findUnique({
        where: { id: rejectionRequest.jobId },
        select: { djId: true, subject: true, assigneeId: true, tenantId: true, assignee: { select: { email: true } } }
      });
      if (jobDetail?.assigneeId) {
        await notificationService.createNotification({
          tenantId,
          userId: jobDetail.assigneeId,
          type: 'rejection_denied',
          title: `❌ คำขอปฏิเสธงาน ${jobDetail.djId} ไม่ได้รับอนุมัติ`,
          message: `กรุณาทำงาน "${jobDetail.subject || ''}" ต่อ เหตุผล: ${reason.trim()}\n💡 หากต้องการเวลาเพิ่ม กรุณาขอ Extend Deadline`,
          link: `/jobs/${rejectionRequest.jobId}`
        }).catch(err => console.warn('[DenyRejReq] Noti failed:', err.message));

        // Email Assignee with Magic Link
        if (jobDetail.assignee?.email) {
          const emailService = new EmailService();
          const magicLink = await magicLinkService.createJobActionLink({
            userId: jobDetail.assigneeId,
            jobId: rejectionRequest.jobId,
            action: 'view',
            djId: jobDetail.djId
          });
          const emailHtml = createRejectionDeniedEmail({
            djId: jobDetail.djId,
            subject: jobDetail.subject || '',
            reason: reason.trim(),
            magicLink,
            userName: `${jobDetail.assignee?.firstName || 'ผู้รับงาน'} ${jobDetail.assignee?.lastName || ''}`
          });
          await emailService.sendEmail(jobDetail.assignee.email, `❌ คำขอปฏิเสธงาน ${jobDetail.djId} ไม่ได้รับอนุมัติ`, emailHtml)
            .catch(err => console.warn('[DenyRejReq] Email failed:', err.message));
        }
      }
    } catch (notiErr) {
      console.warn('[DenyRejReq] Notification failed (non-blocking):', notiErr.message);
    }

    res.json({
      success: true,
      message: 'ไม่อนุมัติคำขอปฏิเสธ - Assignee ต้องทำงานต่อ',
      data: {
        jobId: rejectionRequest.jobId,
        status: 'in_progress'
      }
    });

  } catch (error) {
    console.error('[Jobs] Deny rejection request error:', error);
    res.status(500).json({
      success: false,
      error: 'DENY_REJECTION_FAILED',
      message: 'ไม่สามารถปฏิเสธคำขอได้'
    });
  }
});

/**
 * POST /api/jobs/parent-child
 * สร้าง Parent Job พร้อม Child Jobs ใน Single Transaction
 *
 * ✅ SECURITY: ย้าย Orchestration มาที่ Backend เพื่อ:
 * - Bypass RLS restrictions (ใช้ Service Role)
 * - Atomicity (All-or-nothing)
 * - Data Integrity (ไม่มี orphan jobs)
 *
 * @body {number} projectId - รหัสโครงการ (Required)
 * @body {string} subject - หัวข้องาน (Required)
 * @body {string} priority - ความเร่งด่วน: 'low' | 'normal' | 'urgent'
 * @body {Object} brief - { objective, headline, subHeadline, description }
 * @body {Array} jobTypes - รายการประเภทงานลูก [{ jobTypeId, assigneeId? }]
 * @body {string} deadline - วันกำหนดส่งเริ่มต้น
 *
 * @returns {Object} - { success, data: { parent, children, totalCreated } }
 */
router.post('/parent-child', async (req, res) => {
  try {
    const prisma = getDatabase();
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    // ============================================
    // Step 1: Validate Input
    // ============================================
    const {
      projectId,
      subject,
      priority = 'normal',
      status,         // Optional: 'draft' to save as draft
      brief = {},
      objective,      // Fallback fields (for backward compatibility)
      headline,
      subHeadline,
      description,
      briefLink,
      briefFiles,
      jobTypes = [],
      deadline,
      items = []      // Job items (ขนาด, จำนวนชิ้นงาน)
    } = req.body;

    // Check if this is a draft save
    const isDraft = status === 'draft';

    // Merge brief object with fallback values from top-level fields
    const briefData = {
      objective: brief.objective || objective || null,
      headline: brief.headline || headline || null,
      subHeadline: brief.subHeadline || subHeadline || null,
      description: brief.description || description || null,
      briefLink: brief.briefLink || briefLink || null,
      briefFiles: brief.briefFiles || briefFiles || []
    };

    if (!projectId || !subject || !jobTypes || jobTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'กรุณาระบุ projectId, subject และ jobTypes (อย่างน้อย 1 รายการ)'
      });
    }

    // Validate project exists
    const project = await prisma.project.findFirst({
      where: { id: parseInt(projectId), tenantId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'PROJECT_NOT_FOUND',
        message: 'ไม่พบโปรเจกต์ที่ระบุ'
      });
    }

    // Validate all job types exist
    const jobTypeIds = jobTypes.map(jt => parseInt(jt.jobTypeId));
    const validJobTypes = await prisma.jobType.findMany({
      where: { id: { in: jobTypeIds }, tenantId, isActive: true },
      select: { id: true, name: true, slaWorkingDays: true }
    });

    if (validJobTypes.length !== jobTypeIds.length) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JOB_TYPES',
        message: 'บางประเภทงานไม่ถูกต้องหรือไม่พร้อมใช้งาน'
      });
    }

    // Create a map for quick lookup
    const jobTypeMap = new Map(validJobTypes.map(jt => [jt.id, jt]));

    // ============================================
    // Step 2: Execute Transaction
    // ============================================
    const result = await prisma.$transaction(async (tx) => {
      // ----------------------------------------
      // 2.1: Ensure PARENT_GROUP job type exists
      // ----------------------------------------
      let parentGroupType = await tx.jobType.findFirst({
        where: {
          tenantId,
          name: 'Project Group (Parent)',
          isActive: true
        }
      });

      if (!parentGroupType) {
        parentGroupType = await tx.jobType.create({
          data: {
            tenantId,
            name: 'Project Group (Parent)',
            slaWorkingDays: 0,
            description: 'Parent job type for grouping child jobs',
            isActive: true
          }
        });
        console.log('[Parent-Child] Created PARENT_GROUP job type');
      }

      // ----------------------------------------
      // 2.2: Generate DJ-IDs atomically
      // รูปแบบใหม่: Parent = DJ-YYMMDD-xxxx, Child = DJ-YYMMDD-xxxx-01
      // ----------------------------------------
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const prefix = `DJ-${yy}${mm}${dd}-`;

      // Get the latest DJ-ID with row lock
      const latestJob = await tx.job.findFirst({
        where: {
          tenantId,
          djId: { startsWith: prefix },
          parentJobId: null // นับเฉพาะ Parent/Single Job
        },
        orderBy: { djId: 'desc' },
        select: { djId: true }
      });

      let runningNumber = 1;
      if (latestJob && latestJob.djId) {
        // DJ-YYMMDD-xxxx format
        const parts = latestJob.djId.split('-');
        if (parts.length >= 3) {
          runningNumber = parseInt(parts[2]) + 1;
        }
      }

      // สร้าง Parent DJ ID
      const parentDjId = `${prefix}${String(runningNumber).padStart(4, '0')}`;

      // สร้าง Child DJ ID (เพิ่ม suffix -01, -02, ...)
      const generateChildDjId = (childIndex) => {
        return `${parentDjId}-${String(childIndex + 1).padStart(2, '0')}`;
      };

      // ----------------------------------------
      // Smart Initial Status Logic
      // 🔥 NEW: ถ้า Priority = Urgent → บังคับ Approval
      // ----------------------------------------
      // ----------------------------------------
      // Smart Initial Status Logic
      // 🔥 UPDATED: Pre-calculate approval needs for all children
      // ----------------------------------------
      let allChildrenSkip = true;
      const childNeedsApprovalMap = new Map(); // jobTypeId -> boolean

      // ⚡ Performance: Check Flow for ALL children in parallel
      const childFlowResults = await Promise.all(
        jobTypes.map(childConfig => {
          const jid = parseInt(childConfig.jobTypeId);
          return approvalService.getApprovalFlow(parseInt(projectId), jid, priority)
            .then(flow => ({ jid, flow }));
        })
      );
      childFlowResults.forEach(({ jid, flow }) => {
        const levels = approvalService.getApprovalLevels(flow);
        const needsApproval = levels > 0;
        childNeedsApprovalMap.set(jid, needsApproval);
        if (needsApproval) {
          allChildrenSkip = false;
        }
      });

      // 2. Urgent Priority Override
      if (priority.toLowerCase() === 'urgent') {
        allChildrenSkip = false; // Force Parent to Pending
        console.log('[Parent-Child] Urgent job → Force Approval Flow');
      }

      // Draft mode: save as draft without approval flow
      let parentStatus;
      if (isDraft) {
        parentStatus = 'draft';
        console.log('[Parent-Child] Draft mode → Status: draft');
      } else {
        parentStatus = allChildrenSkip ? 'assigned' : 'pending_approval';
        console.log(`[Smart Status] All children skip? ${allChildrenSkip} => Parent Status: ${parentStatus}`);
      }

      // ----------------------------------------
      // 2.3: Validate and Adjust Parent Deadline
      // ----------------------------------------

      let parentDueDate = deadline ? new Date(deadline) : null;
      let parentDueDateAdjustmentReasons = [];

      if (parentDueDate) {
        const parentDueDateValidation = workingHoursHelper.validateAndAdjustDueDate(parentDueDate);

        if (parentDueDateValidation.needsAdjustment) {
          parentDueDate = parentDueDateValidation.adjustedDate;
          parentDueDateAdjustmentReasons = parentDueDateValidation.reasons;
          console.log(`[Parent-Child] Parent Due Date adjusted: ${workingHoursHelper.formatAdjustmentMessage(
            parentDueDateValidation.originalDate,
            parentDueDateValidation.adjustedDate,
            parentDueDateValidation.reasons
          )}`);
        }
      }

      // ----------------------------------------
      // 2.4: Create Parent Job (ใช้ parentDjId ที่สร้างไว้แล้วด้านบน)
      // ----------------------------------------
      const parentJob = await tx.job.create({
        data: {
          tenantId,
          projectId: parseInt(projectId),
          jobTypeId: parentGroupType.id,
          djId: parentDjId,
          subject,
          objective: briefData.objective,
          headline: briefData.headline,
          subHeadline: briefData.subHeadline,
          description: briefData.description,
          briefLink: briefData.briefLink,
          briefFiles: briefData.briefFiles,
          // Smart Status: If all children skip approval, parent is auto-assigned
          status: parentStatus,
          priority: priority.toLowerCase(),
          requesterId: userId,
          assigneeId: null,
          isParent: true,
          parentJobId: null,
          dueDate: parentDueDate
        }
      });

      console.log(`[Parent-Child] Created parent job: ${parentDjId}`);

      // ----------------------------------------
      // 2.3.1: Create Job Items for Parent (ถ้ามี)
      // ----------------------------------------
      if (items && items.length > 0) {
        await tx.designJobItem.createMany({
          data: items.map(item => ({
            jobId: parentJob.id,
            name: item.name,
            quantity: item.quantity || 1,
            status: 'pending'
          }))
        });
        console.log(`[Parent-Child] Created ${items.length} job items for parent`);
      }

      // ✅ FIX: Create implicit approval record for parent job if skipping approval
      if (!isDraft && parentStatus === 'assigned') {
        // Parent job is skipping approval flow - record this as implicit auto-approval
        await tx.approval.create({
          data: {
            jobId: parentJob.id,
            approverId: userId,
            stepNumber: 1,
            status: 'approved',
            approvedAt: new Date(),
            comment: 'Auto-approved: Parent job created with all children skipping approval flow',
            tenantId
          }
        });

        console.log(`[Parent-Child] Created implicit approval for parent ${parentDjId} (status: ${parentStatus})`);
      }

      // ----------------------------------------
      // 2.4: Create Child Jobs
      // ----------------------------------------
      const childJobs = [];
      let maxDueDate = deadline ? new Date(deadline) : null;

      for (let i = 0; i < jobTypes.length; i++) {
        const childConfig = jobTypes[i];
        const childJobType = jobTypeMap.get(parseInt(childConfig.jobTypeId));

        if (!childJobType) continue;

        // Store created jobs to reference IDs for dependencies
        // childJobs is already defined outside loop

        // Determine Start Date & Predecessor
        let startDate = new Date();
        let predecessorId = null;
        let predecessorSlaDays = 0; // For Frontend Preview Consistency

        // Check for Dependency (Sequential Job)
        // Frontend sends 'predecessorIndex' (0-based index in the jobTypes array)
        if (childConfig.predecessorIndex !== undefined && childConfig.predecessorIndex !== null) {
          const predecessorIndex = parseInt(childConfig.predecessorIndex);

          // Validate index
          if (predecessorIndex >= 0 && predecessorIndex < i && childJobs[predecessorIndex]) {
            const predecessorJob = childJobs[predecessorIndex];
            predecessorId = predecessorJob.id;

            // Start Date = Predecessor's Due Date
            startDate = new Date(predecessorJob.dueDate);

            console.log(`[Parent-Child] Job ${i} depends on Job ${predecessorIndex} (ID: ${predecessorId})`);
          }
        }

        // Calculate due date based on SLA & Start Date
        const slaWorkingDays = childJobType.slaWorkingDays || 7;
        const childDueDate = calculateWorkingDays(startDate, slaWorkingDays);

        // Generate child DJ-ID (เพิ่ม suffix -01, -02, ...)
        const childDjId = generateChildDjId(i);

        // Determine assignee
        let assigneeId = childConfig.assigneeId ? parseInt(childConfig.assigneeId) : null;

        // Try auto-assign if no assignee specified
        if (!assigneeId) {
          const autoAssignment = await tx.projectJobAssignment.findFirst({
            where: {
              projectId: parseInt(projectId),
              jobTypeId: parseInt(childConfig.jobTypeId),
              isActive: true
            },
            select: { assigneeId: true }
          });

          if (autoAssignment?.assigneeId) {
            assigneeId = autoAssignment.assigneeId;
          }
        }

        // Determine Child Status
        let childStatus = 'draft'; // Default for draft mode

        if (!isDraft) {
          const flowNeedsApproval = childNeedsApprovalMap.get(parseInt(childConfig.jobTypeId));
          const isUrgent = priority.toLowerCase() === 'urgent';

          const needsApproval = flowNeedsApproval || isUrgent;

          if (needsApproval) {
            // ✅ Needs approval: Go through approval flow first
            // Even if job has predecessor, it must be approved first
            // After approval completes, it will transition to pending_dependency (if has predecessor)
            childStatus = 'pending_approval';
          } else {
            // ✅ Skip approval flows
            if (predecessorId) {
              // Has predecessor but no approval needed → wait for predecessor
              childStatus = 'pending_dependency';
            } else {
              // No approval, no predecessor → ready to work
              childStatus = assigneeId ? 'in_progress' : 'approved';
            }
          }
        }

        // ✅ เพิ่มรายละเอียด items ในคำอธิบายงาน (ถ้ามี)
        // กรองเฉพาะ items ที่เป็นของ job type นี้
        const childItems = items && items.length > 0
          ? items.filter(item => item.jobTypeId === parseInt(childConfig.jobTypeId))
          : [];

        let childDescription = briefData.description || '';
        if (childItems.length > 0) {
          const itemsSummary = childItems.map(item => `- ${item.name} (จำนวน: ${item.quantity || 1})`).join('\n');
          childDescription = childDescription
            ? `${childDescription}\n\n📦 รายการที่ต้องส่งมอบ:\n${itemsSummary}`
            : `📦 รายการที่ต้องส่งมอบ:\n${itemsSummary}`;
        }

        // Create child job
        const childJob = await tx.job.create({
          data: {
            tenantId,
            projectId: parseInt(projectId),
            jobTypeId: parseInt(childConfig.jobTypeId),
            djId: childDjId,
            subject: `${subject} - ${childJobType.name}`,
            objective: briefData.objective,
            headline: briefData.headline,
            subHeadline: briefData.subHeadline,
            description: childDescription, // ✅ รวม items summary
            briefLink: briefData.briefLink,
            briefFiles: briefData.briefFiles,
            status: childStatus,
            priority: priority.toLowerCase(),
            requesterId: userId,
            assigneeId: assigneeId,
            isParent: false,
            parentJobId: parentJob.id,
            dueDate: childDueDate,
            startedAt: assigneeId && !predecessorId ? new Date() : null, // Start now only if no dependency

            // 🔥 Dependency Fields
            predecessorId: predecessorId,
            slaDays: slaWorkingDays // Save original SLA for recalculation
          }
        });

        // ✅ คัดลอก Job Items ไปยัง Child Job (เฉพาะของ job type นี้)
        if (childItems.length > 0) {
          await tx.designJobItem.createMany({
            data: childItems.map(item => ({
              jobId: childJob.id,
              jobTypeItemId: item.jobTypeItemId ? parseInt(item.jobTypeItemId) : null,
              name: item.name,
              quantity: item.quantity || 1,
              status: 'pending'
            }))
          });
          console.log(`[Parent-Child] Created ${childItems.length} items for child ${childJob.djId}`);
        }

        // ✅ FIX: Create implicit approval record for skipped/auto-approved flows
        // This ensures ALL jobs have an audit trail in the approvals table
        // even when approval flow is skipped or auto-approved
        if (!isDraft && (childStatus === 'approved' || childStatus === 'in_progress')) {
          // Job is skipping approval flow - record this as implicit auto-approval
          await tx.approval.create({
            data: {
              jobId: childJob.id,
              approverId: userId, // Requester implicitly approves
              stepNumber: 1,
              status: 'approved',
              approvedAt: new Date(),
              comment: childStatus === 'approved'
                ? 'Auto-approved: No approval flow required for this job type'
                : 'Auto-approved: Job assigned with implicit approval by requester',
              tenantId
            }
          });

          console.log(`[Parent-Child] Created implicit approval for ${childDjId} (status: ${childStatus})`);
        }

        childJobs.push({
          id: childJob.id,
          djId: childJob.djId,
          jobTypeId: childJob.jobTypeId,
          jobTypeName: childJobType.name,
          status: childJob.status,
          assigneeId: childJob.assigneeId,
          dueDate: childJob.dueDate
        });

        console.log(`[Parent-Child] Created child job: ${childDjId} (${childJobType.name})`);

        // Track max due date for parent
        if (childDueDate > maxDueDate) {
          maxDueDate = childDueDate;
        }
      }

      // ----------------------------------------
      // 2.5: Update Parent Due Date
      // ----------------------------------------
      if (maxDueDate) {
        await tx.job.update({
          where: { id: parentJob.id },
          data: { dueDate: maxDueDate }
        });
      }

      // ----------------------------------------
      // 2.6: Create Activity Log
      // ----------------------------------------
      await tx.activityLog.create({
        data: {
          jobId: parentJob.id,
          userId,
          action: isDraft ? 'draft_saved' : 'parent_child_created',
          message: isDraft
            ? `บันทึกร่างงาน ${parentDjId} พร้อม ${childJobs.length} งานย่อย`
            : `สร้างงานกลุ่ม ${parentDjId} พร้อม ${childJobs.length} งานย่อย`,
          detail: {
            parentId: parentJob.id,
            childCount: childJobs.length,
            childIds: childJobs.map(c => c.id),
            priority,
            isDraft
          }
        }
      });

      // บันทึก activity log สำหรับการปรับ parent dueDate (ถ้ามี)
      if (parentDueDateAdjustmentReasons.length > 0) {
        const parentDueDateValidation = workingHoursHelper.validateAndAdjustDueDate(deadline);
        const adjustmentMessage = workingHoursHelper.formatAdjustmentMessage(
          parentDueDateValidation.originalDate,
          parentDueDateValidation.adjustedDate,
          parentDueDateAdjustmentReasons
        );

        await tx.activityLog.create({
          data: {
            jobId: parentJob.id,
            userId,
            action: 'due_date_adjusted',
            message: adjustmentMessage,
            detail: {
              originalDueDate: parentDueDateValidation.originalDate,
              adjustedDueDate: parentDueDateValidation.adjustedDate,
              reasons: parentDueDateAdjustmentReasons,
              jobType: 'parent',
              childCount: childJobs.length
            }
          }
        });
      }

      return {
        parent: {
          id: parentJob.id,
          djId: parentJob.djId,
          subject: parentJob.subject,
          status: parentJob.status,
          priority: parentJob.priority,
          dueDate: maxDueDate
        },
        children: childJobs,
        totalCreated: 1 + childJobs.length
      };

    }, {
      maxWait: 10000,  // Max 10 sec to acquire lock
      timeout: 60000   // Max 60 sec transaction (for many children)
    });

    // ============================================
    // Step 3: Auto-Approve child jobs if requester is approver
    // ============================================
    if (!isDraft) {
      let anyAutoApproved = false;

      for (const child of result.children) {
        if (child.status === 'pending_approval') {
          const autoResult = await approvalService.autoApproveIfRequesterIsApprover({
            jobId: child.id,
            requesterId: userId,
            projectId: parseInt(projectId),
            jobTypeId: child.jobTypeId,
            tenantId,
            priority: priority
          });

          if (autoResult.autoApproved) {
            child.status = autoResult.newStatus;
            anyAutoApproved = true;
            console.log(`[Parent-Child] Auto-approved child ${child.djId}: ${autoResult.newStatus}`);

            // บันทึก Activity Log สำหรับ child job แต่ละตัวที่ถูก Auto-approve
            // เพื่อสร้าง Audit Trail ที่สมบูรณ์
            const prismaOuter = getDatabase();
            await prismaOuter.activityLog.create({
              data: {
                jobId: child.id,
                userId,
                action: 'job_auto_approved',
                message: `Auto-approved child job ${child.djId} → ${autoResult.newStatus}`,
                detail: JSON.stringify({
                  autoApproved: true,
                  newStatus: autoResult.newStatus,
                  isFinal: autoResult.isFinal,
                  approvalId: autoResult.approvalId,
                  isChildJob: true,
                  parentJobId: result.parent.id
                })
              }
            }).catch(err => console.warn(`[Parent-Child] Activity log failed for ${child.djId}:`, err.message));
          }
        }
      }

      // ✅ FIXED: Auto-Approve parent job BEFORE checking if all children are approved
      // (Need to do this while parent.status is still 'pending_approval')
      if (result.parent.status === 'pending_approval') {
        // ✅ FIX: หา child ที่ไม่ skip approval เพื่อใช้ flow ที่ถูกต้อง
        // ไม่ควรใช้ child แรก (อาจเป็น skip approval เช่น EDM)
        const nonSkipChild = result.children.find(c => c.status && c.status.startsWith('pending_'));
        const jobTypeIdForFlow = nonSkipChild?.jobTypeId || null; // ใช้ null = default flow

        console.log(`[Parent-Child] Using jobTypeId=${jobTypeIdForFlow} for parent auto-approve (nonSkipChild: ${nonSkipChild?.djId || 'none'})`);

        console.log(`[Parent-Child] 🔍 Auto-approve params:`, {
          parentJobId: result.parent.id,
          parentDjId: result.parent.djId,
          requesterId: userId,
          requesterFromReq: req.user.userId,
          projectId: parseInt(projectId),
          jobTypeId: jobTypeIdForFlow
        });

        const parentAutoResult = await approvalService.autoApproveIfRequesterIsApprover({
          jobId: result.parent.id,
          requesterId: userId,
          projectId: parseInt(projectId),
          jobTypeId: jobTypeIdForFlow, // ✅ ใช้ child ที่ต้อง approve หรือ default flow
          tenantId,
          priority: priority
        });

        if (parentAutoResult.autoApproved) {
          result.parent.status = parentAutoResult.newStatus;
          console.log(`[Parent-Child] Auto-approved parent ${result.parent.djId}: ${parentAutoResult.newStatus}`);
        }
      }

      // If any child was auto-approved, update parent status too
      if (anyAutoApproved) {
        const allChildStatuses = result.children.map(c => c.status);
        // ✅ FIX: เช็คว่า Child ผ่านการอนุมัติครบทุกขั้นแล้วจริงๆ
        // สถานะที่ถือว่า "ผ่านแล้ว" คือ in_progress, approved, completed
        // สถานะที่ยังรอ: pending_approval, pending_level_2, pending_level_3, pending_dependency ฯลฯ
        const PENDING_STATUSES = ['pending_approval', 'pending_dependency', 'draft'];
        const isPendingStatus = (s) => s.startsWith('pending_') || PENDING_STATUSES.includes(s);
        const allApproved = allChildStatuses.every(s => !isPendingStatus(s));

        if (allApproved) {
          // ✅ FIX: Create approval records properly instead of directly updating status
          // Get approval flow to determine how many levels need approval
          const flow = await approvalService.getApprovalFlow(
            parseInt(projectId),
            result.children[0]?.jobTypeId || 1
          );
          const totalLevels = approvalService.getApprovalLevels(flow);

          // Create approval records for all remaining levels
          const prisma = getDatabase();
          const existingApprovals = await prisma.approval.findMany({
            where: { jobId: result.parent.id },
            select: { stepNumber: true }
          });
          const existingSteps = new Set(existingApprovals.map(a => a.stepNumber));

          // Create missing approval records for all levels
          for (let level = 1; level <= totalLevels; level++) {
            if (!existingSteps.has(level)) {
              try {
                await prisma.approval.create({
                  data: {
                    jobId: result.parent.id,
                    approverId: userId,
                    stepNumber: level,
                    status: 'approved',
                    approvedAt: new Date(),
                    comment: `Auto-approved Level ${level}: All child jobs completed`,
                    tenantId
                  }
                });
                console.log(`[Parent-Child] Created approval record for parent ${result.parent.djId} Level ${level}`);
              } catch (err) {
                console.warn(`[Parent-Child] Failed to create approval record Level ${level}:`, err.message);
              }
            }
          }

          // Now update status to approved
          await prisma.job.update({
            where: { id: result.parent.id },
            data: { status: 'approved' }
          });
          result.parent.status = 'approved';
          console.log(`[Parent-Child] All children approved → Parent status: approved with ${totalLevels} approval records`);
        } else {
          console.log(`[Parent-Child] Some children still pending: ${allChildStatuses.join(', ')} → Parent stays: ${result.parent.status}`);
        }
      }
    }

    // ============================================
    // Step 4: Send Response
    // ============================================
    console.log(`[Parent-Child] ✅ Transaction completed: ${result.parent.djId} with ${result.children.length} children`);

    res.status(201).json({
      success: true,
      data: result,
      message: `สร้างงาน ${result.parent.djId} พร้อม ${result.children.length} งานย่อยเรียบร้อยแล้ว`
    });

  } catch (error) {
    console.error('[Parent-Child] Create error:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_DJ_ID',
        message: 'เกิดข้อผิดพลาด DJ-ID ซ้ำ กรุณาลองใหม่อีกครั้ง'
      });
    }

    res.status(500).json({
      success: false,
      error: 'CREATE_PARENT_CHILD_FAILED',
      message: 'ไม่สามารถสร้างงานได้ กรุณาลองใหม่อีกครั้ง',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Helper: Calculate working days (skip weekends)
 * TODO: Add holiday support from database
 */
function calculateWorkingDays(startDate, workingDays) {
  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * Helper: คำนวณ deadline auto-close = 1 วันทำงานถัดไป
 * - ข้ามวันเสาร์ (6) และวันอาทิตย์ (0)
 * - ข้ามวันหยุดนักขัตฤกษ์จาก holidays table (กรองตาม tenantId)
 * - เริ่มนับจาก startDate โดยรักษาเวลาเดิมไว้
 * @param {Date} startDate - วันเริ่มต้น
 * @param {number} tenantId - tenantId สำหรับดึงวันหยุด
 * @returns {Promise<Date>} - วันทำงานถัดไปที่เวลาเดียวกัน
 */
async function calculateNextWorkingDay(startDate, tenantId) {
  const prisma = getDatabase();

  // ดึงวันหยุดในช่วง 30 วันข้างหน้า (เพื่อประสิทธิภาพ)
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(startDate);
  rangeEnd.setDate(rangeEnd.getDate() + 30);

  let holidaySet = new Set();
  try {
    const holidays = await prisma.holiday.findMany({
      where: {
        tenantId,
        date: {
          gte: rangeStart,
          lte: rangeEnd
        }
      },
      select: { date: true }
    });
    holidays.forEach(h => {
      // เก็บเป็น YYYY-MM-DD string เพื่อเทียบง่าย
      const d = new Date(h.date);
      holidaySet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    });
  } catch (err) {
    console.warn('[calculateNextWorkingDay] Could not load holidays, using weekends only:', err.message);
  }

  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < 1) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const dateStr = `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;

    // ข้ามเสาร์ (6), อาทิตย์ (0) และวันหยุดนักขัตฤกษ์
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * POST /api/jobs/:id/reassign
 * เปลี่ยนผู้รับผิดชอบงาน
 */
router.post('/:id/reassign', async (req, res) => {
  try {
    const { id } = req.params;
    const { newAssigneeId, reason } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const prisma = getDatabase();

    // 1. ตรวจสอบว่ามีงานหรือไม่ และตรวจสิทธิ์
    const job = await prisma.job.findUnique({
      where: { id: Number(id), tenantId },
      include: {
        requester: true,
        assignee: true,
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'ไม่พบงานที่ระบุ' });
    }

    // Permission Check: Owner, Assignee, Admin, Manager
    // This uses Prisma which bypasses RLS
    // Role checks are usually done up the chain, or we just trust the token
    const isOwnerOrAssignee = job.requesterId === userId || job.assigneeId === userId;
    const { hasRole } = await import('../helpers/roleHelper.js');
    const isAdminOrManager = hasRole(req.user.roles, 'admin') || hasRole(req.user.roles, 'manager');

    if (!isOwnerOrAssignee && !isAdminOrManager) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ย้ายงาน' });
    }

    // 2. ตรวจสอบ Assignee ใหม่
    const newAssignee = await prisma.user.findUnique({
      where: { id: Number(newAssigneeId) }
    });

    if (!newAssignee) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้รับงานใหม่' });
    }

    // 3. Update Job
    const updateData = {
      assignee: { connect: { id: Number(newAssigneeId) } },
    };

    // ถ้า status เป็น approved (ยังไม่มอบหมาย) → เปลี่ยนเป็น in_progress
    if (job.status === 'approved') {
      updateData.status = 'in_progress';
      updateData.assignedAt = new Date();
      updateData.startedAt = new Date();
    }

    await prisma.job.update({
      where: { id: Number(id) },
      data: updateData
    });

    // 4. Log Activity
    await prisma.activityLog.create({
      data: {
        jobId: Number(id),
        userId: userId,
        action: 'reassigned',
        message: `ย้ายผู้รับผิดชอบงานไปที่ ${newAssignee.firstName} ${newAssignee.lastName}. เหตุผล: ${reason || '-'}`
      }
    });

    // 5. Notifications
    try {
      // แจ้ง Assignee ใหม่
      await notificationService.createNotification({
        tenantId,
        userId: Number(newAssigneeId),
        type: 'job_assigned',
        title: `👤 คุณได้รับมอบหมายงาน: ${job.djId}`,
        message: `งาน "${job.subject}" ถูกมอบหมายให้คุณ${reason ? ' เหตุผล: ' + reason : ''}`,
        link: `/jobs/${id}`
      }).catch(err => console.warn('[Reassign] Noti to new assignee failed:', err.message));

      // แจ้ง Assignee เก่า (ถ้ามีและไม่ใช่คนเดียวกัน)
      if (job.assigneeId && job.assigneeId !== Number(newAssigneeId)) {
        await notificationService.createNotification({
          tenantId,
          userId: job.assigneeId,
          type: 'job_reassigned',
          title: `🔄 งาน ${job.djId} ถูกโอนไปให้คนอื่น`,
          message: `งาน "${job.subject}" ถูกโอนไปให้ ${newAssignee.firstName} ${newAssignee.lastName}`,
          link: `/jobs/${id}`
        }).catch(err => console.warn('[Reassign] Noti to old assignee failed:', err.message));
      }

      // Email Assignee ใหม่ with Magic Link
      if (newAssignee.email) {
        const emailService = new EmailService();
        const magicLink = await magicLinkService.createJobActionLink({
          userId: Number(newAssigneeId),
          jobId: Number(id),
          action: 'view',
          djId: job.djId
        });
        const emailHtml = createJobAssignmentEmail({
          djId: job.djId,
          subject: job.subject,
          priority: job.priority || 'normal',
          dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString('th-TH') : null,
          magicLink,
          assigneeName: `${newAssignee.firstName} ${newAssignee.lastName}`
        });
        await emailService.sendEmail(newAssignee.email, `👤 คุณได้รับมอบหมายงาน: ${job.djId}`, emailHtml)
          .catch(err => console.warn('[Reassign] Email failed:', err.message));
      }
    } catch (notiErr) {
      console.warn('[Reassign] Notification failed (non-blocking):', notiErr.message);
    }

    res.json({
      success: true,
      data: {
        assignee: {
          id: newAssignee.id,
          name: `${newAssignee.firstName} ${newAssignee.lastName}`,
          email: newAssignee.email,
          avatar: newAssignee.avatarUrl
        }
      }
    });

  } catch (error) {
    console.error('[Jobs] Reassign error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการย้ายงาน' });
  }
});

/**
 * POST /api/jobs/:id/assign
 * มอบหมายงานครั้งแรก (First-time assignment) เมื่อ assigneeId = null
 * เรียกโดย Admin หรือ Manager เท่านั้น
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigneeId } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (!assigneeId) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ assigneeId' });
    }

    const prisma = getDatabase();

    // 1. ตรวจสอบงาน
    const job = await prisma.job.findUnique({
      where: { id: Number(id), tenantId },
      include: { assignee: true }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'ไม่พบงานที่ระบุ' });
    }

    // 2. Permission: Admin หรือ Manager เท่านั้น
    const { hasRole } = await import('../helpers/roleHelper.js');
    const isAdminOrManager = hasRole(req.user.roles, 'admin') || hasRole(req.user.roles, 'manager');
    if (!isAdminOrManager) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์มอบหมายงาน: เฉพาะ Admin และ Manager เท่านั้น' });
    }

    // 3. ตรวจสอบ assignee ใหม่
    const newAssignee = await prisma.user.findUnique({ where: { id: Number(assigneeId) } });
    if (!newAssignee) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้รับงานที่ระบุ' });
    }

    // 4. Update job
    const updateData = {
      assignee: { connect: { id: Number(assigneeId) } },
      assignedAt: new Date(),
    };
    // ถ้า job ผ่านการอนุมัติแล้ว (approved/pending_approval) → เปลี่ยนเป็น assigned
    if (['approved', 'pending_approval'].includes(job.status)) {
      updateData.status = 'assigned';
      updateData.startedAt = new Date();
    }

    await prisma.job.update({ where: { id: Number(id) }, data: updateData });

    // 5. Log activity
    await prisma.activityLog.create({
      data: {
        jobId: Number(id),
        userId,
        action: 'assigned',
        message: `มอบหมายงานให้ ${newAssignee.firstName} ${newAssignee.lastName}`
      }
    });

    // 6. Notifications (non-blocking)
    try {
      await notificationService.createNotification({
        tenantId,
        userId: Number(assigneeId),
        type: 'job_assigned',
        title: `👤 คุณได้รับมอบหมายงาน: ${job.djId}`,
        message: `งาน "${job.subject}" ถูกมอบหมายให้คุณ`,
        link: `/jobs/${id}`
      });

      if (newAssignee.email) {
        const emailService = new EmailService();
        const magicLink = await magicLinkService.createJobActionLink({
          userId: Number(assigneeId),
          jobId: Number(id),
          action: 'view',
          djId: job.djId
        });
        const emailHtml = createJobAssignmentEmail({
          djId: job.djId,
          subject: job.subject,
          priority: job.priority || 'normal',
          dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString('th-TH') : null,
          magicLink,
          assigneeName: `${newAssignee.firstName} ${newAssignee.lastName}`
        });
        await emailService.sendEmail(
          newAssignee.email,
          `👤 คุณได้รับมอบหมายงาน: ${job.djId}`,
          emailHtml
        ).catch(err => console.warn('[Assign] Email failed:', err.message));
      }
    } catch (notiErr) {
      console.warn('[Assign] Notification failed (non-blocking):', notiErr.message);
    }

    res.json({
      success: true,
      message: 'มอบหมายงานสำเร็จ',
      data: {
        assignee: {
          id: newAssignee.id,
          name: `${newAssignee.firstName} ${newAssignee.lastName}`,
          email: newAssignee.email,
          avatar: newAssignee.avatarUrl
        }
      }
    });

  } catch (error) {
    console.error('[Jobs] Assign error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการมอบหมายงาน' });
  }
});

/**
 * POST /api/jobs/:id/start
 * Start a job (Assignee action) - change status to in_progress
 */
router.post('/:id/start', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { triggerType = 'manual' } = req.body;

    const prisma = getDatabase();

    // 1. Get current job to validate
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // อนุญาตให้เริ่มงานได้ถ้าสถานะเป็น approved, assigned, หรือ pending_dependency 
    // (เพราะถ้าเริ่มทำแล้ว จะกลายเป็น in_progress)
    const canStartStatus = ['approved', 'assigned', 'pending_dependency', 'correction', 'rework', 'returned'];

    if (!canStartStatus.includes(job.status)) {
      return res.json({
        success: false,
        message: 'Job already started or not ready to start',
        currentStatus: job.status
      });
    }

    // 2. Update status and start time
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'in_progress',
        startedAt: job.startedAt || new Date(), // เก็บเวลาเริ่มงานครั้งแรกเท่านั้น
      }
    });

    // 3. Log Activity
    await prisma.activityLog.create({
      data: {
        jobId,
        userId,
        action: 'job_started',
        message: `เริ่มดำเนินการงาน (${triggerType})`,
      }
    });

    // 4. Notify Requester
    if (job.requesterId && job.requesterId !== userId) {
      await notificationService.createNotification({
        tenantId: job.tenantId,
        userId: job.requesterId,
        type: 'job_started',
        title: `▶️ งาน ${job.djId} เริ่มดำเนินการแล้ว`,
        message: `ผู้รับงานเริ่มดำเนินการงาน "${job.subject}" แล้ว`,
        link: `/jobs/${jobId}`
      }).catch(err => console.warn('[StartJob] Noti failed:', err.message));
    }

    res.json({
      success: true,
      data: updatedJob
    });
  } catch (error) {
    console.error('[Jobs] Start job error:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถเริ่มงานได้: ' + error.message
    });
  }
});

/**
 * POST /api/jobs/:id/complete
 * Complete a job (Assignee action)
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { note, attachments } = req.body;

    // Use ApprovalService (or rename it to JobWorkflowService later)
    const result = await approvalService.completeJob({
      jobId,
      userId,
      note,
      attachments
    });

    // 🔔 Notify Requester: งานเสร็จสมบูรณ์
    if (result.success) {
      try {
        const prisma = getDatabase();
        const completedJobInfo = await prisma.job.findUnique({
          where: { id: jobId },
          select: { requesterId: true, djId: true, subject: true, tenantId: true, assignee: { select: { firstName: true, lastName: true } } }
        });
        if (completedJobInfo?.requesterId && completedJobInfo.requesterId !== userId) {
          const assigneeName = completedJobInfo.assignee ? `${completedJobInfo.assignee.firstName} ${completedJobInfo.assignee.lastName}`.trim() : 'ผู้รับงาน';
          await notificationService.createNotification({
            tenantId: completedJobInfo.tenantId,
            userId: completedJobInfo.requesterId,
            type: 'job_completed',
            title: `งาน ${completedJobInfo.djId} เสร็จสมบูรณ์`,
            message: `${assigneeName} ทำงาน "${completedJobInfo.subject}" เสร็จแล้ว`,
            link: `/jobs/${jobId}`
          });
        }
      } catch (notiError) {
        console.error('[Jobs] Complete notification error (non-blocking):', notiError);
      }

      // 🔥 Trigger Job Chain (Sequential Jobs)
      try {
        await jobService.onJobCompleted(jobId, userId);

        // ✅ NEW: Notify next job in chain (Part D)
        const prisma = getDatabase();
        const notification = await chainService.notifyNextJob(jobId, prisma);

        if (notification.notified) {
          console.log(
            `[Jobs] Chain Notification: ${notification.message}`,
            { nextJobId: notification.nextJob.id }
          );
        }
      } catch (chainError) {
        console.error('[Jobs] Sequential Job Trigger Failed:', chainError);
        // Don't fail the request, just log error
      }

      // ✅ NEW: Check Parent Job Closure (Partial Rejection Support)
      try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;

        // Get the completed job to check if it's a child job
        const completedJob = await prisma.job.findUnique({
          where: { id: jobId },
          select: { parentJobId: true }
        });

        if (completedJob && completedJob.parentJobId) {
          // This is a child job, check if parent can be closed
          const closureCheck = await jobChainService.checkParentJobClosure(
            completedJob.parentJobId,
            tenantId
          );

          if (closureCheck.canClose) {
            // Update parent job status
            await prisma.job.update({
              where: { id: completedJob.parentJobId },
              data: { status: closureCheck.newStatus }
            });

            // Log activity on parent job
            await prisma.activityLog.create({
              data: {
                jobId: completedJob.parentJobId,
                userId,
                action: 'parent_job_closed',
                message: closureCheck.newStatus === 'completed'
                  ? 'Parent job completed: ทุก child jobs เสร็จสมบูรณ์'
                  : 'Parent job partially completed: บาง child jobs ถูกปฏิเสธ',
                detail: {
                  closureReason: closureCheck.reason,
                  stats: closureCheck.stats
                }
              }
            }).catch(err => console.error('[Jobs] Failed to log parent closure:', err));

            console.log(
              `[Jobs] Parent Job Closure: Parent ${completedJob.parentJobId} → ${closureCheck.newStatus}`,
              closureCheck.stats
            );
          }
        }
      } catch (closureError) {
        console.error('[Jobs] Parent job closure check failed (non-blocking):', closureError);
        // Don't fail the request
      }
    }

    res.json(result);
  } catch (error) {
    console.error('[Jobs] Complete job error:', error);
    res.status(500).json({
      success: false,
      error: 'COMPLETE_JOB_FAILED',
      message: 'ไม่สามารถจบงานได้'
    });
  }
});

/**
 * POST /api/jobs/:id/extend
 * Extend job due date (Assignee only)
 * 
 * Body: {
 *   extensionDays: number,
 *   reason: string
 * }
 */
router.post('/:id/extend', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { extensionDays, reason } = req.body;

    // Validation
    if (!extensionDays || extensionDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Extension days must be greater than 0'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Extension reason is required'
      });
    }

    const jobAcceptanceService = require('../services/jobAcceptanceService');

    const updatedJob = await jobAcceptanceService.extendJobManually(
      jobId,
      userId,
      extensionDays,
      reason
    );

    // Notify Requester
    try {
      const prisma = getDatabase();
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { requesterId: true, djId: true, subject: true, tenantId: true, assignee: { select: { firstName: true, lastName: true } } }
      });
      if (job?.requesterId && job.requesterId !== userId) {
        await notificationService.createNotification({
          tenantId: job.tenantId,
          userId: job.requesterId,
          type: 'job_extended',
          title: `⏰ งาน ${job.djId} ขอขยายเวลา ${extensionDays} วัน`,
          message: `${job.assignee?.firstName || 'ผู้รับงาน'} ขอขยายเวลางาน "${job.subject}" เหตุผล: ${reason}`,
          link: `/jobs/${jobId}`
        }).catch(err => console.warn('[Extend] Noti failed:', err.message));

        // Email Requester with Magic Link
        const requester = await prisma.user.findUnique({
          where: { id: job.requesterId },
          select: { email: true, firstName: true, lastName: true }
        });
        if (requester?.email) {
          const emailService = new EmailService();
          const magicLink = await magicLinkService.createJobActionLink({
            userId: job.requesterId,
            jobId: jobId,
            action: 'view',
            djId: job.djId
          });
          const emailHtml = createJobExtensionEmail({
            djId: job.djId,
            subject: job.subject,
            assigneeName: `${job.assignee?.firstName || 'ผู้รับงาน'} ${job.assignee?.lastName || ''}`,
            extensionDays,
            newDueDate: updatedJob.dueDate ? new Date(updatedJob.dueDate).toLocaleDateString('th-TH') : '-',
            reason,
            magicLink,
            requesterName: `${requester.firstName} ${requester.lastName}`
          });
          await emailService.sendEmail(requester.email, `⏰ งาน ${job.djId} ขอขยายเวลา`, emailHtml)
            .catch(err => console.warn('[Extend] Email failed:', err.message));
        }
      }
    } catch (notiErr) {
      console.warn('[Extend] Notification failed (non-blocking):', notiErr.message);
    }

    res.json({
      success: true,
      message: `Job extended by ${extensionDays} day(s)`,
      data: {
        jobId: updatedJob.id,
        djId: updatedJob.djId,
        originalDueDate: updatedJob.originalDueDate,
        newDueDate: updatedJob.dueDate,
        extensionCount: updatedJob.extensionCount,
        extensionReason: updatedJob.extensionReason
      }
    });
  } catch (error) {
    console.error('[Jobs] Extend error:', error);

    if (error.message === 'Job not found') {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (error.message === 'Only assignee can extend the job') {
      return res.status(403).json({ success: false, message: 'Only assignee can extend the job' });
    }

    if (error.message === 'Cannot extend job in current status') {
      return res.status(400).json({ success: false, message: 'Cannot extend job in current status' });
    }

    res.status(500).json({ success: false, message: 'Failed to extend job' });
  }
});

/**
 * GET /api/jobs/:id/sla-info
 * Get SLA information for a job
 */
router.get('/:id/sla-info', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);

    const jobAcceptanceService = require('../services/jobAcceptanceService');
    const slaInfo = await jobAcceptanceService.getJobSlaInfo(jobId);

    res.json({
      success: true,
      data: slaInfo
    });
  } catch (error) {
    console.error('[Jobs] SLA Info error:', error);

    if (error.message === 'Job not found') {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.status(500).json({ success: false, message: 'Failed to get SLA info' });
  }
});

/**
 * POST /api/jobs/:id/submit-draft
 * Submit draft for review (Assignee sends draft to Requester + Approvers for feedback)
 * 
 * Body: {
 *   link?: string,
 *   note?: string
 * }
 */
router.post('/:id/submit-draft', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { link, note } = req.body;
    const prisma = getDatabase();

    // Get job with relations
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        approvals: {
          select: {
            approverId: true,
            approver: { select: { id: true, email: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Check permission: only assignee can submit draft
    if (job.assigneeId !== userId) {
      return res.status(403).json({ success: false, message: 'Only assignee can submit draft' });
    }

    // Check status
    const allowedStatuses = ['approved', 'assigned', 'in_progress', 'correction', 'rework', 'returned', 'draft_review'];
    if (!allowedStatuses.includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit draft in status: ${job.status}`
      });
    }

    // Prepare draft files - append to existing array
    const existingDrafts = Array.isArray(job.draftFiles) ? job.draftFiles : [];
    const newDraft = link ? { name: 'Draft Link', url: link, note, submittedAt: new Date() } : null;
    const updatedDraftFiles = newDraft ? [...existingDrafts, newDraft] : existingDrafts;

    // Update job (handle null draftCount)
    const currentDraftCount = job.draftCount || 0;
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'draft_review',
        draftFiles: updatedDraftFiles,
        draftSubmittedAt: new Date(),
        draftCount: currentDraftCount + 1
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        jobId,
        userId,
        action: 'draft_submitted',
        message: `ส่ง Draft ครั้งที่ ${updatedJob.draftCount}${note ? ': ' + note : ''}`,
        detail: { link, note, draftCount: updatedJob.draftCount }
      }
    });

    // Get last-level approvers from ApprovalFlow (ไม่ใช่ทุกคนใน job.approvals)
    // เฉพาะ approver level สุดท้ายของ flow เท่านั้นที่ต้องรีวิว draft
    const lastLevelApproverIds = [];
    try {
      const flow = await approvalService.getApprovalFlow(job.projectId, job.jobTypeId);
      if (flow?.approverSteps && Array.isArray(flow.approverSteps) && flow.approverSteps.length > 0) {
        const lastStep = flow.approverSteps[flow.approverSteps.length - 1];
        if (lastStep?.approvers && Array.isArray(lastStep.approvers)) {
          lastStep.approvers.forEach(a => {
            const approverId = a.id || a.userId;
            if (approverId && !lastLevelApproverIds.includes(approverId)) {
              lastLevelApproverIds.push(approverId);
            }
          });
        }
      } else {
        // Fallback: ถ้าไม่มี flow ใช้ job.approvals แต่เฉพาะ stepNumber สูงสุด
        if (job.approvals && job.approvals.length > 0) {
          const maxStep = Math.max(...job.approvals.map(a => a.stepNumber || 0));
          job.approvals
            .filter(a => (a.stepNumber || 0) === maxStep)
            .forEach(a => {
              if (a.approverId && !lastLevelApproverIds.includes(a.approverId)) {
                lastLevelApproverIds.push(a.approverId);
              }
            });
        }
      }
    } catch (flowErr) {
      console.warn('[SubmitDraft] Could not get approval flow for last-level approvers:', flowErr.message);
    }

    console.log(`[SubmitDraft] Notifying requester=${job.requesterId}, lastLevelApprovers=${JSON.stringify(lastLevelApproverIds)}`);

    // Notify Requester
    if (job.requesterId) {
      await notificationService.createNotification({
        tenantId,
        userId: job.requesterId,
        type: 'draft_submitted',
        title: `📝 Draft งาน ${job.djId} ส่งมาแล้ว`,
        message: `${job.assignee?.firstName || 'ผู้รับงาน'} ส่ง draft งาน "${job.subject}" มาให้ตรวจสอบ${note ? ': ' + note : ''}`,
        link: `/jobs/${jobId}`
      }).catch(err => console.warn('[SubmitDraft] Notification to requester failed:', err));
    }

    // Notify เฉพาะ last-level approvers (ไม่ซ้ำ requester)
    await Promise.allSettled(
      lastLevelApproverIds
        .filter(approverId => approverId !== job.requesterId)
        .map(approverId =>
          notificationService.createNotification({
            tenantId,
            userId: approverId,
            type: 'draft_submitted',
            title: `📝 Draft งาน ${job.djId} ส่งมาแล้ว`,
            message: `${job.assignee?.firstName || 'ผู้รับงาน'} ส่ง draft งาน "${job.subject}" มาให้ตรวจสอบ`,
            link: `/jobs/${jobId}`
          }).catch(err => console.warn('[SubmitDraft] Notification to last-level approver failed:', err))
        )
    );

    // Send Email to Requester + Approvers
    try {
      const emailService = new EmailService();

      const recipients = [];
      if (job.requester?.email) recipients.push(job.requester.email);

      // Get last-level approver emails
      if (lastLevelApproverIds.length > 0) {
        const approvers = await prisma.user.findMany({
          where: { id: { in: lastLevelApproverIds } },
          select: { email: true }
        });
        approvers.forEach(a => {
          if (a.email && !recipients.includes(a.email)) {
            recipients.push(a.email);
          }
        });
      }

      // ⚡ Performance: ส่ง email แบบ parallel แทน sequential
      const emailSubject = `📝 Draft งาน ${job.djId} ส่งมาแล้ว`;
      const emailBody = `
            <h2>Draft งานส่งมาแล้ว</h2>
            <p><strong>งาน:</strong> ${job.djId} - ${job.subject}</p>
            <p><strong>ผู้ส่ง:</strong> ${job.assignee?.firstName || ''} ${job.assignee?.lastName || ''}</p>
            ${note ? `<p><strong>หมายเหตุ:</strong> ${note}</p>` : ''}
            ${link ? `<p><strong>ลิงก์ Draft:</strong> <a href="${link}">${link}</a></p>` : ''}
            <p>กรุณาตรวจสอบและให้ feedback ในระบบ</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobId}">ดูรายละเอียดงาน</a></p>
          `;
      await Promise.allSettled(
        recipients.map(email =>
          emailService.sendEmail(email, emailSubject, emailBody)
            .catch(err => console.warn('[SubmitDraft] Email failed:', err))
        )
      );
    } catch (emailErr) {
      console.error('[SubmitDraft] Email error:', emailErr);
    }

    res.json({
      success: true,
      message: 'Draft submitted successfully',
      data: {
        jobId: updatedJob.id,
        djId: updatedJob.djId,
        status: updatedJob.status,
        draftCount: updatedJob.draftCount
      }
    });
  } catch (error) {
    console.error('[Jobs] Submit draft error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: 'SUBMIT_DRAFT_FAILED',
      message: 'ไม่สามารถส่ง draft ได้',
      detail: error.message
    });
  }
});

/**
 * POST /api/jobs/:id/approve-draft
 * Requester approves or rejects draft submission
 * 
 * Body: {
 *   action: 'approve' | 'reject' (required)
 *   reason: string (required)
 * }
 */
router.post('/:id/approve-draft', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { action, reason } = req.body;
    const prisma = getDatabase();

    // Validation
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }

    // Get job with relations
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        approvals: {
          select: {
            approverId: true,
            approver: { select: { id: true, email: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Check permission: only requester can approve/reject draft
    if (job.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only requester can approve or reject draft'
      });
    }

    // Check status
    if (job.status !== 'draft_review') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve/reject draft in status: ${job.status}`
      });
    }

    // Update job status
    const newStatus = action === 'approve' ? 'in_progress' : 'rework';
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: newStatus }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        jobId,
        userId,
        action: action === 'approve' ? 'draft_approved' : 'draft_rejected',
        message: `${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} Draft: ${reason.trim()}`,
        detail: { action, reason: reason.trim() }
      }
    });

    // Add comment to chat
    await prisma.jobComment.create({
      data: {
        tenantId,
        jobId,
        userId,
        comment: `${action === 'approve' ? '✅ อนุมัติ Draft' : '❌ ปฏิเสธ Draft'}: ${reason.trim()}`
      }
    });

    // Notify Assignee
    if (job.assigneeId) {
      await notificationService.createNotification({
        tenantId,
        userId: job.assigneeId,
        type: action === 'approve' ? 'draft_approved' : 'draft_rejected',
        title: action === 'approve'
          ? `✅ Draft งาน ${job.djId} ผ่านการตรวจสอบ`
          : `❌ Draft งาน ${job.djId} ไม่ผ่าน`,
        message: `${job.requester?.firstName || 'Requester'} ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} draft: ${reason.trim()}`,
        link: `/jobs/${jobId}`
      }).catch(err => console.warn('[ApproveDraft] Notification to assignee failed:', err));
    }

    // Get last-level approvers (same logic as submit-draft)
    const lastLevelApproverIds = [];
    try {
      const flow = await approvalService.getApprovalFlow(job.projectId, job.jobTypeId);
      if (flow?.approverSteps && Array.isArray(flow.approverSteps) && flow.approverSteps.length > 0) {
        const lastStep = flow.approverSteps[flow.approverSteps.length - 1];
        if (lastStep?.approvers && Array.isArray(lastStep.approvers)) {
          lastStep.approvers.forEach(a => {
            const approverId = a.id || a.userId;
            if (approverId && !lastLevelApproverIds.includes(approverId)) {
              lastLevelApproverIds.push(approverId);
            }
          });
        }
      } else {
        // Fallback: use job.approvals
        if (job.approvals && job.approvals.length > 0) {
          const maxStep = Math.max(...job.approvals.map(a => a.stepNumber || 0));
          job.approvals
            .filter(a => (a.stepNumber || 0) === maxStep)
            .forEach(a => {
              if (a.approverId && !lastLevelApproverIds.includes(a.approverId)) {
                lastLevelApproverIds.push(a.approverId);
              }
            });
        }
      }
    } catch (flowErr) {
      console.warn('[ApproveDraft] Could not get approval flow for last-level approvers:', flowErr.message);
    }

    // Notify last-level approvers (exclude requester)
    await Promise.allSettled(
      lastLevelApproverIds
        .filter(approverId => approverId !== job.requesterId)
        .map(approverId =>
          notificationService.createNotification({
            tenantId,
            userId: approverId,
            type: action === 'approve' ? 'draft_approved' : 'draft_rejected',
            title: action === 'approve'
              ? `✅ Draft งาน ${job.djId} ผ่านการตรวจสอบ`
              : `❌ Draft งาน ${job.djId} ไม่ผ่าน`,
            message: `${job.requester?.firstName || 'Requester'} ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} draft`,
            link: `/jobs/${jobId}`
          }).catch(err => console.warn('[ApproveDraft] Notification to approver failed:', err))
        )
    );

    // Send Email (optional)
    try {
      const emailService = new EmailService();
      const recipients = [];

      if (job.assignee?.email) recipients.push(job.assignee.email);

      // Get last-level approver emails
      if (lastLevelApproverIds.length > 0) {
        const approvers = await prisma.user.findMany({
          where: { id: { in: lastLevelApproverIds } },
          select: { email: true }
        });
        approvers.forEach(a => {
          if (a.email && !recipients.includes(a.email)) {
            recipients.push(a.email);
          }
        });
      }

      if (recipients.length > 0) {
        const emailSubject = action === 'approve'
          ? `✅ Draft งาน ${job.djId} ผ่านการตรวจสอบ`
          : `❌ Draft งาน ${job.djId} ไม่ผ่าน`;
        const emailBody = `
          <h2>${action === 'approve' ? 'Draft ผ่านการตรวจสอบ' : 'Draft ไม่ผ่านการตรวจสอบ'}</h2>
          <p><strong>งาน:</strong> ${job.djId} - ${job.subject}</p>
          <p><strong>ผู้ตรวจสอบ:</strong> ${job.requester?.firstName || ''} ${job.requester?.lastName || ''}</p>
          <p><strong>${action === 'approve' ? 'ความเห็น' : 'เหตุผล'}:</strong> ${reason.trim()}</p>
          <p>${action === 'approve' ? 'สามารถทำงานต่อได้เลย' : 'กรุณาแก้ไขและส่ง draft ใหม่'}</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobId}">ดูรายละเอียดงาน</a></p>
        `;
        await Promise.allSettled(
          recipients.map(email =>
            emailService.sendEmail(email, emailSubject, emailBody)
              .catch(err => console.warn('[ApproveDraft] Email failed:', err))
          )
        );
      }
    } catch (emailErr) {
      console.error('[ApproveDraft] Email error:', emailErr);
    }

    res.json({
      success: true,
      message: `Draft ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        jobId: updatedJob.id,
        djId: updatedJob.djId,
        status: updatedJob.status
      }
    });
  } catch (error) {
    console.error('[ApproveDraft] Error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: 'APPROVE_DRAFT_FAILED',
      message: 'ไม่สามารถบันทึกการอนุมัติได้',
      detail: error.message
    });
  }
});

/**
 * POST /api/jobs/:id/rebrief
 * Request rebrief from Requester (Assignee requests more info)
 * 
 * Body: {
 *   reason: string (required)
 * }
 */
router.post('/:id/rebrief', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { reason } = req.body;
    const prisma = getDatabase();

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rebrief reason is required'
      });
    }

    // Get job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Check permission
    if (job.assigneeId !== userId) {
      return res.status(403).json({ success: false, message: 'Only assignee can request rebrief' });
    }

    // Check status
    const allowedStatuses = ['approved', 'assigned', 'in_progress', 'correction', 'rework', 'returned', 'rebrief_submitted'];
    if (!allowedStatuses.includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot request rebrief in status: ${job.status}`
      });
    }

    // Update job (handle null rebriefCount)
    const currentRebriefCount = job.rebriefCount || 0;
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'pending_rebrief',
        rebriefReason: reason.trim(),
        rebriefAt: new Date(),
        rebriefCount: currentRebriefCount + 1
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        jobId,
        userId,
        action: 'rebrief_requested',
        message: `ขอ Rebrief ครั้งที่ ${updatedJob.rebriefCount}: ${reason.trim()}`,
        detail: { reason: reason.trim(), rebriefCount: updatedJob.rebriefCount }
      }
    });

    // Notify Requester
    if (job.requesterId) {
      await notificationService.createNotification({
        tenantId,
        userId: job.requesterId,
        type: 'rebrief_requested',
        title: `🔄 ขอข้อมูลเพิ่มเติม: ${job.djId}`,
        message: `${job.assignee?.firstName || 'ผู้รับงาน'} ขอข้อมูลเพิ่มเติมสำหรับงาน "${job.subject}": ${reason.trim()}`,
        link: `/jobs/${jobId}`
      }).catch(err => console.warn('[Rebrief] Notification failed:', err));
    }

    // Send Email to Requester
    if (job.requester?.email) {
      try {
        const emailService = new EmailService();

        await emailService.sendEmail(
          job.requester.email,
          `🔄 ขอข้อมูลเพิ่มเติม: ${job.djId}`,
          `
            <h2>ขอข้อมูลเพิ่มเติมสำหรับงาน</h2>
            <p><strong>งาน:</strong> ${job.djId} - ${job.subject}</p>
            <p><strong>ผู้ขอ:</strong> ${job.assignee?.firstName || ''} ${job.assignee?.lastName || ''}</p>
            <p><strong>เหตุผล:</strong> ${reason.trim()}</p>
            <p>กรุณาเพิ่มข้อมูลหรือแก้ไข brief ในระบบ</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobId}">ดูรายละเอียดงาน</a></p>
          `
        ).catch(err => console.warn('[Rebrief] Email failed:', err));
      } catch (emailErr) {
        console.error('[Rebrief] Email error:', emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Rebrief requested successfully',
      data: {
        jobId: updatedJob.id,
        djId: updatedJob.djId,
        status: updatedJob.status,
        rebriefCount: updatedJob.rebriefCount
      }
    });
  } catch (error) {
    console.error('[Jobs] Rebrief error:', error);
    res.status(500).json({
      success: false,
      error: 'REBRIEF_FAILED',
      message: 'ไม่สามารถขอ rebrief ได้'
    });
  }
});

/**
 * POST /api/jobs/:id/submit-rebrief
 * Requester submits additional info after rebrief request
 * 
 * Body: {
 *   rebriefResponse: string (required),
 *   description?: string,
 *   briefLink?: string
 * }
 */
router.post('/:id/submit-rebrief', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { rebriefResponse, description, briefLink } = req.body;
    const prisma = getDatabase();

    if (!rebriefResponse || rebriefResponse.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rebrief response is required'
      });
    }

    // Get job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Check permission
    if (job.requesterId !== userId) {
      return res.status(403).json({ success: false, message: 'Only requester can submit rebrief response' });
    }

    // Check status
    if (job.status !== 'pending_rebrief') {
      return res.status(400).json({
        success: false,
        message: `Cannot submit rebrief in status: ${job.status}`
      });
    }

    // Prepare update data
    const updateData = {
      status: 'rebrief_submitted',
      rebriefResponse: rebriefResponse.trim()
    };

    if (description) updateData.description = description.trim();
    if (briefLink) updateData.briefLink = briefLink.trim();

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: updateData
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        jobId,
        userId,
        action: 'rebrief_submitted',
        message: `ส่งข้อมูลเพิ่มเติม: ${rebriefResponse.trim()}`,
        detail: { rebriefResponse: rebriefResponse.trim(), description, briefLink }
      }
    });

    // Notify Assignee
    if (job.assigneeId) {
      await notificationService.createNotification({
        tenantId,
        userId: job.assigneeId,
        type: 'rebrief_submitted',
        title: `✅ ข้อมูลเพิ่มเติมส่งมาแล้ว: ${job.djId}`,
        message: `${job.requester?.firstName || 'ผู้สั่งงาน'} ส่งข้อมูลเพิ่มเติมสำหรับงาน "${job.subject}" มาแล้ว`,
        link: `/jobs/${jobId}`
      }).catch(err => console.warn('[SubmitRebrief] Notification failed:', err));
    }

    // Send Email to Assignee
    if (job.assignee?.email) {
      try {
        const emailService = new EmailService();

        await emailService.sendEmail(
          job.assignee.email,
          `✅ ข้อมูลเพิ่มเติมส่งมาแล้ว: ${job.djId}`,
          `
            <h2>ข้อมูลเพิ่มเติมส่งมาแล้ว</h2>
            <p><strong>งาน:</strong> ${job.djId} - ${job.subject}</p>
            <p><strong>ผู้ส่ง:</strong> ${job.requester?.firstName || ''} ${job.requester?.lastName || ''}</p>
            <p><strong>คำตอบ:</strong> ${rebriefResponse.trim()}</p>
            ${briefLink ? `<p><strong>Brief Link:</strong> <a href="${briefLink}">${briefLink}</a></p>` : ''}
            <p>กรุณาตรวจสอบและตัดสินใจว่าจะรับงานหรือขอ rebrief อีกครั้ง</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobId}">ดูรายละเอียดงาน</a></p>
          `
        ).catch(err => console.warn('[SubmitRebrief] Email failed:', err));
      } catch (emailErr) {
        console.error('[SubmitRebrief] Email error:', emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Rebrief response submitted successfully',
      data: {
        jobId: updatedJob.id,
        djId: updatedJob.djId,
        status: updatedJob.status
      }
    });
  } catch (error) {
    console.error('[Jobs] Submit rebrief error:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMIT_REBRIEF_FAILED',
      message: 'ไม่สามารถส่งข้อมูลเพิ่มเติมได้'
    });
  }
});

/**
 * POST /api/jobs/:id/accept-rebrief
 * Assignee accepts job after rebrief (recalculate SLA)
 * 
 * Body: {}
 */
router.post('/:id/accept-rebrief', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const prisma = getDatabase();

    // Get job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Check permission
    if (job.assigneeId !== userId) {
      return res.status(403).json({ success: false, message: 'Only assignee can accept rebrief' });
    }

    // Check status
    if (job.status !== 'rebrief_submitted') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept rebrief in status: ${job.status}`
      });
    }

    // Calculate new due date using SLA days
    const now = new Date();
    const slaDays = job.slaDays || 3; // Default 3 days if not set

    // Import date-fns for business day calculation
    const { addBusinessDays } = await import('date-fns');
    const newDueDate = addBusinessDays(now, slaDays);

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'in_progress',
        acceptanceDate: now,
        dueDate: newDueDate,
        startedAt: now
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        jobId,
        userId,
        action: 'rebrief_accepted',
        message: `รับงานหลัง Rebrief - คำนวณ SLA ใหม่: ${slaDays} วัน`,
        detail: {
          acceptanceDate: now,
          dueDate: newDueDate,
          slaDays
        }
      }
    });

    // Notify Requester
    if (job.requesterId) {
      await notificationService.createNotification({
        tenantId,
        userId: job.requesterId,
        type: 'rebrief_accepted',
        title: `✅ งาน ${job.djId} รับแล้ว`,
        message: `${job.assignee?.firstName || 'ผู้รับงาน'} รับงาน "${job.subject}" แล้ว กำหนดส่งใหม่: ${newDueDate.toLocaleDateString('th-TH')}`,
        link: `/jobs/${jobId}`
      }).catch(err => console.warn('[AcceptRebrief] Notification failed:', err));
    }

    // Send Email to Requester
    if (job.requester?.email) {
      try {
        const emailService = new EmailService();

        await emailService.sendEmail(
          job.requester.email,
          `✅ งาน ${job.djId} รับแล้ว`,
          `
            <h2>งานได้รับการยอมรับแล้ว</h2>
            <p><strong>งาน:</strong> ${job.djId} - ${job.subject}</p>
            <p><strong>ผู้รับงาน:</strong> ${job.assignee?.firstName || ''} ${job.assignee?.lastName || ''}</p>
            <p><strong>วันที่รับงาน:</strong> ${now.toLocaleDateString('th-TH')}</p>
            <p><strong>กำหนดส่งใหม่:</strong> ${newDueDate.toLocaleDateString('th-TH')} (${slaDays} วันทำการ)</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobId}">ดูรายละเอียดงาน</a></p>
          `
        ).catch(err => console.warn('[AcceptRebrief] Email failed:', err));
      } catch (emailErr) {
        console.error('[AcceptRebrief] Email error:', emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Job accepted after rebrief',
      data: {
        jobId: updatedJob.id,
        djId: updatedJob.djId,
        status: updatedJob.status,
        acceptanceDate: updatedJob.acceptanceDate,
        dueDate: updatedJob.dueDate,
        slaDays
      }
    });
  } catch (error) {
    console.error('[Jobs] Accept rebrief error:', error);
    res.status(500).json({
      success: false,
      error: 'ACCEPT_REBRIEF_FAILED',
      message: 'ไม่สามารถรับงานได้'
    });
  }
});

export default router;
