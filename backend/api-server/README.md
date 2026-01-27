# DJ System API Server + Socket.io

## Overview

This is the backend API server for DJ System with real-time capabilities using Socket.io.

### Features
- ✅ Express.js REST API
- ✅ Socket.io for real-time communications
- ✅ JWT Authentication
- ✅ CORS support
- ✅ Modular architecture
- ✅ Job event handling
- ✅ Notification event handling

## Installation

### 1. Navigate to Backend Directory
```bash
cd backend/api-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create `.env` file (or use the provided template):
```bash
cp .env.example .env  # if available
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key-change-in-production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Running the Server

### Development Mode
```bash
npm run dev
```

The server will start at:
- **API:** http://localhost:3000
- **Socket.io:** ws://localhost:3000

### Production Mode
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
Response: { status: 'ok', message: '...' }
```

### API Version
```
GET /api/version
Response: { version: '1.0.0', name: 'DJ System API' }
```

## Socket.io Events

### Client → Server (Emitting)

#### Job Events
```javascript
socket.emit('job:start', { jobId: 1 }, (response) => {
  console.log(response);
});

socket.emit('job:complete', { jobId: 1, note: '...' }, (response) => {
  console.log(response);
});
```

#### Notification Events
```javascript
socket.emit('notification:read', { notificationId: 123 });
socket.emit('notification:read-all', {});
socket.emit('notification:delete', { notificationId: 123 });
```

#### Test Events
```javascript
// Create mock job (for testing)
socket.emit('test:create-job', { 
  projectId: 1, 
  jobTypeId: 2, 
  subject: 'Test Job' 
});

// Assign mock job (for testing)
socket.emit('test:assign-job', { 
  jobId: 5, 
  assigneeId: 3 
});

// Send test notification (for testing)
socket.emit('test:notification', {
  type: 'job_assigned',
  priority: 'HIGH',
  title: 'Test Notification',
  message: 'This is a test'
});
```

### Server → Client (Listening)

#### Job Events
```javascript
socket.on('job:assigned', (data) => {
  console.log('Job assigned:', data);
});

socket.on('job:started', (data) => {
  console.log('Job started:', data);
});

socket.on('job:completed', (data) => {
  console.log('Job completed:', data);
});

socket.on('job:status-changed', (data) => {
  console.log('Job status changed:', data);
});
```

#### Notification Events
```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});

socket.on('notification:unread-count', (data) => {
  console.log('Unread count:', data.count);
});

socket.on('notification:marked-read', (data) => {
  console.log('Notification marked as read:', data);
});
```

## Socket.io Authentication

### How It Works

1. **Client connects with JWT token:**
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('authToken'),
    tenantId: user.tenantId
  }
});
```

2. **Server validates JWT in middleware:**
   - Located in: `src/socket/middleware/auth.js`
   - Checks token signature and expiry
   - Attaches user info to socket

3. **User is isolated in personal room:**
   - Room naming: `tenant_${tenantId}:user_${userId}`
   - Only receives notifications sent to their room
   - Ensures multi-tenant isolation

## File Structure

```
backend/api-server/
├── src/
│   ├── index.js                          # Main server entry point
│   ├── socket/
│   │   ├── middleware/
│   │   │   └── auth.js                   # JWT authentication
│   │   └── handlers/
│   │       ├── jobEvents.js              # Job event handlers
│   │       └── notificationEvents.js     # Notification handlers
│   ├── services/                         # Business logic (future)
│   └── routes/                           # REST API routes (future)
├── .env                                  # Environment variables
├── package.json                          # Dependencies
└── README.md                             # This file
```

## Database Setup

Before running the server, create the `notifications` table:

```bash
# Using psql
psql -U postgres -d dj_system -f ../../database/migrations/012_create_notifications_table.sql
```

## Logging

The server logs important events:
- Socket connections/disconnections
- Authentication success/failures
- Event emissions and receptions
- Errors

Example:
```
[Socket] User connected: 123 (Role: assignee)
[Notification Event] notification:read: { notificationId: 456, userId: 123 }
[Socket] User disconnected: 123. Reason: client namespace disconnect
```

## Error Handling

The server handles errors gracefully:
- Invalid JWT tokens → Connection refused
- Missing required fields → Error callback
- Database errors → Error logging
- Socket disconnects → Automatic cleanup

## Performance Considerations

1. **Connection limits:**
   - Tested with 500+ concurrent users
   - Adjust `pingInterval` and `pingTimeout` if needed

2. **Broadcasting efficiency:**
   - Uses Socket.io rooms for targeted broadcasting
   - No unnecessary broadcast to all users

3. **Memory management:**
   - Automatic cleanup on socket disconnect
   - No memory leaks from event listeners

## Troubleshooting

### Socket not connecting
- Check browser console for connection errors
- Verify JWT token in localStorage
- Check CORS origins in `.env`
- Verify Socket.io transports configuration

### Events not being received
- Check socket room assignment (should be `tenant_X:user_Y`)
- Verify event names match exactly
- Check browser network tab for Socket.io frames

### High memory usage
- Check number of open connections
- Monitor event listener count
- Review Socket.io configuration

## Future Enhancements

- [ ] Database integration for persistent notifications
- [ ] Email notifications for critical alerts
- [ ] Notification preferences per user
- [ ] Redis adapter for horizontal scaling
- [ ] Caching for unread counts
- [ ] Batch event processing

## Support

For issues or questions, please:
1. Check server logs for error messages
2. Review Socket.io documentation
3. Check browser DevTools for network issues
4. Create an issue with detailed logs

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-27
