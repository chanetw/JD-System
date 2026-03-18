import { NotificationService } from '../services/notificationService.js';

const notificationService = new NotificationService();

export const notifyUserRealtime = async ({
  req,
  tenantId,
  userId,
  type,
  title,
  message,
  link = null,
  extraEvent = null,
  extraPayload = {}
}) => {
  if (!req || !tenantId || !userId || !type || !title || !message) {
    return;
  }

  try {
    const io = req.app?.get?.('io');
    const notificationResult = await notificationService.createNotification({
      tenantId,
      userId,
      type,
      title,
      message,
      link
    });

    const unreadCount = await notificationService.prisma.notification.count({
      where: {
        tenantId,
        userId,
        isRead: false
      }
    });

    if (io) {
      const room = `tenant_${tenantId}:user_${userId}`;

      if (notificationResult.success && notificationResult.data) {
        io.to(room).emit('notification:new', notificationResult.data);
      }

      io.to(room).emit('notification:unread-count', { count: unreadCount });

      if (extraEvent) {
        io.to(room).emit(extraEvent, {
          ...extraPayload,
          title,
          message,
          link,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('[userSessionNotification] Failed to notify user:', error);
  }
};

export const notifyUserSessionUpdate = async ({
  req,
  tenantId,
  userId,
  requiresLogout = false,
  title,
  message,
  link = '/profile'
}) => {
  if (!req || !tenantId || !userId || !title || !message) {
    return;
  }

  await notifyUserRealtime({
    req,
    tenantId,
    userId,
    type: 'user_session_update',
    title,
    message,
    link,
    extraEvent: 'user:session-updated',
    extraPayload: {
      requiresLogout
    }
  });
};