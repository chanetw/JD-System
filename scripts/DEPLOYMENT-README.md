# DJ System V1 Role Migration - Deployment Scripts

This directory contains automated deployment scripts for the V2→V1 role migration.

## 🚀 Quick Start

### Option 1: Full Automated Deployment (Recommended)
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This script will:
- ✅ Install backend dependencies
- ✅ Build TypeScript V2 code
- ✅ Start backend server
- ✅ Install frontend dependencies
- ✅ Build frontend for production
- ✅ Verify everything is working

### Option 2: Deploy Backend Only
```bash
chmod +x scripts/deploy-backend.sh
./scripts/deploy-backend.sh
```

Backend will start on: `http://localhost:5000`

### Option 3: Deploy Frontend Only
```bash
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

Frontend build output: `frontend/dist/`

### Option 4: Verify Deployment
```bash
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh
```

Runs all verification tests and displays results.

---

## 📋 Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy.sh` | Full deployment (backend + frontend) | `./scripts/deploy.sh` |
| `deploy-backend.sh` | Backend only | `./scripts/deploy-backend.sh` |
| `deploy-frontend.sh` | Frontend only | `./scripts/deploy-frontend.sh` |
| `verify-deployment.sh` | Verify deployment | `./scripts/verify-deployment.sh` |

---

## 🔧 What Each Script Does

### `deploy.sh` - Full Deployment
1. Verifies git status
2. Installs backend dependencies
3. Builds TypeScript V2 code
4. Starts backend server
5. Verifies backend health
6. Installs frontend dependencies
7. Builds frontend for production
8. Displays deployment summary

### `deploy-backend.sh` - Backend Only
1. Installs dependencies
2. Builds TypeScript
3. Starts server on port 5000

### `deploy-frontend.sh` - Frontend Only
1. Installs dependencies
2. Builds for production
3. Creates `dist/` directory ready for deployment

### `verify-deployment.sh` - Verification
1. Checks backend health
2. Tests database connection
3. Verifies role names
4. Tests API endpoints
5. Checks frontend build
6. Verifies code changes
7. Displays summary

---

## 🎯 Step-by-Step Deployment

### Step 1: Run Backend Deployment
```bash
cd /Users/chanetw/Documents/DJ-System
./scripts/deploy-backend.sh
```

**Expected output:**
```
🚀 Deploying Backend...
📦 Installing dependencies...
🔨 Building TypeScript V2 code...
🚀 Starting backend server...
[Server logs...]
```

Backend will keep running. Leave this terminal open.

### Step 2: Open New Terminal & Deploy Frontend
```bash
cd /Users/chanetw/Documents/DJ-System
./scripts/deploy-frontend.sh
```

**Expected output:**
```
🎨 Deploying Frontend...
📦 Installing dependencies...
🔨 Building for production...
✅ Build complete!
```

### Step 3: Verify Deployment
```bash
# In another terminal
./scripts/verify-deployment.sh
```

**Expected output:**
```
✅ Backend is running and healthy
✅ Frontend dist/ directory exists
✅ Backend using V1 roles
✅ Frontend using V1 roles
✅ All checks passed!
```

### Step 4: Deploy Frontend to Production
```bash
# Copy build files to web server
cp -r frontend/dist/* /var/www/dj-system/

# OR if using PM2 or other process manager
# Update environment and restart
```

### Step 5: Test in Browser
1. Open: `http://localhost:5173` (dev) or production URL
2. Clear cache: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Login with test accounts:
   - **Admin**: `admin@test.com`
   - **Requester**: `requester@test.com`
   - **Approver**: `approver@test.com`
   - **Assignee**: `assignee@test.com`

---

## ⚠️ Important Notes

### Before Deployment

- [ ] All code changes committed and pushed
- [ ] Database migration complete (roles in PascalCase)
- [ ] Node.js and npm installed
- [ ] Backend port 5000 is available
- [ ] Database credentials in `.env` are correct

### During Deployment

- [ ] Backend terminal stays open (shows server logs)
- [ ] Frontend build completes without errors
- [ ] No existing process running on port 5000

### After Deployment

- [ ] All users must re-login (old JWT tokens invalid)
- [ ] Clear browser cache before testing
- [ ] Test each role: Admin, Requester, Approver, Assignee
- [ ] Verify UI shows correct menus per role
- [ ] Check server logs for any errors

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is already in use
lsof -i :5000

# Kill existing process
kill -9 <PID>

# Try again
./scripts/deploy-backend.sh
```

### npm not found
```bash
# Install Node.js first
# Mac: brew install node
# Or download from nodejs.org

# Verify installation
node --version
npm --version
```

### Frontend build fails
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Backend health check fails
```bash
# Wait a few seconds for server to start
sleep 5

# Try again
curl http://localhost:5000/api/v2/health

# Check logs for errors
tail -f logs/error.log
```

### Still having issues?
See: `docs/DEPLOYMENT-GUIDE-V1-ROLES.md` for detailed troubleshooting

---

## 📊 Deployment Checklist

- [ ] Run `deploy.sh` or individual scripts
- [ ] Verify backend health: `curl http://localhost:5000/api/v2/health`
- [ ] Verify database roles: `SELECT DISTINCT role_name FROM user_roles;`
- [ ] Run `verify-deployment.sh`
- [ ] Copy frontend build to production
- [ ] Clear browser cache
- [ ] Test login for each role
- [ ] Verify UI permissions per role
- [ ] Check server logs for errors
- [ ] Monitor for user issues

---

## 🔄 Rollback

If something goes wrong:

```bash
# Stop backend
Ctrl+C  # In backend terminal

# Revert to previous commit
git reset --hard 7bd1ca4

# Redeploy old version
./scripts/deploy.sh
```

---

## 📞 Support

For detailed information:
- Deployment guide: `docs/DEPLOYMENT-GUIDE-V1-ROLES.md`
- Testing checklist: `docs/TESTING-CHECKLIST-V1-ROLES.md`
- Role migration plan: `docs/ROLE-MIGRATION-PLAN.md`

---

## 📝 Version Info

- **Migration**: V2→V1 Role Names
- **Commit**: `2dd68ed`
- **Files Modified**: 40 (18 backend, 12+ frontend)
- **Roles**: Admin, Requester, Approver, Assignee (V1 PascalCase)

---

**Ready to deploy?** 🚀

```bash
./scripts/deploy.sh
```
