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
          select: { id: true, name: true, quantity: true, size: true, status: true }
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
