# ⚡ QUICK START - Option A (Production Direct)

**Status:** 🚀 GO!
**Timeline:** 2 hours
**Risk:** MEDIUM (mitigated with backup + rollback)

---

## 🎯 PRE-DEPLOYMENT CHECKLIST (Do NOW!)

```bash
# ✅ 1. Create & Verify Backup
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump $PROD_DATABASE_URL > /backups/dj_backup_$timestamp.sql
ls -lh /backups/dj_backup_$timestamp.sql  # Verify size > 10MB
wc -l /backups/dj_backup_$timestamp.sql   # Verify lines > 1000

# ✅ 2. Verify Backup Works (test restore)
# psql test_db < /backups/dj_backup_$timestamp.sql  # OPTIONAL but recommended

# ✅ 3. Final Code Check
cd /path/to/DJ-System
git status  # Should be clean
git log --oneline -5  # Verify commits

# ✅ 4. Team Notification
echo "⏱️ Deploying V1 Extended in 30 minutes. Starting at [TIME]"
# Notify on Slack/Email

# ✅ 5. On-Call Ready
# Ask team: "Ready to respond if issues occur?"
```

---

## 🚀 4 MAIN STEPS (90 minutes total)

### **STEP 1: Database Migration** (10 min)
```bash
echo "Step 1: Running migration..."
psql $PROD_DATABASE_URL < database/migrations/manual/016_extend_v1_remove_v2_approval_flow.sql

# Verify immediately
echo "Checking V1 columns added..."
psql $PROD_DATABASE_URL -c "
  SELECT COUNT(*) as columns_added FROM information_schema.columns
  WHERE table_name = 'approval_flows'
  AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id');"

# Expected: 4

echo "Checking V2 tables deleted..."
psql $PROD_DATABASE_URL -c "
  SELECT COUNT(*) as v2_tables FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('approval_flow_templates', 'approval_flow_steps',
                     'project_flow_assignments', 'project_flow_approvers');"

# Expected: 0

echo "✅ STEP 1 COMPLETE"
```

**❌ If error:**
```bash
echo "Rollback database..."
psql $PROD_DATABASE_URL < database/migrations/manual/016_ROLLBACK_extend_v1_remove_v2.sql
echo "STOP - Rollback complete. Investigate issue."
exit 1
```

---

### **STEP 2: Deploy Backend** (10 min)
```bash
echo "Step 2: Deploying backend..."

# SSH to production backend server
cd /path/to/DJ-System/backend/api-server

# Pull code
git fetch origin main
git checkout main
git pull origin main

# Install & build
npm install --production
npx prisma generate

# Restart service
pm2 restart dj-system-api

# Verify
sleep 3
pm2 status dj-system-api
pm2 logs dj-system-api --lines 20

echo "✅ STEP 2 COMPLETE"
```

**❌ If backend fails:**
```bash
pm2 logs dj-system-api --lines 100
# Fix issue or proceed to ROLLBACK
```

---

### **STEP 3: Deploy Frontend** (5 min)
```bash
echo "Step 3: Deploying frontend..."

cd /path/to/DJ-System/frontend

# Build
npm install --production
npm run build

# Deploy (follow your procedure)
# - Upload dist/ to S3/CDN
# - Or reload nginx/apache
# - Or deploy to Vercel/Netlify
# ...YOUR DEPLOY COMMAND HERE...

# Verify page loads
curl -s https://your-app.com | grep DOCTYPE

echo "✅ STEP 3 COMPLETE"
```

---

### **STEP 4: Smoke Tests** (30 min)
```bash
echo "Step 4: Running smoke tests..."

# Test 1: Health check
echo "Test 1: API Health"
curl -X GET https://api.your-app.com/api/health

# Test 2: Create job (normal approval)
echo "Test 2: Create job - Normal Flow"
curl -X POST https://api.your-app.com/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"projectId": 1, "jobTypeId": 3, "subject": "Test", "dueDate": "2026-02-15"}'
# Expected: status: "pending_approval"

# Test 3: Approve job
echo "Test 3: Approve job"
curl -X POST https://api.your-app.com/api/jobs/[jobId]/approve \
  -H "Authorization: Bearer $APPROVER_TOKEN" \
  -d '{"comment": "Good"}'
# Expected: success: true

# Test 4: Frontend loads
echo "Test 4: Frontend loads"
curl -s https://your-app.com/admin/approval-flow | grep "Job Type"
# Expected: Contains "Job Type" text

# Test 5: No error logs
echo "Test 5: Check logs"
pm2 logs dj-system-api --lines 50 | grep -i "error"
# Expected: No output (or non-critical warnings only)

echo "✅ STEP 4 COMPLETE - All tests passed!"
```

---

## 📊 MONITOR (Next 4 hours)

```bash
# Every 15 minutes:
echo "=== Status Check ==="
date
pm2 status dj-system-api
pm2 logs dj-system-api --lines 20 | tail -10

# Every 30 minutes:
curl -s https://api.your-app.com/api/health
echo "API responding..."

# Every 1 hour:
# Run all 5 smoke tests again
```

---

## 🎉 SUCCESS INDICATORS

✅ All of these should be true:

```
□ Migration ran without errors
□ Backend status: online
□ Frontend loads without 404
□ Smoke test 1-5 all pass
□ No ERROR/FATAL in logs
□ API response < 1 second
□ Users don't report issues
```

---

## 🚨 IF SOMETHING BREAKS

**Rollback immediately:**

```bash
echo "ROLLING BACK..."

# Stop services
pm2 stop dj-system-api

# Rollback database
psql $PROD_DATABASE_URL < database/migrations/manual/016_ROLLBACK_extend_v1_remove_v2.sql

# Revert code
cd /path/to/DJ-System/backend/api-server
git revert <commit-hash>  # Or: git reset --hard HEAD~1
npm install
npx prisma generate

# Restart
pm2 start dj-system-api

# Verify
pm2 logs dj-system-api --lines 50

echo "✅ ROLLBACK COMPLETE"
```

---

## ⏰ Timeline

```
T+0min   ├─ Backup verify
T+5min   ├─ STEP 1: Migration (10 min)
T+15min  ├─ STEP 2: Backend deploy (10 min)
T+25min  ├─ STEP 3: Frontend deploy (5 min)
T+30min  ├─ STEP 4: Smoke tests (30 min)
T+60min  ├─ ✅ All tests passed
T+60min → T+240min ├─ Monitor & watch logs
T+240min ├─ ✅ GO (or ROLLBACK)
```

---

## 📞 Support Contacts

```
During deployment, need help?

Error with migration?
  → DBA / Database Admin

Backend won't start?
  → Backend Lead / DevOps

Frontend build fails?
  → Frontend Lead

Unsure about rollback?
  → Tech Lead / On-Call
```

---

## 🎯 Final Checklist

Before pressing START:

```
□ Backup complete & verified
□ Team notified
□ Low-traffic window confirmed
□ On-call team standing by
□ All commands above reviewed
□ Rollback procedure understood
□ Have this doc open during deployment
□ Coffee ready ☕
```

---

## 🚀 YOU'RE READY!

**Next action:** STEP 1 (Migration)

**Command to run:**
```bash
psql $PROD_DATABASE_URL < database/migrations/manual/016_extend_v1_remove_v2_approval_flow.sql
```

**Then:** Follow STEP 2, 3, 4 above

**Good luck! 🚀**
