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

const approvalService = new ApprovalService();
const jobService = new JobService();

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

    // Multi-role support: role can be comma-separated (e.g. "requester,approver")
    const roles = role.split(',').map(r => r.trim().toLowerCase()).filter(Boolean);

    // Helper: build where condition for a single role
    const buildRoleCondition = async (singleRole) => {
      switch (singleRole) {
        case 'requester':
          // ✅ Requester sees ALL jobs they created (parent, child, and single jobs)
          // This provides full transparency - if they create a parent with 3 children,
          // they should see all 4 jobs (1 parent + 3 children)
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
          // ✅ Approver sees ALL jobs with any pending approval status
          // Frontend JobActionPanel will determine if user can approve based on approval flow
          // This query gets all pending jobs - both explicit (pending_approval/pending_level_N)
          // JobActionPanel checks flowSnapshot to show approve buttons only when authorized
          const allJobs = await prisma.job.findMany({
            where: {
              tenantId,
              OR: [
                { status: 'pending_approval' },
                { status: { startsWith: 'pending_level_' } }
              ],
              isParent: false  // Only child + single jobs (not parent jobs)
            },
            select: { id: true }
          });

          const jobIds = allJobs.map(j => j.id);

          if (jobIds.length === 0) {
            return null;  // Signal no jobs found
          }

          return {
            id: { in: jobIds }
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
        case 'admin':
          return {}; // no additional filter = see all
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
        where.status = 'in_progress';
      } else if (status === 'waiting') {
        where.status = { in: ['correction', 'pending_approval'] };
      } else if (status === 'done') {
        where.status = { in: ['completed', 'closed'] };
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
          // Parent-Child relationship fields
          isParent: true,
          parentJobId: true
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take
      }),
      prisma.job.count({ where })
    ]);

    // Transform to frontend format
    const transformed = jobs.map(j => ({
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
      completedAt: j.completedAt
    }));

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
    const flow = await approvalService.getApprovalFlow(projectId, jobTypeId);

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

    // ถ้ามีการระบุ Acceptance Date มา
    if (acceptanceDate) {
      acceptanceMethod = 'manual';

      // คำนวณ Due Date ใหม่จาก Acceptance Date + SLA
      if (jobType.slaWorkingDays) {
        calculatedDueDate = jobAcceptanceService.calculateDueDate(
          acceptanceDate,
          jobType.slaWorkingDays
        );

        console.log(`[Jobs] Calculated Due Date from Acceptance Date: ${calculatedDueDate}`);
      }
    } else {
      // ถ้าไม่ระบุ Acceptance Date ให้ใช้วันที่สร้างงาน
      acceptanceDate = now;
      acceptanceMethod = 'auto';
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
        tenantId
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
    } catch (logError) {
      // ถ้า Log ไม่สำเร็จไม่ต้องหยุดการทำงาน
      console.warn('[Jobs] Activity log failed:', logError.message);
    }

    // ============================================
    // Step 9: Send Notifications (Future Enhancement)
    // TODO: แจ้งเตือนผู้ที่เกี่ยวข้อง
    // - pending_approval → แจ้ง Approver
    // - assigned → แจ้ง Assignee
    // ============================================
    // await notificationService.sendJobCreatedNotification(result.job);

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
          select: { id: true, name: true, icon: true, colorTheme: true, slaWorkingDays: true }
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
          select: { id: true, name: true, quantity: true, status: true },
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
            dueDate: true
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
        deadline: child.dueDate
      })) || [],
      // Parent job for child
      parentJob: job.parentJob ? {
        id: job.parentJob.id,
        djId: job.parentJob.djId,
        subject: job.parentJob.subject,
        status: job.parentJob.status
      } : null,
      items: job.jobItems || [],
      attachments: job.attachments || [],

      // Completion Details
      completedAt: job.completedAt,
      finalFiles: job.finalFiles,
      completedByUser: job.completedByUser ? {
        id: job.completedByUser.id,
        name: `${job.completedByUser.firstName || ''} ${job.completedByUser.lastName || ''}`.trim(),
        email: job.completedByUser.email,
        avatar: job.completedByUser.avatarUrl
      } : null,
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

    // ✅ NEW: Handle Urgent Job Rescheduling (Part D)
    if (result.success) {
      try {
        const prisma = getDatabase();
        const jobId = parseInt(id);

        // Get job details
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: {
            priority: true,
            assigneeId: true,
            dueDate: true
          }
        });

        // If urgent job, reschedule competing jobs
        if (job && job.priority === 'urgent' && job.assigneeId && job.dueDate) {
          const rescheduleResult = await chainService.rescheduleForUrgent(job, prisma);

          if (rescheduleResult.rescheduled > 0) {
            console.log(
              `[Jobs] Urgent Job Rescheduled: ${rescheduleResult.rescheduled} competing jobs shifted +${rescheduleResult.shiftDays} days`,
              { affected: rescheduleResult.affected.map(a => a.djId) }
            );

            // Append reschedule info to result
            result.rescheduled = rescheduleResult;
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
        status: true,
        assigneeId: true,
        projectId: true,
        jobTypeId: true,
        requesterId: true
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

    // Get approval flow to determine approvers
    let approverIds = [];
    let approverLevel = null;
    let approvalLogic = 'ANY'; // Default: any approver can approve

    try {
      const approvalFlow = await approvalService.getApprovalFlow(job.projectId, job.jobTypeId);

      if (approvalFlow && approvalFlow.approverSteps && approvalFlow.approverSteps.length > 0) {
        // Use first level approvers for rejection approval
        const level1 = approvalFlow.approverSteps.find(s => s.stepNumber === 1);
        if (level1 && level1.approvers) {
          approverLevel = 1;
          approverIds = level1.approvers.map(a => a.id || a.userId).filter(Boolean);
          approvalLogic = level1.allMustApprove ? 'ALL' : 'ANY';
        }
      }
    } catch (flowErr) {
      console.warn('[Jobs] Could not get approval flow for rejection request:', flowErr);
    }

    // If no approvers found from flow, use requester as fallback
    if (approverIds.length === 0) {
      approverIds = [job.requesterId];
      approvalLogic = 'ANY';
    }

    // Calculate auto-close time (24 hours from now)
    const autoCloseAt = new Date();
    autoCloseAt.setHours(autoCloseAt.getHours() + 24);

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
    await prisma.jobActivity.create({
      data: {
        jobId: parseInt(id),
        userId,
        action: 'rejection_requested',
        message: 'Assignee ขอปฏิเสธงาน',
        detail: {
          reason: reason.trim(),
          rejectionRequestId: rejectionRequest.id,
          autoCloseAt: autoCloseAt.toISOString()
        },
        tenantId
      }
    }).catch(err => console.error('[Jobs] Failed to log activity:', err));

    // TODO: Send notification to approvers (via Socket.io or email)

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
    console.error('[Jobs] Request rejection error:', error);
    res.status(500).json({
      success: false,
      error: 'REQUEST_REJECTION_FAILED',
      message: 'ไม่สามารถส่งคำขอปฏิเสธงานได้'
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
    if (!rejectionRequest.approverIds.includes(userId)) {
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
    await prisma.jobActivity.create({
      data: {
        jobId: rejectionRequest.jobId,
        userId,
        action: 'rejection_approved',
        message: 'Approver อนุมัติคำขอปฏิเสธจาก Assignee',
        detail: {
          rejectionRequestId: rejectionRequest.id,
          comment: comment || null
        },
        tenantId
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
          await prisma.jobActivity.create({
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
              },
              tenantId
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

    // TODO: Send notification to requester and assignee

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
    if (!rejectionRequest.approverIds.includes(userId)) {
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
    await prisma.jobActivity.create({
      data: {
        jobId: rejectionRequest.jobId,
        userId,
        action: 'rejection_denied',
        message: 'Approver ไม่อนุมัติคำขอปฏิเสธ - สั่งให้ Assignee ทำงานต่อ',
        detail: {
          rejectionRequestId: rejectionRequest.id,
          reason: reason.trim()
        },
        tenantId
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

    // TODO: Send notification to assignee

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

      // 1. Check Flow for ALL children
      for (const childConfig of jobTypes) {
        const jid = parseInt(childConfig.jobTypeId);

        // Get flow config
        const childFlow = await approvalService.getApprovalFlow(parseInt(projectId), jid);
        const levels = approvalService.getApprovalLevels(childFlow);
        const needsApproval = levels > 0;

        childNeedsApprovalMap.set(jid, needsApproval);

        if (needsApproval) {
          allChildrenSkip = false;
        }
      }

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
      // 2.3: Create Parent Job (ใช้ parentDjId ที่สร้างไว้แล้วด้านบน)
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
          dueDate: deadline ? new Date(deadline) : null
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
            tenantId
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
          tenantId
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
    await prisma.job.update({
      where: { id: Number(id) },
      data: {
        assignee: { connect: { id: Number(newAssigneeId) } },
      }
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

    // 🔥 Trigger Job Chain (Sequential Jobs)
    if (result.success) {
      // Logic for Job Chain: Auto-start successor jobs
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
            await prisma.jobActivity.create({
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
                },
                tenantId
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

    // Import jobAcceptanceService
    const jobAcceptanceService = require('../services/jobAcceptanceService');

    const updatedJob = await jobAcceptanceService.extendJobManually(
      jobId,
      userId,
      extensionDays,
      reason
    );

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

export default router;
