# Manual Database Migrations for Auto-Assign System

This directory contains step-by-step SQL files to manually set up the Auto-Assign feature in Supabase.

## 📋 Prerequisites

- Access to your Supabase Dashboard
- Project URL: https://supabase.com/dashboard/project/putfusjtlzmvjmcwkefv

## 🚀 Migration Steps

Run these files **IN ORDER** in the Supabase SQL Editor:

### Step 1: Create Departments Table
**File:** `001_create_departments.sql`

Creates the `departments` table with manager_id (Team Lead).

**Expected Output:**
```
✓ CREATE TABLE
✓ CREATE INDEX (3 indexes)
✓ Success message
```

---

### Step 2: Add Department to Users
**File:** `002_add_users_department.sql`

Adds `department_id` column to `users` table.

**Expected Output:**
```
✓ ALTER TABLE
✓ CREATE INDEX
✓ Shows user count
```

---

### Step 3: Add Team Lead to Approval Flows
**File:** `003_add_approval_flows_team_lead.sql`

Adds `include_team_lead` and `team_lead_id` columns to `approval_flows`.

**Expected Output:**
```
✓ ALTER TABLE (2 columns)
✓ CREATE INDEX
✓ Shows column details
```

---

### Step 4: Add Assigned Timestamp to Jobs
**File:** `004_add_jobs_assigned_at.sql`

Adds `assigned_at` column to `design_jobs` table.

**Expected Output:**
```
✓ ALTER TABLE
✓ Shows column details
```

---

### Step 5: Seed Sample Departments
**File:** `005_seed_departments.sql`

Inserts 4 sample departments (Design, Marketing, Social, Creative).

**⚠️ Important:** Update `tenant_id = 1` if your tenant ID is different.

**Expected Output:**
```
✓ INSERT (4 rows)
✓ Shows department list
```

---

### Step 6: Verify All Migrations
**File:** `006_verify_all.sql`

Runs verification queries to confirm everything is set up correctly.

**Expected Output:**
```
✓ All tables and columns exist
✓ Departments table has 4 records
✓ Indexes created successfully
```

---

## 📝 How to Run Each File

1. Open Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/putfusjtlzmvjmcwkefv/editor
   ```

2. Click **"SQL Editor"** in the left sidebar

3. Click **"+ New Query"**

4. Copy the contents of the first SQL file (`001_create_departments.sql`)

5. Paste into the query editor

6. Click **"Run"** (or press `Cmd+Enter` / `Ctrl+Enter`)

7. Verify the output shows success messages

8. Repeat steps 3-7 for each subsequent file in order

---

## ✅ Verification Checklist

After running all migrations, verify:

- [ ] `departments` table exists with 4 sample records
- [ ] `users` table has `department_id` column
- [ ] `approval_flows` table has `include_team_lead` and `team_lead_id` columns
- [ ] `design_jobs` table has `assigned_at` column
- [ ] All indexes created successfully
- [ ] No error messages in any migration

---

## 🔄 If Something Goes Wrong

### Rollback Individual Migrations:

**Undo 005 (Remove sample data):**
```sql
DELETE FROM departments WHERE tenant_id = 1 AND code IN ('DESIGN', 'MARKETING', 'SOCIAL', 'CREATIVE');
```

**Undo 004 (Remove assigned_at):**
```sql
ALTER TABLE design_jobs DROP COLUMN IF EXISTS assigned_at;
```

**Undo 003 (Remove approval_flows columns):**
```sql
ALTER TABLE approval_flows DROP COLUMN IF EXISTS include_team_lead;
ALTER TABLE approval_flows DROP COLUMN IF EXISTS team_lead_id;
```

**Undo 002 (Remove users.department_id):**
```sql
ALTER TABLE users DROP COLUMN IF EXISTS department_id;
```

**Undo 001 (Remove departments table):**
```sql
DROP TABLE IF EXISTS departments CASCADE;
```

---

## 🎯 Next Steps After Migration

Once all migrations complete successfully:

1. ✅ Test the Approval Flow UI (should show Team Lead checkbox)
2. ✅ Test auto-assign with Team Lead
3. ✅ Test auto-assign with Department Manager
4. ✅ Test manual assignment fallback
5. ✅ Test complete job workflow end-to-end

---

## 📞 Support

If you encounter any issues:
1. Check the Supabase logs for detailed error messages
2. Verify your tenant_id in step 005
3. Make sure you run the files in order (001 → 006)
4. Check if tables already exist (migrations are idempotent)

---

## 📊 Database Schema Changes Summary

| Table | New Columns | Foreign Keys |
|-------|-------------|--------------|
| `departments` | id, tenant_id, name, code, manager_id, description, is_active | manager_id → users(id) |
| `users` | department_id | department_id → departments(id) |
| `approval_flows` | include_team_lead, team_lead_id | team_lead_id → users(id) |
| `design_jobs` | assigned_at | (none) |

---

**Migration Files Version:** 1.0  
**Created:** 2026-01-27  
**Compatible with:** DJ System Auto-Assign Feature
