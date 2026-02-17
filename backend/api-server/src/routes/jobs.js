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

    // Role-based filtering
    switch (role.toLowerCase()) {
      case 'requester':
        where.requesterId = userId;
        break;
      case 'assignee':
        where.assigneeId = userId;
        break;
      case 'approver': {
        // 🔥 User Portal Logic: Show ONLY jobs waiting for THIS user to approve
        // Uses approval_flows.approverSteps (JSON) to match user with current level
        console.log('[Approver Query] 🔍 Finding approval flows for user:', userId, 'tenantId:', tenantId);

        // Step 1: Get all active approval flows in this tenant
        const allFlows = await prisma.approvalFlow.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, projectId: true, jobTypeId: true, approverSteps: true, name: true }
        });
        console.log('[Approver Query] 📋 Total active flows in tenant:', allFlows.length);
        allFlows.forEach(f => {
          const steps = f.approverSteps || [];
          const allApproverIds = steps.flatMap(s => (s.approvers || []).map(a => a.userId));
          console.log(`  Flow #${f.id} "${f.name}" project:${f.projectId} jobType:${f.jobTypeId} approverIds:[${allApproverIds}]`);
        });

        // Step 2: Find flows where this user is an approver, and at which level
        const orConditions = [];
        for (const flow of allFlows) {
          const steps = flow.approverSteps || [];
          for (const step of steps) {
            const isApprover = step.approvers?.some(a => {
              const stepUserId = parseInt(a.userId);
              const match = stepUserId === userId;
              if (match) console.log(`  ✅ MATCH: flow #${flow.id} level ${step.level} approver ${a.name} (${a.userId}) == user ${userId}`);
              return match;
            });
            if (isApprover) {
              // Map level to job status: level 1 = 'pending_approval', level N = 'pending_level_N'
              const statusForLevel = step.level === 1 ? 'pending_approval' : `pending_level_${step.level}`;
              const condition = {
                projectId: flow.projectId,
                status: statusForLevel
              };
              // If flow is job-type-specific, filter by jobTypeId too
              if (flow.jobTypeId) {
                condition.jobTypeId = flow.jobTypeId;
              }
              orConditions.push(condition);
            }
          }
        }

        console.log('[Approver Query] 📊 Found', orConditions.length, 'matching flow+level combinations');
        if (orConditions.length > 0) {
          console.log('[Approver Query] OR conditions:', JSON.stringify(orConditions));
        }

        if (orConditions.length === 0) {
          console.log('[Approver Query] ⚠️ User is not an approver in any flow - returning empty');
          return res.json({
            success: true,
            data: [],
            message: 'คุณยังไม่ได้ถูกเพิ่มเป็นผู้อนุมัติในโครงการใดๆ กรุณาติดต่อ Admin เพื่อขอสิทธิ์',  // ✅ FIX: Added helpful message
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
          });
        }

        // Step 3: Query jobs matching any of the conditions
        where.OR = orConditions;
        console.log('[Approver Query] 🎯 Querying with', orConditions.length, 'OR conditions');
        break;
      }

      case 'manager':
        // Legacy/Manager View: See all pending jobs (broad view) inside tenant
        where.status = { in: ['pending_approval', 'pending_level_1', 'pending_level_2'] };
        // Visibility Logic: Hide children if parent is still pending (Show only Parent)
        where.AND = [
          {
            OR: [
              { isParent: true },
              { parentJobId: null },
              { parentJob: { status: { notIn: ['pending_approval'] } } }
            ]
          }
        ];
        break;
      case 'superadmin':
      case 'admin':
        // Admin sees all jobs (no additional filter)
        break;
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

    if (role.toLowerCase() === 'approver') {
      console.log('[Approver Query] 📦 Final where:', JSON.stringify(where, null, 2));
    }

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

    if (role.toLowerCase() === 'approver') {
      console.log(`[Approver Query] 🏁 Result: ${total} total jobs, ${jobs.length} returned`);
      jobs.forEach(j => console.log(`  - Job #${j.id} (${j.djId}) status:${j.status} project:${j.project?.name}`));
    }

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
      requesterId: j.requesterId,
      requester: j.requester?.displayName || `${j.requester?.firstName} ${j.requester?.lastName}`.trim(),
      requesterAvatar: j.requester?.avatarUrl,
      assigneeId: j.assigneeId,
      assignee: j.assignee?.displayName || (j.assignee ? `${j.assignee?.firstName} ${j.assignee?.lastName}`.trim() : null),
      assigneeAvatar: j.assignee?.avatarUrl,
      // Parent-Child relationship metadata
      isParent: j.isParent || false,
      parentJobId: j.parentJobId || null
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
          dueDate: new Date(dueDate),
          objective: objective || null,
          headline: headline || null,
          subHeadline: subHeadline || null,
          description: description || null,
          assigneeId: assigneeId ? parseInt(assigneeId) : null
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

          // อัปเดตงานให้เป็น 'assigned' พร้อมระบุผู้รับผิดชอบ
          await tx.job.update({
            where: { id: newJob.id },
            data: {
              status: 'assigned',
              assigneeId: finalAssigneeId,
              // ถ้ามอบหมายแล้ว ถือว่าเริ่มงานทันที
              startedAt: new Date()
            }
          });

          // อัปเดต Status ใน result
          newJob.status = 'assigned';
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
    // Step 8: Create Activity Log
    // บันทึกประวัติการสร้างงาน
    // ============================================
    try {
      await prisma.activityLog.create({
        data: {
          jobId: result.job.id,
          userId,
          action: 'job_created',
          message: isSkip
            ? `สร้างงาน ${djId} (Skip Approval)`
            : `สร้างงาน ${djId} รอการอนุมัติ`,
          detail: {
            isSkip,
            flowName: flow?.name || 'Default',
            skipApproval: flow?.skipApproval || false,
            autoAssignType: flow?.autoAssignType || 'manual',
            autoAssigned: result.autoAssigned
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
    console.log(`[Jobs] Created job ${djId} with status: ${result.job.status}, skip: ${isSkip}, autoAssigned: ${result.autoAssigned}`);

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
            requesterId: true,  // ✅ FIX: Added for parent/child access check
            jobType: { select: { id: true, name: true } },
            assignee: { select: { id: true, displayName: true } },
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
            status: true,
            requesterId: true  // ✅ FIX: Added for parent/child access check
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

    // Check permission (null-safe roles check)
    // ✅ FIX: Use pre-normalized roles from auth middleware
    const normalizedRoles = req.user.normalizedRoles || [];

    let hasAccess = job.requesterId === req.user.userId ||
      job.assigneeId === req.user.userId ||
      normalizedRoles.includes('admin') ||
      normalizedRoles.includes('manager');

    // ✅ FIX: Check if user is requester of parent job (for child jobs)
    if (!hasAccess && job.parentJobId && job.parentJob) {
      hasAccess = job.parentJob.requesterId === req.user.userId;
    }

    // ✅ FIX: Check if user is requester of any child job (for parent jobs)
    if (!hasAccess && job.isParent && job.childJobs && job.childJobs.length > 0) {
      hasAccess = job.childJobs.some(child => child.requesterId === req.user.userId);
    }

    // Check if user is an approver for this job's project via approval_flows
    if (!hasAccess && normalizedRoles.includes('approver')) {
      const approverFlows = await prisma.approvalFlow.findMany({
        where: {
          tenantId: req.user.tenantId,
          projectId: job.projectId,
          isActive: true
        },
        select: { approverSteps: true }
      });
      for (const flow of approverFlows) {
        const steps = flow.approverSteps || [];
        const isApprover = steps.some(step =>
          step.approvers?.some(a => parseInt(a.userId) === req.user.userId)
        );
        if (isApprover) {
          hasAccess = true;
          break;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ดูงานนี้'
      });
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
        name: job.requester?.displayName || `${job.requester?.firstName} ${job.requester?.lastName}`.trim(),
        email: job.requester?.email,
        avatar: job.requester?.avatarUrl
      },
      assigneeId: job.assigneeId,
      assignee: job.assignee ? {
        id: job.assignee.id,
        name: job.assignee.displayName || `${job.assignee.firstName} ${job.assignee.lastName}`.trim(),
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
        assignee: child.assignee?.displayName,
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
      // Comments for discussion thread
      comments: job.comments?.map(c => ({
        id: c.id,
        comment: c.comment,
        createdAt: c.createdAt,
        user: {
          id: c.user?.id,
          name: c.user?.displayName || `${c.user?.firstName} ${c.user?.lastName}`.trim(),
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
          name: a.user.displayName || `${a.user.firstName} ${a.user.lastName}`.trim(),
          avatar: a.user.avatarUrl
        } : null
      })) || [],
      // 🆕 Transform approvals with approver details
      approvals: job.approvals?.map(a => ({
        id: a.id,
        stepNumber: a.stepNumber,
        status: a.status,
        comment: a.comment,
        approvedAt: a.approvedAt,
        approver: {
          id: a.approver.id,
          displayName: a.approver.displayName ||
            `${a.approver.firstName} ${a.approver.lastName}`.trim(),
          email: a.approver.email,
          avatar: a.approver.avatarUrl
        }
      })) || []
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
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    const result = await approvalService.rejectJobViaWeb({
      jobId: parseInt(id),
      approverId: userId,
      comment,
      ipAddress
    });

    if (result.success) {
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
      deadline
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

          // Needs approval if Flow requires it OR Urgent...
          // AND if it's a dependent job, it should wait (pending_dependency)
          const needsApproval = flowNeedsApproval || isUrgent;

          childStatus = 'pending_approval';

          if (predecessorId) {
            // 🔥 Sequential Job: Must wait for predecessor
            childStatus = 'pending_dependency';
          } else if (!needsApproval) {
            // If skip approval: assigned (if has assignee) OR approved (waiting for assignee)
            childStatus = assigneeId ? 'assigned' : 'approved';
          }
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
            description: briefData.description,
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
    // Step 3: Send Response
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
    }

    res.json(result);
  } catch (error) {
    console.error('[Jobs] Complete error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete job' });
  }
});

/**
 * POST /api/jobs/:id/confirm-close
 * Confirm job closure (Requester action)
 * Moves job from pending_close to completed
 */
router.post('/:id/confirm-close', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { note } = req.body;

    // Verify job exists and is in pending_close status
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'pending_close') {
      return res.status(400).json({
        success: false,
        message: `Job status must be 'pending_close', currently '${job.status}'`
      });
    }

    // Update job to completed status
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        closedAt: new Date(),
        closedBy: userId
      }
    });

    // Log activity
    await prisma.jobActivity.create({
      data: {
        jobId,
        userId,
        activityType: 'job_closed',
        description: 'ยืนยันปิดงาน (Job Closed Confirmed)',
        metadata: { note }
      }
    });

    // Add comment if note provided
    if (note) {
      await prisma.jobComment.create({
        data: {
          jobId,
          userId,
          content: note,
          isSystemMessage: false
        }
      });
    }

    // Emit real-time notification
    const io = getSocketIO();
    if (io) {
      io.to(`tenant_${job.tenantId}:job_${jobId}`).emit('job_closed', {
        jobId,
        status: 'completed',
        closedBy: userId,
        closedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Job closed successfully',
      job: updatedJob
    });
  } catch (error) {
    console.error('[Jobs] Confirm close error:', error);
    res.status(500).json({ success: false, message: 'Failed to close job' });
  }
});

/**
 * POST /api/jobs/:id/request-revision
 * Request revision on job (Requester action)
 * Moves job from pending_close back to in_progress
 */
router.post('/:id/request-revision', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { note } = req.body;

    // Verify job exists and is in pending_close status
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'pending_close') {
      return res.status(400).json({
        success: false,
        message: `Job status must be 'pending_close', currently '${job.status}'`
      });
    }

    // Update job back to in_progress status
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'in_progress',
        reworkCount: (job.reworkCount || 0) + 1
      }
    });

    // Log activity
    await prisma.jobActivity.create({
      data: {
        jobId,
        userId,
        activityType: 'revision_requested',
        description: 'ขอให้แก้ไข (Revision Requested)',
        metadata: { note }
      }
    });

    // Add comment if note provided
    if (note) {
      await prisma.jobComment.create({
        data: {
          jobId,
          userId,
          content: note,
          isSystemMessage: false
        }
      });
    }

    // Emit real-time notification to assignee
    const io = getSocketIO();
    if (io && job.assigneeId) {
      io.to(`tenant_${job.tenantId}:user_${job.assigneeId}`).emit('revision_requested', {
        jobId,
        status: 'in_progress',
        requestedBy: userId,
        requestedAt: new Date(),
        note
      });
    }

    res.json({
      success: true,
      message: 'Revision requested successfully',
      job: updatedJob
    });
  } catch (error) {
    console.error('[Jobs] Request revision error:', error);
    res.status(500).json({ success: false, message: 'Failed to request revision' });
  }
});

export default router;
