export const NOTIFICATION_ACTION_MODES = Object.freeze({
    JOB_VIEW: 'job_view',
    JOB_ACTION: 'job_action',
    ADMIN_ROUTE: 'admin_route',
    MESSAGE_ONLY: 'message_only'
});

const MESSAGE_ONLY_TYPES = new Set([
    'user_session_update',
    'request_resolved',
    'request_rejected',
    'job_deleted_hard',
    'job_deleted_chain'
]);

const ADMIN_ROUTE_TYPES = new Set(['contact_admin']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function normalizeNotificationLink(link) {
    const rawLink = String(link || '').trim();
    if (!rawLink) return null;

    if (rawLink.startsWith('/')) return rawLink;

    try {
        const parsed = new URL(rawLink, window.location.origin);
        if (LOCAL_HOSTNAMES.has(parsed.hostname) || parsed.origin === window.location.origin) {
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        return null;
    } catch {
        return null;
    }
}

const getFallbackMessage = (notification, normalizedLink) => {
    if (notification?.type === 'user_session_update' || normalizedLink === '/profile') {
        return notification.message || 'ผู้ดูแลระบบได้อัปเดตข้อมูลบัญชีหรือสิทธิ์ของคุณแล้ว';
    }

    if (notification?.type === 'request_resolved' || notification?.type === 'request_rejected') {
        return notification.message || 'Admin ได้ตอบกลับคำขอของคุณแล้ว';
    }

    if (notification?.type === 'job_deleted_hard' || notification?.type === 'job_deleted_chain') {
        return notification.message || 'งานนี้ถูกลบออกจากระบบแล้ว จึงไม่สามารถเปิดรายละเอียดงานได้';
    }

    return notification?.displayMessage
        || notification?.message
        || 'รายการนี้เป็นข้อความแจ้งให้ทราบเท่านั้น ไม่จำเป็นต้องดำเนินการเพิ่มเติม';
};

export function resolveNotificationAction(notification = {}) {
    if (notification.actionMode && notification.actionMode !== NOTIFICATION_ACTION_MODES.MESSAGE_ONLY) {
        return {
            actionMode: notification.actionMode,
            targetUrl: notification.targetUrl || normalizeNotificationLink(notification.link),
            targetJobId: notification.targetJobId || null,
            displayTitle: notification.displayTitle || notification.title || 'การแจ้งเตือน',
            displayMessage: notification.displayMessage || notification.message || '',
            popupIcon: notification.popupIcon || 'info'
        };
    }

    const normalizedLink = normalizeNotificationLink(notification.link);
    const type = String(notification.type || '');
    const jobMatch = normalizedLink?.match(/^\/jobs\/(\d+)(?:[/?#].*)?$/);

    if (MESSAGE_ONLY_TYPES.has(type) || !normalizedLink || normalizedLink === '/profile') {
        return {
            actionMode: NOTIFICATION_ACTION_MODES.MESSAGE_ONLY,
            targetUrl: null,
            targetJobId: null,
            displayTitle: notification.displayTitle || notification.title || 'การแจ้งเตือน',
            displayMessage: getFallbackMessage(notification, normalizedLink),
            popupIcon: notification.popupIcon || (type.startsWith('job_deleted') ? 'warning' : 'info')
        };
    }

    if (jobMatch) {
        return {
            actionMode: NOTIFICATION_ACTION_MODES.JOB_VIEW,
            targetUrl: normalizedLink,
            targetJobId: Number(jobMatch[1]),
            displayTitle: notification.displayTitle || notification.title || 'การแจ้งเตือน',
            displayMessage: notification.displayMessage || notification.message || '',
            popupIcon: notification.popupIcon || 'info'
        };
    }

    if (ADMIN_ROUTE_TYPES.has(type) && normalizedLink.startsWith('/admin/')) {
        return {
            actionMode: NOTIFICATION_ACTION_MODES.ADMIN_ROUTE,
            targetUrl: normalizedLink,
            targetJobId: null,
            displayTitle: notification.displayTitle || notification.title || 'การแจ้งเตือน',
            displayMessage: notification.displayMessage || notification.message || '',
            popupIcon: notification.popupIcon || 'info'
        };
    }

    return {
        actionMode: NOTIFICATION_ACTION_MODES.MESSAGE_ONLY,
        targetUrl: null,
        targetJobId: null,
        displayTitle: notification.displayTitle || notification.title || 'การแจ้งเตือน',
        displayMessage: getFallbackMessage(notification, normalizedLink),
        popupIcon: notification.popupIcon || 'info'
    };
}
