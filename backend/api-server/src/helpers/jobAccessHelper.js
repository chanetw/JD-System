const normalizeRoleValue = (role) => {
  if (!role) return '';

  const rawRole = typeof role === 'string'
    ? role
    : String(role.roleName || role.name || role.role || '');
  const normalized = rawRole.trim().replace(/[\s-]+/g, '_').toLowerCase();

  if (['admin', 'superadmin', 'system_admin', 'administrator'].includes(normalized)) return 'admin';
  if (['requester', 'orgadmin', 'org_admin', 'marketing'].includes(normalized)) return 'requester';
  if (['approver', 'teamlead', 'team_lead'].includes(normalized)) return 'approver';
  if (['assignee', 'member', 'user'].includes(normalized)) return 'assignee';
  if (['manager', 'dept_manager'].includes(normalized)) return 'manager';
  if (['viewer'].includes(normalized)) return 'viewer';

  return normalized;
};

export const getNormalizedUserRoles = (user) => {
  if (!user) return [];

  const roles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.roleName,
    user.role
  ].filter(Boolean);

  return [...new Set(roles.map(normalizeRoleValue).filter(Boolean))];
};

export const userHasAnyRole = (user, roles) => {
  const normalizedRoles = getNormalizedUserRoles(user);
  const allowedRoles = roles.map(normalizeRoleValue);
  return normalizedRoles.some((role) => allowedRoles.includes(role));
};

export const hasAdminPrivileges = (user) => userHasAnyRole(user, ['admin']);

const isSameUserId = (left, right) => {
  if (left == null || right == null) return false;
  return String(left) === String(right);
};

const parseMaybeJson = (value) => {
  if (!value || typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const collectApproverIdsFromSteps = (steps) => {
  if (!Array.isArray(steps)) return new Set();

  const ids = new Set();
  steps.forEach((step) => {
    const approvers = Array.isArray(step?.approvers) ? step.approvers : [];
    approvers.forEach((approver) => {
      const id = approver?.userId ?? approver?.id;
      if (id != null) ids.add(String(id));
    });
  });

  return ids;
};

const isApproverInCurrentFlow = async (prisma, job, userId) => {
  if (!job?.projectId || !userId) return false;

  const flows = await prisma.approvalFlow.findMany({
    where: {
      tenantId: job.tenantId,
      projectId: job.projectId,
      isActive: true,
      OR: [
        { jobTypeId: job.jobTypeId },
        { jobTypeId: null }
      ]
    },
    select: {
      jobTypeId: true,
      approverSteps: true
    }
  });

  const exactFlow = flows.find((flow) => isSameUserId(flow.jobTypeId, job.jobTypeId));
  const defaultFlow = flows.find((flow) => flow.jobTypeId == null);
  const flow = exactFlow || defaultFlow;

  if (!flow) return false;

  return collectApproverIdsFromSteps(parseMaybeJson(flow.approverSteps)).has(String(userId));
};

const hasScopeAccess = async (prisma, job, userId) => {
  if (!job || !userId) return false;

  const scopes = await prisma.userScopeAssignment.findMany({
    where: {
      tenantId: job.tenantId,
      userId,
      isActive: true
    },
    select: {
      scopeLevel: true,
      scopeId: true
    }
  });

  return scopes.some((scope) => {
    const level = String(scope.scopeLevel || '').toLowerCase();
    const scopeId = Number(scope.scopeId);

    if (level === 'tenant') return true;
    if (!Number.isInteger(scopeId)) return false;
    if (level === 'project') return scopeId === Number(job.projectId);
    if (level === 'bud') return scopeId === Number(job.project?.budId);
    if (level === 'department') return scopeId === Number(job.project?.departmentId);

    return false;
  });
};

const hasChildContextAccess = async (prisma, parentJob, userId) => {
  if (!parentJob?.isParent || !parentJob?.id || !userId) return false;

  const childJobs = await prisma.job.findMany({
    where: {
      tenantId: parentJob.tenantId,
      parentJobId: parentJob.id
    },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      jobTypeId: true,
      requesterId: true,
      assigneeId: true,
      approvals: {
        select: { approverId: true }
      },
      project: {
        select: { budId: true, departmentId: true }
      }
    }
  });

  for (const childJob of childJobs) {
    const isRequester = isSameUserId(childJob.requesterId, userId);
    const isAssignee = isSameUserId(childJob.assigneeId, userId);
    const isApprovalActor = childJob.approvals?.some((approval) => isSameUserId(approval.approverId, userId));
    if (isRequester || isAssignee || isApprovalActor) return true;

    if (await isApproverInCurrentFlow(prisma, childJob, userId)) {
      return true;
    }
  }

  return false;
};

const wasPreviousAssignee = async (prisma, jobId, tenantId, userId) => {
  const reassignmentLogs = await prisma.activityLog.findMany({
    where: {
      jobId,
      action: 'reassigned'
    },
    select: { detail: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const hasStructuredHistory = reassignmentLogs.some((log) => {
    const detail = parseMaybeJson(log.detail);
    return isSameUserId(detail?.oldAssigneeId, userId);
  });

  if (hasStructuredHistory) return true;

  const legacyNotification = await prisma.notification.findFirst({
    where: {
      tenantId,
      userId,
      type: 'job_reassigned',
      link: `/jobs/${jobId}`
    },
    select: { id: true }
  });

  return Boolean(legacyNotification);
};

export const buildJobPermissions = ({ accessMode, isAdmin = false }) => ({
  canView: accessMode === 'full' || accessMode === 'readonly',
  canComment: accessMode === 'full',
  canAct: accessMode === 'full',
  canReassign: accessMode === 'full',
  canAdmin: accessMode === 'full' && isAdmin
});

export const resolveJobAccess = async (prisma, { jobId, user }) => {
  const parsedJobId = Number(jobId);
  const userId = user?.userId ?? user?.id;
  const tenantId = user?.tenantId;

  if (!Number.isInteger(parsedJobId) || parsedJobId <= 0) {
    return {
      hasAccess: false,
      accessMode: null,
      error: 'INVALID_JOB_ID',
      reason: 'ID งานไม่ถูกต้อง'
    };
  }

  const job = await prisma.job.findUnique({
    where: { id: parsedJobId },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      jobTypeId: true,
      requesterId: true,
      assigneeId: true,
      status: true,
      djId: true,
      isParent: true,
      parentJobId: true,
      approvals: {
        select: { approverId: true }
      },
      project: {
        select: { budId: true, departmentId: true }
      }
    }
  });

  if (!job || !isSameUserId(job.tenantId, tenantId)) {
    return {
      hasAccess: false,
      accessMode: null,
      error: 'JOB_NOT_FOUND',
      reason: 'งานนี้ไม่อยู่ในระบบของคุณ หรือถูกลบแล้ว',
      suggestedAction: 'ติดต่อ Admin เพื่อขอสิทธิ์เข้าถึง'
    };
  }

  const isAdmin = hasAdminPrivileges(user);
  const isRequester = isSameUserId(job.requesterId, userId);
  const isAssignee = isSameUserId(job.assigneeId, userId);
  const isApprovalActor = job.approvals?.some((approval) => isSameUserId(approval.approverId, userId));
  const isFlowApprover = await isApproverInCurrentFlow(prisma, job, userId);
  const isInScope = await hasScopeAccess(prisma, job, userId);

  if (isAdmin || isRequester || isAssignee || isApprovalActor || isFlowApprover || isInScope) {
    return {
      hasAccess: true,
      accessMode: 'full',
      reason: null,
      job,
      permissions: buildJobPermissions({ accessMode: 'full', isAdmin })
    };
  }

  const hasParentReadonlyContext = await hasChildContextAccess(prisma, job, userId);
  if (hasParentReadonlyContext) {
    return {
      hasAccess: true,
      accessMode: 'readonly',
      reason: 'คุณมีสิทธิ์ดูงานลูก จึงเปิดงานแม่เพื่อดูบริบทได้แบบอ่านอย่างเดียว',
      job,
      permissions: buildJobPermissions({ accessMode: 'readonly', isAdmin: false })
    };
  }

  const isOldAssignee = await wasPreviousAssignee(prisma, parsedJobId, job.tenantId, userId);
  if (isOldAssignee) {
    return {
      hasAccess: true,
      accessMode: 'readonly',
      reason: 'คุณเคยเป็นผู้รับผิดชอบงานนี้ งานถูกย้ายให้ผู้รับผิดชอบคนใหม่แล้ว',
      job,
      permissions: buildJobPermissions({ accessMode: 'readonly', isAdmin: false })
    };
  }

  let reason = 'คุณไม่มีสิทธิ์เข้าถึงงานนี้';
  let suggestedAction = 'ติดต่อผู้สั่งงาน หรือ Admin เพื่อขอสิทธิ์เข้าถึง';

  if (job.status === 'draft') {
    reason = 'งานนี้ยังอยู่ในรูปแบบร่าง หลังจากส่งอนุมัติจึงจะแจ้งให้ผู้อื่นทราบ';
    suggestedAction = 'รอให้ผู้สั่งงานส่งอนุมัติ';
  }

  return {
    hasAccess: false,
    accessMode: null,
    error: 'INSUFFICIENT_PERMISSIONS',
    reason,
    suggestedAction,
    job
  };
};
