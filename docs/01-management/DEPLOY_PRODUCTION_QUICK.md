# 🚀 Production Deployment - Option A (Direct)

**⚠️ WARNING:** Skip staging testing - higher risk but faster deployment

---

## ⏱️ Timeline

| ขั้นตอน | เวลา | อธิบาย |
|--------|------|--------|
| **Pre-Deploy** | 30 min | Backup + Final checks |
| **Migration** | 10 min | Run forward migration |
| **Deploy** | 15 min | Backend + Frontend |
| **Smoke Test** | 30 min | Quick sanity check |
| **Monitor** | 4 hrs | Intensive monitoring |

**รวม:** 1.5-2 ชม. (เทียบ Staging 24-48 hrs)

---

## ⚠️ PRE-DEPLOYMENT MUST-DO (CRITICAL!)

### 1️⃣ Backup Production Database (สำคัญที่สุด!)
```bash
# ที่ Production Server
timestamp=$(date +%Y%m%d_%H%M%S)
backup_file="/backups/dj_system_backup_before_v1_extend_$timestamp.sql"

# Full backup
pg_dump $PROD_DATABASE_URL > $backup_file

# Verify file exists and has content
ls -lh $backup_file
wc -l $backup_file  # Should be > 1000 lines

# Optional: compress to save space
gzip $backup_file

echo "✅ Backup complete: $backup_file"
```

### 2️⃣ Final Code Review
```
□ Review all 6 changed files
□ Check no debug code/console.logs
□ Verify no secrets in code
□ Check migrations syntax
```

### 3️⃣ Team Notification
```
□ Tell team: "Deploying in X minutes"
□ On-call team: Ready to respond
□ Have rollback person on standby
```

### 4️⃣ Low-Traffic Window Check
```bash
# Check current traffic (if possible)
# Deploy during:
#   - Late night / early morning
#   - Monday-Thursday (not Friday)
#   - Not during peak hours
```

---

## 🚀 DEPLOYMENT STEPS (Do in order!)

### **STEP 1: Run Forward Migration** (10 min)

```bash
# On production database
psql $PROD_DATABASE_URL < database/migrations/manual/016_extend_v1_remove_v2_approval_flow.sql

echo "✅ Migration complete. Verifying..."
```

**Verify immediately:**
```bash
# V1 columns added
psql $PROD_DATABASE_URL -c "
  SELECT COUNT(*) as v1_columns FROM information_schema.columns
  WHERE table_name = 'approval_flows'
  AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id');"

# Should return: 4

# V2 tables gone
psql $PROD_DATABASE_URL -c "
  SELECT COUNT(*) as v2_tables FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('approval_flow_templates', 'approval_flow_steps',
                     'project_flow_assignments', 'project_flow_approvers');"

# Should return: 0
```

**If error:**
```bash
# Rollback immediately
psql $PROD_DATABASE_URL < database/migrations/manual/016_ROLLBACK_extend_v1_remove_v2.sql
echo "❌ ROLLBACK COMPLETE - return to Step 0"
exit 1
```

---

### **STEP 2: Deploy Backend** (10 min)

```bash
# SSH to production backend server
cd /path/to/DJ-System

# 1. Pull latest code (with V1 extended changes)
git fetch origin main
git checkout main
git pull origin main
git log --oneline -5  # Verify commits

# 2. Install dependencies
cd backend/api-server
npm install --production

# 3. Generate Prisma Client (MUST DO!)
npx prisma generate

# 4. Run any pending migrations (if any)
npx prisma migrate deploy

# 5. Restart service
pm2 restart dj-system-api
sleep 2

# 6. Verify running
pm2 status dj-system-api
pm2 logs dj-system-api --lines 20
```

**Success indicators:**
```
status: online ✅
uptime: just started (should be < 1 min)
logs: no ERROR or FATAL
```

**If failed:**
```bash
pm2 logs dj-system-api --lines 100  # Check error
# Fix issue OR rollback
```

---

### **STEP 3: Deploy Frontend** (5 min)

```bash
cd /path/to/DJ-System/frontend

# 1. Install dependencies
npm install --production

# 2. Build
npm run build

# 3. Deploy to CDN/Server
# (Follow your normal deployment procedure)
# - Upload dist/ to CDN
# - Or restart frontend service
# - Or reload web server config

# 4. Verify
curl -s https://your-app.com | grep "DOCTYPE"
# Should return HTML without errors
```

---

## ✅ SMOKE TESTS (30 min - DO ALL!)

### Test 1: Backend Health
```bash
curl -X GET https://api.your-app.com/api/health
# Expected: { "status": "ok", ... }
```

### Test 2: Can Create Job (Normal Flow)
```bash
# Create job with normal approval
curl -X POST https://api.your-app.com/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "projectId": 1,
    "jobTypeId": 3,
    "subject": "Test Job - Normal",
    "dueDate": "2026-02-15"
  }'

# Expected response: status: "pending_approval"
```

### Test 3: Can Create Job (Skip Approval)
```bash
# Setup: Create flow with skip approval first via UI
# Then create job

curl -X POST https://api.your-app.com/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "projectId": 1,
    "jobTypeId": 5,
    "subject": "Test Job - Skip",
    "dueDate": "2026-02-15"
  }'

# Expected response: status: "assigned", assigneeId: <number>
```

### Test 4: Approval Still Works
```bash
# Approve a job
curl -X POST https://api.your-app.com/api/jobs/<jobId>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $APPROVER_TOKEN" \
  -d '{"comment": "Looks good"}'

# Expected: success: true
```

### Test 5: Frontend Loads
```
1. Open https://your-app.com in browser
2. Go to Admin > Approval Flow
3. Check:
   ✅ Page loads without error
   ✅ Job Type selector visible
   ✅ Skip Approval toggle visible
   ✅ No 404 errors in console
   ✅ No "approval-templates" errors
```

---

## 🔍 INTENSIVE MONITORING (4 hours)

### Every 15 minutes:
```bash
# Check error logs
pm2 logs dj-system-api --lines 50 | grep -i error

# Check database query performance
psql $PROD_DATABASE_URL -c "
  SELECT COUNT(*) FROM approval_flows WHERE job_type_id IS NOT NULL;"

# Check API response time
time curl -s https://api.your-app.com/api/jobs | wc -c
```

### Every 30 minutes:
```bash
# Check users can log in
# Check users can create jobs
# Monitor error tracking service (Sentry, etc.)
```

### Every hour:
```bash
# Full smoke test cycle (all 5 tests above)
# Check database size (shouldn't grow unexpectedly)
# Check CPU/memory usage (shouldn't spike)
```

---

## 🚨 CRITICAL ALERTS - Rollback Immediately If:

| Alert | Action |
|-------|--------|
| Job creation > 10% failure | Rollback now |
| API response > 5 seconds | Rollback now |
| Database query errors | Rollback now |
| Memory usage > 80% | Rollback now |
| CPU usage > 90% | Rollback now |
| V2 route 404 errors | **OK** - expected |
| No job type data | Rollback now |

---

## 🔄 ROLLBACK PROCEDURE (If something breaks)

**Goal:** Revert to production state in < 15 min

```bash
# STEP 1: Stop new requests
# (Load balancer / nginx config)

# STEP 2: Rollback database
psql $PROD_DATABASE_URL < database/migrations/manual/016_ROLLBACK_extend_v1_remove_v2.sql

# Verify:
psql $PROD_DATABASE_URL -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'approval_flow_templates';"
# Should return: approval_flow_templates (V2 table restored)

# STEP 3: Revert backend code
git revert <commit-hash>  # Or git checkout previous-tag
npm install
npx prisma generate
pm2 restart dj-system-api

# STEP 4: Revert frontend
npm run build
# Deploy previous build

# STEP 5: Verify
curl https://api.your-app.com/api/health  # Should work

# STEP 6: Notify team
echo "⚠️ ROLLBACK COMPLETE - System reverted to V2"
```

---

## 📊 SUCCESS CRITERIA

### ✅ GO = All Pass:
- [x] All 5 smoke tests passed
- [x] No error logs in 1 hour
- [x] Job creation success rate > 99%
- [x] API response < 1 second
- [x] No database errors
- [x] V1 columns exist in production
- [x] V2 tables deleted
- [x] Users don't report issues

### ❌ NO-GO = Any fail:
- [ ] Smoke tests failed
- [ ] Job creation errors
- [ ] API slow (> 2s)
- [ ] Database corrupted
- [ ] V1/V2 sync issues

---

## ✍️ Sign-off Checklist

```bash
# Before starting
□ Backup complete and verified
□ Team notified
□ On-call team ready
□ Rollback plan reviewed
□ All 5 smoke tests scripts ready

# During deployment
□ Migration successful (verify queries)
□ Backend deployed (pm2 status = online)
□ Frontend deployed (page loads)
□ All 5 smoke tests passed

# After deployment
□ Monitoring running (every 15 min)
□ No critical errors in 1 hour
□ Users report no issues
□ Decision: KEEP or ROLLBACK
```

---

## 📞 Emergency Contacts

| Role | Contact | Action |
|------|---------|--------|
| **Database Admin** | [phone] | Backup/Recovery |
| **Backend Lead** | [phone] | Service restart |
| **DevOps** | [phone] | Deployment issues |
| **Tech Lead** | [phone] | GO/NO-GO decision |
| **On-Call** | [phone] | Emergency support |

---

## 🎯 Timeline Summary

```
T+0min   - Backup starts
T+5min   - Backup complete, migration ready
T+10min  - Migration executed
T+15min  - Backend deployed
T+20min  - Frontend deployed
T+25min  - Smoke tests start
T+55min  - Smoke tests complete ✅
T+55-240min - Intensive monitoring
T+240min - All-clear OR Rollback
```

---

## ⚠️ Differences from Option B (Staging)

| Aspect | Option A | Option B |
|--------|----------|----------|
| **Risk** | MEDIUM-HIGH | LOW |
| **Time** | 2 hours | 24-48 hours |
| **Rollback** | < 15 min | < 15 min |
| **Testing** | Smoke only | Full testing |
| **Recommendation** | Confident teams | First-time |

**Choose Option A if:**
- ✅ Team confident in code quality
- ✅ Backup ready & verified
- ✅ Rollback team on standby
- ✅ Low-traffic window available

**Choose Option B if:**
- ✅ First time deploying this change
- ✅ Want safety before production
- ✅ Risk-averse culture

---

**Status:** Ready to Deploy
**Option:** A (Direct to Production)
**Next:** Execute STEP 1

🚀 **Good luck! You've got this!**
