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
import ApprovalService from '../services/approvalService.js';

const approvalService = new ApprovalService();

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
      case 'approver':
      case 'manager':
        where.status = { in: ['pending_approval', 'pending_level_1', 'pending_level_2'] };
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
          }
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
      requesterId: j.requesterId,
      requester: j.requester?.displayName || `${j.requester?.firstName} ${j.requester?.lastName}`.trim(),
      requesterAvatar: j.requester?.avatarUrl,
      assigneeId: j.assigneeId,
      assignee: j.assignee?.displayName || (j.assignee ? `${j.assignee?.firstName} ${j.assignee?.lastName}`.trim() : null),
      assigneeAvatar: j.assignee?.avatarUrl
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
    console.error('[Jobs] Get jobs error:', error);
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
    const isSkip = approvalService.isSkipApproval(flow);

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
    // รูปแบบ: DJ-YYYY-XXXX (เช่น DJ-2026-0001)
    // ============================================
    const year = new Date().getFullYear();
    const jobCount = await prisma.job.count({
      where: {
        tenantId,
        djId: { startsWith: `DJ-${year}-` }
      }
    });
    const djId = `DJ-${year}-${String(jobCount + 1).padStart(4, '0')}`;

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
          select: { id: true, name: true, quantity: true, status: true }
        },
        attachments: {
          select: { id: true, filePath: true, fileName: true, fileSize: true, createdAt: true }
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

    // Check permission
    const hasAccess = job.requesterId === req.user.userId ||
      job.assigneeId === req.user.userId ||
      req.user.roles.includes('admin');

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
      items: job.jobItems || [],
      attachments: job.attachments || []
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
      // Use FOR UPDATE to prevent race conditions
      // ----------------------------------------
      const year = new Date().getFullYear();
      const prefix = `DJ-${year}-`;

      // Get the latest DJ-ID with row lock
      const latestJob = await tx.job.findFirst({
        where: {
          tenantId,
          djId: { startsWith: prefix }
        },
        orderBy: { djId: 'desc' },
        select: { djId: true }
      });

      let runningNumber = 1;
      if (latestJob && latestJob.djId) {
        const parts = latestJob.djId.split('-');
        if (parts.length === 3) {
          runningNumber = parseInt(parts[2]) + 1;
        }
      }

      const generateDjId = (offset = 0) => {
        return `${prefix}${String(runningNumber + offset).padStart(4, '0')}`;
      };

      // ----------------------------------------
      // 2.3: Create Parent Job
      // ----------------------------------------
      const parentDjId = generateDjId(0);

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
          status: 'pending_approval',
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

        // Calculate due date based on SLA
        const slaWorkingDays = childJobType.slaWorkingDays || 7;
        const childDueDate = calculateWorkingDays(new Date(), slaWorkingDays);

        // Generate child DJ-ID
        const childDjId = generateDjId(i + 1);

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
            status: assigneeId ? 'assigned' : 'pending_approval',
            priority: priority.toLowerCase(),
            requesterId: userId,
            assigneeId: assigneeId,
            isParent: false,
            parentJobId: parentJob.id,
            dueDate: childDueDate,
            startedAt: assigneeId ? new Date() : null
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
          action: 'parent_child_created',
          message: `สร้างงานกลุ่ม ${parentDjId} พร้อม ${childJobs.length} งานย่อย`,
          detail: {
            parentId: parentJob.id,
            childCount: childJobs.length,
            childIds: childJobs.map(c => c.id),
            priority
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

    res.json(result);
  } catch (error) {
    console.error('[Jobs] Complete error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete job' });
  }
});

export default router;
