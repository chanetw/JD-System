const normalizeRoleValue = (role) => {
  if (!role) return '';
  const rawRole = typeof role === 'string'
    ? role
    : String(role.roleName || role.name || role.role || '');

  return rawRole.trim().replace(/[\s-]+/g, '_').toLowerCase();
};

const hasAdminPrivileges = (user) => {
  if (!user) return false;

  const roles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.roleName,
    user.role
  ].filter(Boolean);

  return roles.some((role) => normalizeRoleValue(role) === 'admin');
};

const parsePendingApprovalLevel = (status) => {
  if (status === 'pending_approval') return 1;

  const match = String(status || '').match(/^pending_level_(\d+)$/);
  if (!match) return null;

  const level = parseInt(match[1], 10);
  return Number.isInteger(level) && level > 0 ? level : null;
};

const normalizePriorityValue = (priority) => {
  const raw = String(priority || '').trim().toLowerCase();
  return raw || 'normal';
};

export const ensureCanApproveOrRejectJob = async ({ prisma, approvalService, jobId, user }) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      tenantId: user.tenantId
    },
    select: {
      id: true,
      status: true,
      projectId: true,
      jobTypeId: true,
      priority: true
    }
  });

  if (!job) {
    return {
      allowed: false,
      result: {
        success: false,
        error: 'NOT_FOUND',
        message: 'Job not found'
      }
    };
  }

  const currentLevel = parsePendingApprovalLevel(job.status);
  if (!currentLevel || hasAdminPrivileges(user)) {
    // For non-pending statuses, let ApprovalService return the correct action-state error.
    return { allowed: true };
  }

  const flow = await approvalService.getApprovalFlow(
    job.projectId,
    job.jobTypeId,
    normalizePriorityValue(job.priority)
  );

  const currentStep = Array.isArray(flow?.approverSteps)
    ? flow.approverSteps.find((step) => {
      const stepNumber = step?.stepNumber || step?.level;
      return Number(stepNumber) === currentLevel;
    })
    : null;

  const approverIds = new Set(
    (Array.isArray(currentStep?.approvers) ? currentStep.approvers : [])
      .map((approver) => approver?.id || approver?.userId)
      .filter(Boolean)
      .map(String)
  );

  const isCurrentApprover = approverIds.has(String(user.userId));

  if (!isCurrentApprover) {
    return {
      allowed: false,
      result: {
        success: false,
        error: 'FORBIDDEN',
        message: 'Only current approvers can approve or reject this job'
      }
    };
  }

  return { allowed: true };
};