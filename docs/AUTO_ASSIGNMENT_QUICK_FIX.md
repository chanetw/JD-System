# ⚡ AUTO-ASSIGNMENT QUICK FIX GUIDE

**🔴 Status:** Blocking Issue Identified
**📅 Date:** 2026-02-04
**👤 Created For:** Dev Team

---

## 🎯 The Problem (1 sentence)
Approval Flow ยังไม่ได้ set `skip_approval = true` → Auto-Assignment ไม่ทำงาน

---

## ✅ Root Cause Confirmed by Logs

```
Checking Approval Flow skip_approval = true
❌ Not Found: ไม่พบ Approval Flow ใดๆ ที่ตั้งค่า skip_approval = true

Checking Project Job Assignment has Assignee
✅ Pass: พบ 10 รายการ Project Job Assignment ที่ตั้งค่าไว้ถูกต้องแล้ว

Checking Create Job Logs for autoAssigned: true
❌ Not Found: เนื่องจากข้อ 1 ไม่ผ่าน จึงไม่มี Job ใดถูก Auto-Assign
```

---

## 🚀 3-Minute Quick Fix

### **Step 1: Go to Approval Flow Admin Page** (30 seconds)

```
URL: http://localhost:5137/admin/approval-flow
```

### **Step 2: Find or Create Flow** (1 minute)

1. เลือก Project (e.g., "Sena Development")
2. เลือก Job Type (e.g., "Bug Fix", "Feature Request")
3. ตรวจสอบ flow ว่ามีอยู่แล้วหรือไม่

### **Step 3: ENABLE "Skip Approval" Checkbox** ⭐ (30 seconds)

**THIS IS THE KEY!**

- ✅ ค้นหา Checkbox: **"Skip Approval (ข้ามการอนุมัติ)"**
- ✅ **Click เพื่อให้ ✓ mark ปรากฏ**
- ✅ (Optional) Set "Auto-Assign User" ถ้าต้องการ

**Before:**
```
☐ Skip Approval (ข้ามการอนุมัติ)
```

**After:**
```
☑️ Skip Approval (ข้ามการอนุมัติ)
```

### **Step 4: Save** (30 seconds)

- ✅ คลิก "บันทึก" หรือ "Save" button

---

## ✅ Verify It Worked

### **Test 1: Create a Job**

```
1. สร้าง Job ใหม่ใน Project ที่เพิ่งแก้ไข
2. เปิด DevTools (F12) → Network Tab
3. หา Request: POST /api/jobs
4. ตรวจสอบ Response:
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "assigned",        // ← ต้อง "assigned" ไม่ใช่ "pending_approval"
    "flowInfo": {
      "isSkipped": true,         // ✅ ยืนยัน
      "autoAssigned": true       // ✅ ยืนยัน
    }
  }
}
```

**If you see:**
```
"status": "pending_approval"
```

→ ❌ skip_approval ยังไม่เปิด → กลับไป Step 3

---

## 🔧 If User List Not Loading

**ปัญหา:** Assignment Matrix dropdown ว่างเปล่า (ไม่มี users แสดง)

### Quick Debug:

```javascript
// Paste ลงใน Browser Console เมื่ออยู่ใน Approval Flow page:

// 1. Check if API returns users
fetch('http://localhost:3000/api/users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => {
  const assignees = data.data.data.filter(u =>
    u.userRoles?.some(r => r.roleName === 'assignee')
  );
  console.log('Assignees found:', assignees.length);
  console.log('Sample:', assignees[0]);
});
```

**If count = 0:**
- ❌ ไม่มี users with role='assignee' ใน database
- ✅ Go to User Management → assign some users role "assignee"

**If shows error:**
- ❌ API error (check backend console)
- ✅ Report error to backend dev

---

## 📋 Checklist

- [ ] Opened Admin → Approval Flow page
- [ ] Selected Project and Job Type
- [ ] ✅ Checked "Skip Approval" checkbox
- [ ] Clicked "Save"
- [ ] Created test job
- [ ] Checked response: status = "assigned"
- [ ] Checked response: autoAssigned = true
- [ ] ✅ Confirmed: Auto-Assignment now working!

---

## 🆘 If Still Not Working

1. **Check Backend Logs**
   ```bash
   # In terminal running backend:
   # Look for logs when creating job
   # Should see: "autoAssigned: true"
   # If see: "autoAssigned: false" or "Auto-Assign failed"
   # → Report to Backend Dev
   ```

2. **Check skip_approval Actually Saved**
   ```sql
   SELECT id, name, skip_approval, auto_assign_user_id
   FROM approval_flows
   WHERE is_active = true
   LIMIT 5;
   ```
   - Should show: `skip_approval = true` ✅

3. **Check Project Job Assignments Exist**
   ```sql
   SELECT id, project_id, job_type_id, assignee_id
   FROM project_job_assignments
   WHERE is_active = true
   LIMIT 5;
   ```
   - Should show at least 1 row ✅

---

## 📞 Support

If after these steps it's **still not working**:

1. ✅ Provide screenshot of Approval Flow settings (with skip_approval ✓)
2. ✅ Provide Backend Log when creating job
3. ✅ Provide Database query results (from above SQL)
4. ✅ Provide Network response (screenshot from DevTools)

---

**Time to fix:** ⏱️ 3 minutes
**Difficulty:** 🟢 Easy (just 1 checkbox!)
**Impact:** 🔴 High (unblocks entire auto-assignment feature)

**Last Updated:** 2026-02-04
