const MESSAGE_ONLY_TYPES = new Set([
  'user_session_update',
  'request_resolved',
  'request_rejected',
  'job_deleted_hard',
  'job_deleted_chain'
]);

const ADMIN_ROUTE_TYPES = new Set([
  'contact_admin'
]);

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export const NOTIFICATION_ACTION_MODES = Object.freeze({
  JOB_VIEW: 'job_view',
  JOB_ACTION: 'job_action',
  ADMIN_ROUTE: 'admin_route',
  MESSAGE_ONLY: 'message_only'
});

export function normalizeNotificationLink(link) {
  const rawLink = String(link || '').trim();
  if (!rawLink) return null;

  if (rawLink.startsWith('/')) {
    return rawLink;
  }

  try {
    const parsed = new URL(rawLink);
    if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

const getMessageOnlyText = (notification, normalizedLink) => {
  if (notification?.type === 'user_session_update') {
    return notification.message || 'ผู้ดูแลระบบได้อัปเดตข้อมูลบัญชีหรือสิทธิ์ของคุณแล้ว';
  }

  if (notification?.type === 'request_resolved' || notification?.type === 'request_rejected') {
    return notification.message || 'Admin ได้ตอบกลับคำขอของคุณแล้ว';
  }

  if (notification?.type === 'job_deleted_hard' || notification?.type === 'job_deleted_chain') {
    return notification.message || 'งานนี้ถูกลบออกจากระบบแล้ว จึงไม่สามารถเปิดรายละเอียดงานได้';
  }

  if (normalizedLink === '/profile') {
    return notification.message || 'รายการนี้เป็นการแจ้งเตือนเกี่ยวกับข้อมูลบัญชีของคุณ';
  }

  return notification?.message || 'รายการนี้เป็นข้อความแจ้งให้ทราบเท่านั้น ไม่จำเป็นต้องดำเนินการเพิ่มเติม';
};

export function resolveNotificationAction(notification = {}) {
  const normalizedLink = normalizeNotificationLink(notification.link);
  const type = String(notification.type || '');
  const title = notification.title || 'การแจ้งเตือน';
  const jobMatch = normalizedLink?.match(/^\/jobs\/(\d+)(?:[/?#].*)?$/);

  if (MESSAGE_ONLY_TYPES.has(type) || !normalizedLink || normalizedLink === '/profile') {
    return {
      actionMode: NOTIFICATION_ACTION_MODES.MESSAGE_ONLY,
      targetUrl: null,
      targetJobId: null,
      displayTitle: title,
      displayMessage: getMessageOnlyText(notification, normalizedLink),
      popupIcon: type.startsWith('job_deleted') ? 'warning' : 'info'
    };
  }

  if (jobMatch) {
    return {
      actionMode: NOTIFICATION_ACTION_MODES.JOB_VIEW,
      targetUrl: normalizedLink,
      targetJobId: Number(jobMatch[1]),
      displayTitle: title,
      displayMessage: notification.message || '',
      popupIcon: 'info'
    };
  }

  if (ADMIN_ROUTE_TYPES.has(type) && normalizedLink.startsWith('/admin/')) {
    return {
      actionMode: NOTIFICATION_ACTION_MODES.ADMIN_ROUTE,
      targetUrl: normalizedLink,
      targetJobId: null,
      displayTitle: title,
      displayMessage: notification.message || '',
      popupIcon: 'info'
    };
  }

  return {
    actionMode: NOTIFICATION_ACTION_MODES.MESSAGE_ONLY,
    targetUrl: null,
    targetJobId: null,
    displayTitle: title,
    displayMessage: getMessageOnlyText(notification, normalizedLink),
    popupIcon: 'info'
  };
}

export function isMessageOnlyNotificationType(type) {
  return MESSAGE_ONLY_TYPES.has(String(type || ''));
}
