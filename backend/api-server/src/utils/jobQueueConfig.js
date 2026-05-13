export const ADMIN_OVERRIDE_PREFIX = '[Admin Override]';

export const ASSIGNEE_IN_PROGRESS_STATUSES = [
  'approved',
  'assigned',
  'in_progress',
  'correction',
  'rework',
  'returned',
  'pending_dependency',
  'draft_review',
  'pending_rebrief',
  'rebrief_submitted'
];

export const ASSIGNEE_COMPLETED_STATUSES = [
  'completed',
  'closed'
];

export const ASSIGNEE_REJECTED_STATUSES = [
  'rejected',
  'rejected_by_assignee',
  'assignee_rejected'
];

export const ASSIGNEE_TODO_STATUSES = ['assigned'];
export const ASSIGNEE_WAITING_STATUSES = ['correction', 'pending_approval'];

export const APPROVAL_WAITING_BASE_STATUSES = [
  'pending_approval',
  'pending_dependency',
  'assignee_rejected'
];

export const APPROVAL_ACTIONABLE_BASE_STATUSES = [
  'pending_approval',
  'assignee_rejected'
];

export const APPROVAL_HISTORY_CATEGORIES = {
  APPROVED: 'approved',
  NOT_APPROVED: 'not_approved'
};

const ACTION_LABELS = {
  approved: 'อนุมัติงาน',
  rejected: 'ปฏิเสธงาน',
  returned: 'ตีกลับแก้ไข',
  confirm_assignee_rejection: 'อนุมัติการปฏิเสธของผู้รับงาน',
  deny_assignee_rejection: 'ไม่อนุมัติคำขอปฏิเสธของผู้รับงาน',
  cascade_confirm_assignee_rejection: 'อนุมัติการปฏิเสธของผู้รับงานพ่วง',
  cascade_reject_downstream: 'ปฏิเสธงานพ่วงตามงานก่อนหน้า'
};

export const isApprovalWaitingStatus = (status) => {
  if (!status) return false;
  const normalizedStatus = String(status).trim().toLowerCase();
  return APPROVAL_WAITING_BASE_STATUSES.includes(normalizedStatus)
    || normalizedStatus.startsWith('pending_level_');
};

export const isApprovalActionableStatus = (status) => {
  if (!status) return false;
  const normalizedStatus = String(status).trim().toLowerCase();
  return APPROVAL_ACTIONABLE_BASE_STATUSES.includes(normalizedStatus)
    || normalizedStatus.startsWith('pending_level_');
};

export const hasAdminOverridePrefix = (comment) => (
  String(comment || '').trim().startsWith(ADMIN_OVERRIDE_PREFIX)
);

export const getApprovalActionTypeFromComment = (comment) => {
  const normalizedComment = String(comment || '').trim().toLowerCase();

  if (normalizedComment.includes('cascade_confirm_assignee_rejection')) {
    return 'cascade_confirm_assignee_rejection';
  }

  if (normalizedComment.includes('cascade_reject_downstream')) {
    return 'cascade_reject_downstream';
  }

  if (
    normalizedComment.includes('confirm_assignee_rejection')
    || normalizedComment.includes('confirmed assignee rejection')
  ) {
    return 'confirm_assignee_rejection';
  }

  if (
    normalizedComment.includes('deny_assignee_rejection')
    || normalizedComment.includes('denied assignee rejection')
  ) {
    return 'deny_assignee_rejection';
  }

  return null;
};

export const getApprovalHistoryPresentation = ({ status, actionType, comment }) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedActionType = String(actionType || '').trim().toLowerCase()
    || getApprovalActionTypeFromComment(comment)
    || '';

  if (!normalizedStatus) {
    return null;
  }

  let category = null;

  if (['confirm_assignee_rejection', 'cascade_confirm_assignee_rejection'].includes(normalizedActionType)) {
    category = APPROVAL_HISTORY_CATEGORIES.APPROVED;
  } else if (['deny_assignee_rejection', 'cascade_reject_downstream'].includes(normalizedActionType)) {
    category = APPROVAL_HISTORY_CATEGORIES.NOT_APPROVED;
  } else if (normalizedStatus === 'approved') {
    category = APPROVAL_HISTORY_CATEGORIES.APPROVED;
  } else if (['rejected', 'returned'].includes(normalizedStatus)) {
    category = APPROVAL_HISTORY_CATEGORIES.NOT_APPROVED;
  }

  if (!category) {
    return null;
  }

  const actionLabel = ACTION_LABELS[normalizedActionType]
    || ACTION_LABELS[normalizedStatus]
    || ACTION_LABELS.rejected;

  return {
    actionType: normalizedActionType || null,
    category,
    actionLabel,
    isAdminOverride: hasAdminOverridePrefix(comment)
  };
};
