# 🚀 Quick Start: Run Migrations in Supabase

## Option A: Run All-In-One (Fastest) ⚡

**Best for:** Running everything at once

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/putfusjtlzmvjmcwkefv/editor
   ```

2. Click **"+ New Query"**

3. Copy ALL contents from:
   ```
   database/migrations/manual/ALL_IN_ONE.sql
   ```

4. Paste into Supabase SQL Editor

5. Click **"Run"** (or press Cmd+Enter)

6. ✅ Done! All migrations applied at once.

---

## Option B: Run Step-by-Step (Recommended) 🎯

**Best for:** Careful verification at each step

Run these files **IN ORDER**:

```
1. 001_create_departments.sql       → Creates departments table
2. 002_add_users_department.sql     → Links users to departments
3. 003_add_approval_flows_team_lead.sql → Adds team lead config
4. 004_add_jobs_assigned_at.sql     → Adds assignment timestamp
5. 005_seed_departments.sql         → Creates sample departments
6. 006_verify_all.sql               → Verifies everything worked
```

**For each file:**
1. Open Supabase SQL Editor
2. Copy file contents
3. Paste and click "Run"
4. Verify success message
5. Move to next file

---

## ⚠️ Important Notes

- **Tenant ID**: If your tenant_id is NOT 1, edit `005_seed_departments.sql` before running
- **Safe to Re-run**: All migrations use `IF NOT EXISTS` - safe to run multiple times
- **Order Matters**: Run step-by-step in order (Option B)

---

## ✅ After Migration

Run this query to verify everything:

```sql
-- Quick verification
SELECT 'departments' AS table_name, COUNT(*) FROM departments
UNION ALL
SELECT 'users with dept_id', COUNT(department_id) FROM users
UNION ALL  
SELECT 'approval_flows', COUNT(*) FROM approval_flows;
```

Expected output:
```
departments        | 4
users with dept_id | (varies)
approval_flows     | (varies)
```

---

## 🎯 Next: Test the Feature

1. Open frontend: http://localhost:5173
2. Go to Admin → Approval Flow
3. Look for "Auto-assign to Team Lead" checkbox
4. Check it and save
5. Create a test job and approve it
6. Verify auto-assignment works!

---

## 📞 Troubleshooting

**Error: "relation already exists"**
→ Table already created, safe to continue

**Error: "column already exists"**  
→ Column already added, safe to continue

**Error: "foreign key violation"**
→ Check that referenced tables exist (tenants, users)

**Error: "tenant_id = 1 not found"**
→ Update tenant_id in 005_seed_departments.sql to match your tenant
