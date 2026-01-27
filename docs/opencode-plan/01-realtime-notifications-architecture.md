# DJ System: Real-time Notifications Architecture
**Date:** 2026-01-27  
**Status:** Design Complete, Ready for Implementation  
**Version:** 1.0

---

## 📋 Executive Summary

This document outlines the architecture for implementing a **real-time notification system** in DJ System that keeps users informed of job assignments, approvals, rejections, and other critical events **instantly without page refresh**.

### Key Requirements
- ✅ Real-time job assignment notifications
- ✅ SLA alerts and deadline reminders
- ✅ Approval status updates
- ✅ Comment/chat notifications
- ✅ Multi-user synchronization
- ✅ Unread notification badge
- ✅ 30-day notification history

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DJ SYSTEM FRONTEND                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              React Component Tree                       │    │
│  │  ┌──────────────┐         ┌──────────────┐            │    │
│  │  │   TopBar.jsx │         │MyQueue.jsx   │            │    │
│  │  └──────────────┘         └──────────────┘            │    │
│  │         ▲                         ▲                    │    │
│  │         │                         │                    │    │
│  └─────────┼─────────────────────────┼────────────────────┘    │
│            │ useNotifications()      │ useSocket()              │
│            │                         │                         │
│  ┌─────────▼─────────────────────────▼────────────────────┐    │
│  │           Zustand Notification Store                   │    │
│  │  - notifications: []                                   │    │
│  │  - unreadCount: number                                 │    │
│  │  - add/remove/read notifications                       │    │
│  └─────────▲─────────────────────────┬────────────────────┘    │
│            │                         │                         │
│  ┌─────────┴────────────────────────┬────────────────────┐    │
│  │       Socket Service (socketService.js)              │    │
│  │  - Connect/Disconnect to server                      │    │
│  │  - Emit events (notification:read, etc.)             │    │
│  │  - Listen to server events                           │    │
│  └─────────▲────────────────────────────────────────────┘    │
│            │ Socket.io Connection                              │
└────────────┼──────────────────────────────────────────────────┘
             │ ws://localhost:3000
             │
┌────────────▼──────────────────────────────────────────────────┐
│                   EXPRESS + SOCKET.IO SERVER                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Socket.io Connection Handler                   │  │
│  │  - Authenticate with JWT (socket.io.auth)             │  │
│  │  - Create per-user rooms (room: user_123)             │  │
│  │  - Handle client disconnects                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ▲                                    │
│         ┌────────────────┼────────────────┐                  │
│         │                │                │                  │
│  ┌──────▼─────┐  ┌──────▼──────┐  ┌─────▼────────┐         │
│  │ Job Events │  │Notification │  │  Approval    │         │
│  │ Handlers   │  │  Service    │  │  Handlers    │         │
│  └────────────┘  └─────────────┘  └──────────────┘         │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                    │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │    Database: notifications Table                       │  │
│  │  - id, tenant_id, user_id, type, priority             │  │
│  │  - title, message, data (JSONB)                       │  │
│  │  - is_read, read_at, created_at, expires_at           │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Technology Stack

### Frontend
```javascript
{
  "transport": "Socket.io (HTTP Long Polling fallback)",
  "stateManagement": "Zustand",
  "components": "React 19 + TailwindCSS",
  "notifications": "Toast + Badge",
  "hooks": "useSocket(), useNotifications()"
}
```

### Backend
```javascript
{
  "framework": "Express.js",
  "realTime": "Socket.io",
  "authentication": "JWT (socket.io.auth)",
  "database": "Supabase PostgreSQL",
  "notifications": "notificationService.js"
}
```

### Communication Protocol
- **Transport:** WebSocket with HTTP Long Polling fallback
- **Rooms:** Per-user isolation (tenant_id:user_id)
- **Authentication:** JWT token in socket.io.auth
- **Broadcasting:** io.to(room).emit(event, data)

---

## 📊 Database Schema

### notifications Table
```sql
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  
  -- Notification metadata
  type VARCHAR(50) NOT NULL,  -- job_assigned, approval_needed, sla_alert, etc.
  priority VARCHAR(20) NOT NULL,  -- CRITICAL, HIGH, MEDIUM, LOW
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Associated resource
  data JSONB,  -- {jobId, djId, approvalId, etc.}
  
  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  -- Lifecycle
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires ON notifications(expires_at)
  WHERE expires_at > CURRENT_TIMESTAMP;
```

### Notification Types
| Type | Priority | Trigger | User |
|------|----------|---------|------|
| `job_assigned` | HIGH | Job assigned to someone | Assignee |
| `approval_needed` | CRITICAL | Job waiting for approval | Approver |
| `approval_approved` | MEDIUM | Job approved | Requester |
| `approval_rejected` | HIGH | Job rejected | Requester + Assignee |
| `sla_alert_24h` | HIGH | 24 hours until deadline | Assignee |
| `sla_alert_overdue` | CRITICAL | Deadline passed | Assignee + Manager |
| `comment_added` | MEDIUM | Someone commented | Watchers |
| `job_completed` | LOW | Job marked complete | Requester |

---

## 🔄 Socket.io Events

### Client → Server
```javascript
// Notification acknowledgement
socket.emit('notification:read', { notificationId: 123 });
socket.emit('notification:read-all', { userId: 456 });
socket.emit('notification:delete', { notificationId: 123 });

// Job event listeners (for testing)
socket.emit('test:create-job', { projectId: 1, jobTypeId: 2 });
socket.emit('test:assign-job', { jobId: 5, assigneeId: 3 });
```

### Server → Client
```javascript
// Real-time notifications
socket.emit('notification:new', {
  id: 123,
  type: 'job_assigned',
  priority: 'HIGH',
  title: 'DJ-2026-0005 assigned to you',
  message: 'Banner Design - Q1 Campaign',
  data: { jobId: 5, djId: 'DJ-2026-0005' },
  createdAt: '2026-01-27T10:30:00Z'
});

socket.emit('notification:unread-count', { count: 3 });

socket.emit('job:assigned', {
  jobId: 5,
  djId: 'DJ-2026-0005',
  assigneeId: 3,
  assigneeName: 'John Doe'
});

socket.emit('approval:status-changed', {
  jobId: 5,
  djId: 'DJ-2026-0005',
  status: 'approved',
  approvedBy: 'Manager Name'
});
```

---

## 📁 File Structure

### Frontend Files to Create
```
frontend/src/modules/
├── shared/
│   ├── services/
│   │   └── socketService.js ✨ NEW
│   ├── stores/
│   │   └── notificationStore.js ✨ NEW
│   ├── hooks/
│   │   ├── useSocket.js ✨ NEW
│   │   └── useNotifications.js ✨ NEW
│   └── components/
│       ├── NotificationBadge.jsx ✨ NEW
│       └── NotificationToast.jsx ✨ NEW
│
├── core/layout/
│   └── TopBar.jsx ✏️ UPDATE
│
└── features/assignee/pages/
    └── MyQueue.jsx ✏️ UPDATE
```

### Backend Files to Create
```
backend/src/
├── socket/
│   ├── server.js ✨ NEW
│   ├── middleware/
│   │   └── auth.js ✨ NEW
│   └── handlers/
│       ├── jobEvents.js ✨ NEW
│       └── notificationEvents.js ✨ NEW
│
├── services/
│   └── notificationService.js ✨ NEW
│
├── routes/
│   ├── notifications.js ✨ NEW
│   └── jobs.js ✏️ UPDATE
│
└── index.js ✏️ UPDATE
```

### Database Files
```
database/migrations/
└── 012_create_notifications_table.sql ✨ NEW
```

---

## 🔐 Security Considerations

### Authentication & Authorization
```javascript
// Socket.io connection requires JWT
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('authToken'),  // JWT from login
    tenantId: store.user.tenantId
  }
});

// Server validates JWT before accepting connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const tenantId = socket.handshake.auth.tenantId;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.tenantId = decoded.tenantId;
    socket.role = decoded.role;
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});
```

### Per-User Isolation
```javascript
// Each user has isolated room
// Notifications only sent to specific user's room
io.to(`tenant_${tenantId}:user_${userId}`).emit('notification:new', data);
```

### Rate Limiting
- Socket.io events throttled
- Max 100 notifications per user per day
- Cleanup: Auto-delete notifications older than 30 days

---

## 📈 Performance Metrics

### Goals
- **Connection Time:** < 2 seconds
- **Event Latency:** < 500ms (real-time perception)
- **Max Concurrent Users:** 500+ per server
- **Notification Delivery:** 99.9% reliable

### Optimization Strategies
1. **Connection Pooling:** Reuse socket connections
2. **Event Batching:** Group multiple notifications
3. **Database Pagination:** Fetch notifications in batches (20 per page)
4. **Index Optimization:** Fast queries on user_id + is_read
5. **Caching:** Redis for unread counts (future)

---

## 🧪 Testing Strategy

### Manual Test Scenarios
1. **Connection Test**
   - User opens app → Socket connects
   - Verify token validation
   - Check user room assignment

2. **Job Assignment Test**
   - Create job with assignee
   - Assignee receives notification instantly
   - Badge updates without page refresh

3. **Approval Workflow Test**
   - Submit job for approval
   - Approver receives notification
   - Approver marks as read
   - Requester sees updated status

4. **SLA Alert Test**
   - Job near deadline (24 hours)
   - User receives SLA alert
   - Click notification → Jump to job detail

5. **Multi-User Sync Test**
   - Multiple users in MyQueue
   - One user assigns a job
   - Other users see update instantly
   - No page refresh needed

6. **Connection Recovery Test**
   - User goes offline (close browser)
   - Reconnect to network
   - Auto-reconnect with Socket.io
   - Resume receiving notifications

---

## 🚀 Deployment Checklist

- [ ] Environment variables set (SOCKET_PORT, JWT_SECRET)
- [ ] Firewall allows WebSocket connections
- [ ] SSL/TLS enabled for secure connections
- [ ] Database notifications table created
- [ ] Cron job configured for notification cleanup (30-day expiry)
- [ ] Error logging enabled for socket events
- [ ] Performance monitoring in place
- [ ] User documentation updated

---

## 📝 Implementation Phases

### Phase 1: Frontend Socket Setup (4-5 hours)
- Create socketService, notificationStore
- Create hooks and components
- Update MyQueue and TopBar

### Phase 2: Backend Socket Server (4-5 hours)
- Create Socket.io server with auth
- Create event handlers
- Create notification service
- Create API routes

### Phase 3: Integration (2-3 hours)
- Wire job events to socket emissions
- Test end-to-end flow
- Fix edge cases

### Phase 4: UI Polish (2-3 hours)
- Add animations
- Polish styling
- Accessibility checks

### Phase 5: QA & Testing (2-3 hours)
- Manual testing scenarios
- Performance validation
- Security review
- Multi-user sync testing

**Total Effort:** 16-19 hours

---

## 📞 Support & Maintenance

### Monitoring
- Monitor socket connections via logs
- Alert on connection failures
- Track notification delivery time
- Monitor database size

### Troubleshooting
- Check Socket.io connection status
- Verify JWT token validity
- Check database notifications table
- Review server logs for errors

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-27 | Initial architecture design |

---

**Document prepared by:** OpenCode AI  
**Status:** Ready for Implementation Phase 1
