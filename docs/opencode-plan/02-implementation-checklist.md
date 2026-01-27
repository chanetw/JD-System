# DJ System Real-time Notifications: Implementation Checklist

**Date:** 2026-01-27  
**Target:** Complete implementation in 16-19 hours

---

## ✅ Phase 1: Frontend Socket Setup (4-5 hours)

### Socket Service Layer
- [ ] Create `socketService.js`
  - [ ] Initialize socket.io client with auth token
  - [ ] Handle connection/disconnection
  - [ ] Re-establish connection on network change
  - [ ] Event emitters (notification:read, read-all, delete)
  - [ ] Event listeners setup (notification:new, unread-count)
  - [ ] Error handling and logging

### State Management
- [ ] Create `notificationStore.js` (Zustand)
  - [ ] Store: notifications[], unreadCount
  - [ ] Actions: addNotification, removeNotification, readNotification
  - [ ] Actions: readAll, deleteNotification
  - [ ] Selectors: getUnreadCount, getNotifications
  - [ ] Persist: false (no localStorage)

### Custom Hooks
- [ ] Create `useSocket.js`
  - [ ] Initialize socket connection on mount
  - [ ] Cleanup on unmount
  - [ ] Return socket instance
  - [ ] Handle auth token from authStore

- [ ] Create `useNotifications.js`
  - [ ] Listen to socket events
  - [ ] Update notificationStore
  - [ ] Return notifications, unreadCount
  - [ ] Auto-mark as read on click

### Notification Components
- [ ] Create `NotificationBadge.jsx`
  - [ ] Display unread count (HIGH + CRITICAL only)
  - [ ] Show red badge if count > 0
  - [ ] Hide badge if count = 0
  - [ ] Click → Open notifications panel
  - [ ] TailwindCSS styling (Rose theme)

- [ ] Create `NotificationToast.jsx`
  - [ ] Show toast at top-right (or bottom-right per choice)
  - [ ] Display for 5-10 seconds then auto-dismiss
  - [ ] Click to go to related job
  - [ ] Close button
  - [ ] Color-coded by priority (red=CRITICAL, orange=HIGH)
  - [ ] Fade in/out animations

### Update Existing Components
- [ ] Update `TopBar.jsx`
  - [ ] Import NotificationBadge
  - [ ] Display badge next to user menu
  - [ ] Click badge → Show notification dropdown/modal
  - [ ] Wire up with useNotifications hook

- [ ] Update `MyQueue.jsx`
  - [ ] Import useSocket and useNotifications
  - [ ] Listen for job:assigned event
  - [ ] Auto-refresh job list when new assignment comes in
  - [ ] Or show toast notification on assign
  - [ ] Update UI when job status changes

---

## ✅ Phase 2: Backend Socket Server (4-5 hours)

### Socket.io Server Setup
- [ ] Create `socket/server.js`
  - [ ] Initialize Socket.io on Express server (port 3000)
  - [ ] Configure CORS for frontend URL
  - [ ] Setup authentication middleware
  - [ ] Initialize namespaces if needed
  - [ ] Error handling and logging

### Socket Authentication Middleware
- [ ] Create `socket/middleware/auth.js`
  - [ ] Extract JWT token from socket.handshake.auth
  - [ ] Verify JWT signature
  - [ ] Validate token not expired
  - [ ] Extract userId, tenantId, role
  - [ ] Attach to socket object
  - [ ] Reject if invalid

### Event Handlers
- [ ] Create `socket/handlers/jobEvents.js`
  - [ ] job:assigned → Emit to assignee
  - [ ] job:started → Emit to watchers
  - [ ] job:completed → Emit to watchers
  - [ ] job:rejected → Emit to requester + assignee

- [ ] Create `socket/handlers/notificationEvents.js`
  - [ ] notification:read → Mark as read in DB
  - [ ] notification:read-all → Mark all as read
  - [ ] notification:delete → Delete from DB
  - [ ] Return unread count

### Notification Service
- [ ] Create `services/notificationService.js`
  - [ ] `createNotification()` - Insert to DB + emit to user
  - [ ] `getNotifications(userId)` - Fetch with pagination
  - [ ] `getUnreadCount(userId)` - Count HIGH + CRITICAL unread
  - [ ] `markAsRead(notificationId)` - Update is_read
  - [ ] `markAllAsRead(userId)` - Mark all as read
  - [ ] `deleteNotification(notificationId)` - Delete
  - [ ] `emitToUser(userId, event, data)` - Socket broadcast
  - [ ] JSDoc comments for all functions

### API Routes
- [ ] Create `routes/notifications.js`
  - [ ] GET `/api/notifications` - List all (paginated)
  - [ ] GET `/api/notifications/unread-count` - Unread count
  - [ ] PATCH `/api/notifications/:id/read` - Mark single as read
  - [ ] PATCH `/api/notifications/read-all` - Mark all as read
  - [ ] DELETE `/api/notifications/:id` - Delete

- [ ] Update `routes/jobs.js`
  - [ ] POST `/api/jobs/:id/assign` - Emit socket event on success
  - [ ] POST `/api/jobs/:id/approve` - Emit socket event on success
  - [ ] POST `/api/jobs/:id/reject` - Emit socket event on success

### Update Backend Entry Point
- [ ] Update `backend/src/index.js`
  - [ ] Import Socket.io server setup
  - [ ] Attach Socket.io to Express app
  - [ ] Start Socket.io listeners on server start

---

## ✅ Phase 2b: Database Migration

- [ ] Create `database/migrations/012_create_notifications_table.sql`
  - [ ] Table: notifications
  - [ ] Columns: id, tenant_id, user_id, type, priority, title, message, data (JSONB)
  - [ ] Columns: is_read, read_at, created_at, expires_at
  - [ ] Primary key: id
  - [ ] Foreign keys: tenant_id, user_id
  - [ ] Indexes: user_unread, created, expires
  - [ ] Comments explaining each column

- [ ] Run migration
  - [ ] Check table created successfully
  - [ ] Verify indexes exist
  - [ ] Test insert/select

---

## ✅ Phase 3: Integration (2-3 hours)

### Wire Job Events to Socket
- [ ] When job assigned → Create notification + emit socket
- [ ] When job approved → Create notification + emit socket
- [ ] When job rejected → Create notification + emit socket
- [ ] When comment added → Create notification + emit socket (if @mentioned)

### Wire Approval Events to Socket
- [ ] When approval submitted → Create notification
- [ ] When approval completed → Create notification

### Test Socket Connection
- [ ] Browser console: Check socket connected (socket.id visible)
- [ ] Check JWT validated on server
- [ ] Check user room joined correctly

### Test Event Emission
- [ ] Manually emit test:create-job from client
- [ ] Server receives and broadcasts
- [ ] All clients in room receive update
- [ ] MyQueue list updates automatically

---

## ✅ Phase 4: UI Polish (2-3 hours)

### Animations & Transitions
- [ ] Toast fade-in animation (0.3s ease-out)
- [ ] Toast fade-out animation (0.3s ease-in)
- [ ] Badge pulse animation (attention-seeking)
- [ ] Dropdown slide-down animation

### Styling & Theme
- [ ] Notification colors match Rose/Pink theme
- [ ] CRITICAL = Rose-600 (dark red)
- [ ] HIGH = Rose-500 (medium red)
- [ ] MEDIUM = Amber-500 (orange)
- [ ] LOW = Gray-500 (neutral)
- [ ] Icons: Check, AlertCircle, Info, Bell

### Accessibility
- [ ] Toast has role="alert" (screen readers)
- [ ] Badge has aria-label="Unread notifications"
- [ ] Keyboard navigation for dropdown
- [ ] Focus styles visible on all interactive elements

---

## ✅ Phase 5: QA & Testing (2-3 hours)

### Test Scenario 1: Connection & Auth
- [ ] [ ] Start app → Socket connects in < 2 seconds
- [ ] [ ] Check browser DevTools: socket.id exists
- [ ] [ ] Close app → Socket disconnects
- [ ] [ ] Refresh page → Socket auto-reconnects

### Test Scenario 2: Job Assignment
- [ ] [ ] Admin assigns job to user
- [ ] [ ] User sees toast notification instantly
- [ ] [ ] No page refresh needed
- [ ] [ ] MyQueue list auto-updates
- [ ] [ ] Badge shows +1 unread count

### Test Scenario 3: Notification Read
- [ ] [ ] Click notification → marked as read
- [ ] [ ] Badge count decreases
- [ ] [ ] Old notification disappears from unread list
- [ ] [ ] Notification still visible in "All" list

### Test Scenario 4: Multiple Users
- [ ] [ ] Open app in 2 browser tabs (different users)
- [ ] [ ] Assign job to user 2
- [ ] [ ] User 2 sees notification instantly
- [ ] [ ] User 1 doesn't see notification (not targeted)

### Test Scenario 5: Connection Recovery
- [ ] [ ] Open DevTools → Throttle network to offline
- [ ] [ ] Reconnect network
- [ ] [ ] Socket auto-reconnects
- [ ] [ ] Unread notifications load on reconnect
- [ ] [ ] No data loss

### Test Scenario 6: Performance
- [ ] [ ] 20+ notifications in list
- [ ] [ ] Scrolling smooth (no lag)
- [ ] [ ] Toast animations smooth (60fps)
- [ ] [ ] Network tab: < 5KB per notification event

### Manual Testing Checklist
- [ ] [ ] Approver approves job → Toast shows "DJ-001 Approved"
- [ ] [ ] Job near deadline (24h) → SLA alert toast
- [ ] [ ] Multiple comments → Multiple toasts
- [ ] [ ] Click toast → Jump to job detail
- [ ] [ ] Close toast → Dismissed correctly
- [ ] [ ] Badge persists across page navigation
- [ ] [ ] Toast only shows HIGH + CRITICAL (not MEDIUM/LOW)
- [ ] [ ] Read toast → Badge count updates
- [ ] [ ] Read All button → All badges cleared

---

## ✅ Post-Implementation

### Code Quality
- [ ] All functions have JSDoc comments
- [ ] Code follows naming conventions (camelCase)
- [ ] No console.log left in production code
- [ ] Error handling for all async operations
- [ ] No hard-coded values (use env vars)

### Documentation
- [ ] README updated with socket setup instructions
- [ ] Socket events documented in API docs
- [ ] Database schema documented
- [ ] Environment variables documented

### Git & Version Control
- [ ] Create feature branch: `feature/realtime-notifications`
- [ ] Commit files in logical chunks
- [ ] Write descriptive commit messages
- [ ] Create Pull Request with summary
- [ ] Code review by team lead
- [ ] Merge to main branch

### Deployment
- [ ] Test in staging environment
- [ ] Verify Socket.io works with SSL/TLS
- [ ] Monitor performance after deploy
- [ ] Check error logs for issues
- [ ] Rollback plan if needed

---

## 📊 Progress Tracking

**Start Date:** 2026-01-27  
**Target Completion:** 2026-01-29 (16-19 hours cumulative)

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1: Frontend | 4-5h | — | Pending |
| Phase 2: Backend | 4-5h | — | Pending |
| Phase 3: Integration | 2-3h | — | Pending |
| Phase 4: UI Polish | 2-3h | — | Pending |
| Phase 5: QA & Testing | 2-3h | — | Pending |
| **TOTAL** | **16-19h** | — | **Pending** |

---

## 🎯 Success Criteria

✅ Implementation is successful when:
1. Socket.io connects securely with JWT
2. Notifications appear instantly without refresh
3. Badge shows unread count (HIGH + CRITICAL only)
4. All 6 manual test scenarios pass
5. Performance: connection < 2s, events < 500ms
6. Code has 100% JSDoc documentation
7. All team members understand the system
8. Zero production bugs in first week

---

**Document prepared by:** OpenCode AI  
**Status:** Ready for Phase 1 Implementation
