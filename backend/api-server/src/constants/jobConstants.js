/**
 * @file jobConstants.js
 * @description Centralized Job Constants — Single source of truth สำหรับ backend
 *
 * ใช้ร่วมกันระหว่าง routes, services, และ cron jobs
 * ถ้าต้องเพิ่ม/แก้ค่า ให้แก้ที่ไฟล์นี้เท่านั้น
 */

// ========================================
// 1. Priority Constants
// ========================================

/**
 * ค่า priority ที่รับได้ในระบบ (create/edit)
 * หลัง simplify: รับเฉพาะ normal และ urgent เท่านั้น
 */
export const VALID_PRIORITIES = ['normal', 'urgent'];

/**
 * Label สำหรับแสดงผล (backend log / email)
 */
export const PRIORITY_LABELS = {
  normal: 'ปกติ',
  urgent: 'ด่วน',
};

export const canonicalizePriority = (raw) => {
  return String(raw || '').toLowerCase().trim();
};

/**
 * Normalize ค่า priority จากข้อมูลเก่าให้ตกอยู่ในช่วงที่รับได้
 * ค่าเก่า: high -> normal, low -> normal, null/undefined -> normal
 */
export const normalizePriority = (raw) => {
  if (!raw) return 'normal';
  const lower = canonicalizePriority(raw);
  if (VALID_PRIORITIES.includes(lower)) return lower;
  // Compatibility: map legacy values
  if (['high', 'low', 'medium'].includes(lower)) return 'normal';
  return 'normal';
};

/**
 * ตรวจสอบว่า priority เป็นค่าที่รับได้หรือไม่
 */
export const isValidPriority = (value) => {
  return VALID_PRIORITIES.includes(canonicalizePriority(value));
};

/**
 * Parse ค่า priority สำหรับ write endpoint เท่านั้น
 * รับเฉพาะค่าที่ canonical และรองรับโดยระบบ
 */
export const parseWritablePriority = (raw) => {
  const canonical = canonicalizePriority(raw);
  if (!canonical || !VALID_PRIORITIES.includes(canonical)) return null;
  return canonical;
};

// ========================================
// 2. Notification Event Types
// ========================================

/**
 * Event types สำหรับ notification ที่เกี่ยวกับงาน
 * ใช้เป็น key สำหรับ dispatch ทั้ง in-app และ email
 */
export const JOB_NOTIFICATION_EVENTS = {
  STATUS_CHANGED: 'job_status_changed',
  PRIORITY_CHANGED: 'priority_changed',
  HARD_DELETED: 'job_deleted_hard',
  CHAIN_DELETED: 'job_deleted_chain',
  ASSIGNED: 'job_assigned',
  APPROVAL_REQUEST: 'job_approval_request',
  APPROVED: 'job_approved',
  REJECTED: 'job_rejected',
  COMPLETED: 'job_completed',
  EXTENDED: 'job_extended',
};

/**
 * กำหนดผู้รับ notification ตาม event type
 * @param {string} eventType - จาก JOB_NOTIFICATION_EVENTS
 * @param {Object} job - job object ที่ต้องมี requesterId และ assigneeId
 * @returns {number[]} array ของ userId ที่ต้องรับ notification (deduplicated)
 */
export const getNotificationRecipients = (eventType, job) => {
  const recipients = new Set();

  // requester ได้รับทุก event
  if (job.requesterId) recipients.add(job.requesterId);

  // assignee ได้รับเฉพาะ event ที่กระทบงานของตน
  const ASSIGNEE_EVENTS = [
    JOB_NOTIFICATION_EVENTS.STATUS_CHANGED,
    JOB_NOTIFICATION_EVENTS.PRIORITY_CHANGED,
    JOB_NOTIFICATION_EVENTS.HARD_DELETED,
    JOB_NOTIFICATION_EVENTS.CHAIN_DELETED,
    JOB_NOTIFICATION_EVENTS.ASSIGNED,
    JOB_NOTIFICATION_EVENTS.APPROVED,
    JOB_NOTIFICATION_EVENTS.REJECTED,
    JOB_NOTIFICATION_EVENTS.COMPLETED,
    JOB_NOTIFICATION_EVENTS.EXTENDED,
  ];

  if (ASSIGNEE_EVENTS.includes(eventType) && job.assigneeId) {
    recipients.add(job.assigneeId);
  }

  return [...recipients];
};

// ========================================
// 3. Hard Delete Constants
// ========================================

/**
 * สถานะที่ Admin สามารถ hard delete ได้ (ทุกสถานะ)
 */
export const HARD_DELETE_ALLOWED_STATUSES = [
  'draft',
  'scheduled',
  'submitted',
  'pending_approval',
  'pending_level_1',
  'pending_level_2',
  'pending_level_3',
  'approved',
  'assigned',
  'in_progress',
  'pending_dependency',
  'rework',
  'correction',
  'returned',
  'draft_review',
  'pending_rebrief',
  'rebrief_submitted',
  'assignee_rejected',
  'completed',
  'closed',
  'rejected',
  'rejected_by_assignee',
  'cancelled',
  'partially_completed',
];

/**
 * Audit action type สำหรับ hard delete
 * เก็บใน audit_logs ก่อนลบจริง เพื่อให้ trace ได้แม้ job ถูกลบถาวร
 */
export const AUDIT_ACTION_HARD_DELETE = 'job_hard_deleted';
export const AUDIT_ACTION_CHAIN_DELETE = 'job_chain_deleted';
export const AUDIT_ACTION_PRIORITY_EDIT = 'job_priority_edited';
export const AUDIT_ACTION_CHAIN_PRIORITY_EDIT = 'job_chain_priority_edited';

/**
 * จำนวนงานลูกสูงสุดที่อนุญาตให้ลบต่อครั้ง (safety limit)
 */
export const MAX_CHAIN_DELETE_LIMIT = 50;

export default {
  VALID_PRIORITIES,
  PRIORITY_LABELS,
  canonicalizePriority,
  normalizePriority,
  isValidPriority,
  parseWritablePriority,
  JOB_NOTIFICATION_EVENTS,
  getNotificationRecipients,
  HARD_DELETE_ALLOWED_STATUSES,
  AUDIT_ACTION_HARD_DELETE,
  AUDIT_ACTION_CHAIN_DELETE,
  AUDIT_ACTION_PRIORITY_EDIT,
  AUDIT_ACTION_CHAIN_PRIORITY_EDIT,
  MAX_CHAIN_DELETE_LIMIT,
};