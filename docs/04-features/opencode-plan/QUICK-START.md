# 🚀 Quick Start Guide - DJ System Real-time Notifications

**Goal:** Get the real-time notification system running in 10 minutes

---

## ⚡ 5-Minute Setup

### Terminal 1: Start Backend

```bash
cd backend/api-server
npm install          # First time only (30 seconds)
npm run dev          # Should show "Server running at http://localhost:3000"
```

✅ Backend is running on port 3000

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev          # Should show "Local: http://localhost:5173"
```

✅ Frontend is running on port 5173

### Terminal 3 (optional): View Server Logs

Keep the backend terminal visible to see real-time logs:
```
[Socket] User connected: 123 (Role: assignee)
[Notification Event] notification:read: { notificationId: 456 }
```

---

## 🧪 Quick Test

### 1. Open App
- Go to: `http://localhost:5173`
- Login with test credentials
- Open DevTools (F12) → Console tab

### 2. Check Connection
Should see:
```
[socketService] Connected to server. Socket ID: abc123xyz...
[useSocket] Connected
```

### 3. Test Toast Notification
In browser console, run:
```javascript
const { useNotificationStore } = window.__notificationStore__ || {};
// Alternatively, wait for notification from backend
// Or trigger an action that generates one
```

Or open DevTools Network → WS tab to see Socket.io messages.

### 4. Check Badge
Look at top-right header:
- Should see notification bell icon
- If you have unread notifications, should show red badge with count

---

## 📝 Test Scenarios (5 minutes each)

### Test 1: Auto-Refresh on Assignment
```bash
# Terminal 1: Create and assign a job (from another admin window)
# Check: MyQueue should refresh automatically without F5
```

### Test 2: Toast Appears
```bash
# Action: Trigger any job assignment/approval
# Check: Toast notification appears at top-right
```

### Test 3: Badge Updates
```bash
# Check: Notification bell shows count
# Click: Count should decrease after marking as read
```

### Test 4: Connection Recovery
```bash
# Open DevTools → Network tab
# Throttle to "Offline"
# Go back online
# Check: Socket auto-reconnects
```

---

## 🔧 Common Commands

### View Backend Logs
```bash
cd backend/api-server
npm run dev
# Or with debug: DEBUG=* npm run dev
```

### Test Socket Connection
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","message":"DJ System API Server is running"}
```

### View Frontend Socket Events
```javascript
// In browser console:
console.log('Socket connected:', window.__socket__?.connected);
// Or check Network → WS tab
```

### Reset Everything
```bash
# Frontend
rm -rf frontend/node_modules
npm install

# Backend
rm -rf backend/api-server/node_modules
npm install
```

---

## ⚙️ Configuration Quick Reference

### Backend (.env)
```env
PORT=3000                           # Socket.io port
FRONTEND_URL=http://localhost:5173  # CORS origin
JWT_SECRET=your-secret-key          # Match frontend authStore
```

### Frontend (socketService.js)
```javascript
const socketUrl = 'http://localhost:3000'; // Should match backend PORT
```

---

## 🐛 Troubleshooting (30 seconds)

| Problem | Solution |
|---------|----------|
| Socket won't connect | Check backend running on 3000 |
| JWT error | Verify JWT_SECRET in .env |
| CORS error | Check ALLOWED_ORIGINS in .env |
| Badge not updating | Check browser console for errors |
| Toast not appearing | Verify Socket.io WS connection in DevTools |
| No notifications | Check if events are being emitted |

---

## 📊 What's Running

```
Frontend: http://localhost:5173 (React app)
Backend API: http://localhost:3000 (Express)
Socket.io: ws://localhost:3000 (WebSocket)
```

---

## ✅ Success Indicators

- ✅ Backend terminal shows: `"Server running at http://localhost:3000"`
- ✅ Frontend terminal shows: `"Local: http://localhost:5173"`
- ✅ Browser console shows: `"[socketService] Connected to server"`
- ✅ No CORS errors in DevTools Console
- ✅ No authentication errors in backend logs

---

## 📚 Next Steps

1. **Understand the Architecture:** Read `01-realtime-notifications-architecture.md`
2. **Run All Tests:** Follow `04-setup-and-testing-guide.md`
3. **Review Code:** Check `docs/opencode-plan/03-senior-developer-review.md`
4. **Deploy:** Follow production deployment guide (future)

---

## 💡 Tips

1. Keep backend terminal visible to see logs
2. Use DevTools → Network → WS tab to monitor Socket.io frames
3. Check browser console for [socketService] logs
4. Test with 2 browser windows for multi-user testing

---

**Total setup time:** ~5 minutes  
**Total testing time:** ~10-15 minutes  
**Ready for development:** ✅ After this guide

---

Need help? Check the full guides in `/docs/opencode-plan/`
