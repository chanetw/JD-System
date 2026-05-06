# Implementation Plan: Auto-Close Assignee Rejection + SLA Resume

**เป้าหมาย**: Auto-close งานใน `assignee_rejected` state หากเกิน 1 วันทำการ และ resume SLA เมื่อ approver กด deny  
**หลักการ**: ไม่แก้ Database schema - ใช้ activity logs + cron + due date calculation

---

## 📋 Overview

### สถานการณ์ปัจจุบัน
1. Designer ปฏิเสธงาน → Job status = `assignee_rejected`
2. Activity Log บันทึก `action: 'job_rejected_by_assignee'` + `createdAt` timestamp
3. Approver มี 2 ตัวเลือก:
   - **Confirm**: Approve การปฏิเสธ → job status = `rejected`
   - **Deny**: ไม่อนุมัติการปฏิเสธ → job status = `in_progress` (สิ่งที่ต้องเพิ่ม: extend dueDate)

### ปัญหาที่แก้
- ❌ ไม่มีเวลา deadline สำหรับ approver ที่ต้องตัดสินใจ → jobs อาจค้างเป็นอสูร
- ❌ เมื่อ deny นั้นไม่ extend dueDate → SLA ยังไม่คืน
- ❌ ไม่ notification deadline ให้ approver

### วิธีแก้ (ไม่แก้ DB)
1. **Cron check** ตรวจสอบ `assignee_rejected` jobs ตามชั่วโมง
2. **Timeline source**: `activity_logs.createdAt` เมื่อ action = 'job_rejected_by_assignee'
3. **Auto-close**: ถ้าเกิน 1 วันทำการ → update status = `rejected`
4. **SLA Resume**: ใน `denyAssigneeRejection()` → count working days between rejection & deny → extend dueDate

---

## 🔧 Files to Modify

### 1️⃣ `backend/api-server/src/services/jobAcceptanceService.js`
**สิ่งที่ต้องเพิ่ม**: Helper function สำหรับ count working days between 2 dates

#### Change 1.1: Add `countWorkingDaysBetween()` helper function
**Location**: After `addWorkingDaysWithTenantHolidays()` function (around line 100)  
**What**: Create utility to count working days between two dates (respecting weekends + holidays)  
**Why**: Needed by `denyAssigneeRejection()` to calculate how many days were paused

```javascript
/**
 * นับจำนวนวันทำการระหว่าง 2 วันที่ (ไม่รวม เวลส, ฮอลิเดย์)
 * @param {Date} startDate - วันเริ่มต้น
 * @param {Date} endDate - วันสิ้นสุด
 * @param {number} tenantId - tenant ID สำหรับ load holidays
 * @returns {Promise<number>} จำนวนวันทำการ
 */
async function countWorkingDaysBetween(startDate, endDate, tenantId) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start >= end) {
    return 0;
  }

  const holidaySet = await loadTenantHolidaySet(prisma, tenantId, start, 365);
  let workingDays = 0;
  const current = new Date(start);

  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(toDateKey(current));

    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
  }

  return workingDays;
}

export { countWorkingDaysBetween };
```

---

### 2️⃣ `backend/api-server/src/services/approvalService.js`

#### Change 2.1: Import new helper at top
**Location**: Line ~1 (with other imports)

```javascript
import { countWorkingDaysBetween } from './jobAcceptanceService.js';
```

#### Change 2.2: Update `denyAssigneeRejection()` to extend dueDate
**Location**: In `denyAssigneeRejection()` around line 1994 (before logging activity)  
**What**: Calculate working days between rejection and deny, extend dueDate  
**Why**: Resume SLA - if designer paused 5 working days, extend dueDate by 5 days

**Find this block** (around line 1980-1995):
```javascript
      // อัพเดทสถานะกลับเป็น in_progress และ set rejection denial flags
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'in_progress',
          rejectionDeniedAt: new Date(),
          rejectionDeniedBy: approverId,
          // Clear rejection fields
          rejectedBy: null,
          rejectionSource: null,
          rejectionComment: null
        }
      });
```

**Replace with**:
```javascript
      // หา timestamp ของการปฏิเสธจาก activity log
      const rejectionActivity = await this.prisma.activityLog.findFirst({
        where: {
          jobId,
          action: 'job_rejected_by_assignee'
        },
        orderBy: { createdAt: 'desc' }
      });

      let newDueDate = job.dueDate;

      // คำนวณจำนวนวันทำการที่ถูก pause และ extend dueDate
      if (rejectionActivity && job.dueDate) {
        const pausedDays = await countWorkingDaysBetween(
          rejectionActivity.createdAt,
          new Date(),
          job.tenantId
        );

        if (pausedDays > 0) {
          newDueDate = await addWorkingDaysWithTenantHolidays({
            db: this.prisma,
            tenantId: job.tenantId,
            startDate: job.dueDate,
            workingDays: pausedDays
          });
        }
      }

      // อัพเดทสถานะกลับเป็น in_progress พร้อม extend dueDate
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'in_progress',
          dueDate: newDueDate,
          rejectionDeniedAt: new Date(),
          rejectionDeniedBy: approverId,
          // Clear rejection fields
          rejectedBy: null,
          rejectionSource: null,
          rejectionComment: null
        }
      });
```

**Also add import** at top (near line 1):
```javascript
import { 
  addWorkingDaysWithTenantHolidays 
} from './jobAcceptanceService.js';
```

---

### 3️⃣ `backend/api-server/src/services/jobReminderCron.js`

#### Change 3.1: Add new cron method `checkAssigneeRejectionTimeout()`
**Location**: After `checkUpcomingSLA()` method (around line 250)  
**What**: Check jobs in `assignee_rejected` status, auto-close if deadline passed  
**Why**: Prevent jobs from staying rejected indefinitely

**Add this new method after `checkUpcomingSLA()`**:

```javascript
  /**
   * ตรวจสอบงานที่ assignee_rejected และ auto-close ถ้า deadline ผ่านไป
   * Deadline = 1 วันทำการตั้งแต่เวลาที่ปฏิเสธ
   */
  async checkAssigneeRejectionTimeout() {
    try {
      const prisma = getDatabase();
      const notificationService = new NotificationService(prisma);

      // ดึงงานทั้งหมดที่อยู่ใน assignee_rejected
      const rejectedJobs = await prisma.job.findMany({
        where: {
          status: 'assignee_rejected'
        },
        select: {
          id: true,
          djId: true,
          subject: true,
          tenantId: true,
          requesterId: true,
          assigneeId: true,
          requester: { select: { email: true, firstName: true, lastName: true } },
          assignee: { select: { email: true, firstName: true, lastName: true } }
        }
      });

      if (rejectedJobs.length === 0) {
        console.log('[JobReminder] No assignee_rejected jobs found');
        return;
      }

      console.log(`[JobReminder] Found ${rejectedJobs.length} assignee_rejected jobs to check`);

      // Helper: Import countWorkingDaysBetween
      const { countWorkingDaysBetween } = await import('./jobAcceptanceService.js');

      let autoClosedCount = 0;

      for (const job of rejectedJobs) {
        try {
          // หา timestamp ของการปฏิเสธจาก activity log
          const rejectionActivity = await prisma.activityLog.findFirst({
            where: {
              jobId: job.id,
              action: 'job_rejected_by_assignee'
            },
            orderBy: { createdAt: 'desc' }
          });

          if (!rejectionActivity) {
            console.warn(
              `[JobReminder] No rejection activity found for job ${job.djId}, skipping`
            );
            continue;
          }

          // นับวันทำการที่ผ่านไปแล้ว
          const workingDaysElapsed = await countWorkingDaysBetween(
            rejectionActivity.createdAt,
            new Date(),
            job.tenantId
          );

          // ถ้า >= 1 วันทำการ → auto-close
          if (workingDaysElapsed >= 1) {
            console.log(
              `[JobReminder] Auto-closing job ${job.djId} ` +
              `(${workingDaysElapsed} working days elapsed since rejection)`
            );

            // Update status to rejected
            await prisma.job.update({
              where: { id: job.id },
              data: {
                status: 'rejected'
              }
            });

            // Log activity
            await prisma.jobActivity.create({
              data: {
                tenantId: job.tenantId,
                jobId: job.id,
                userId: null, // System action
                activityType: 'auto_closed_rejection_timeout',
                description: `ระบบปิดงานอัตโนมัติ เพราะ approver ไม่ตัดสินใจ ` +
                  `ภายในวันทำการที่กำหนด (${workingDaysElapsed} วันทำการ)`,
                metadata: {
                  rejectionTimestamp: rejectionActivity.createdAt.toISOString(),
                  workingDaysElapsed,
                  autoClosedAt: new Date().toISOString()
                }
              }
            });

            // Notify requester
            if (job.requesterId) {
              await notificationService
                .createNotification({
                  tenantId: job.tenantId,
                  userId: job.requesterId,
                  type: 'rejection_auto_closed',
                  title: `❌ งาน ${job.djId} ปฏิเสธอัตโนมัติ`,
                  message: `งาน "${job.subject}" ถูกปฏิเสธอัตโนมัติ ` +
                    `เพราะผู้อนุมัติไม่ตัดสินใจภายในกำหนดเวลา`,
                  link: `/jobs/${job.id}`
                })
                .catch(err =>
                  console.warn('[RejectionTimeout] Notification failed:', err.message)
                );
            }

            autoClosedCount++;
          }
        } catch (jobError) {
          console.error(
            `[JobReminder] Error checking job ${job.djId}:`,
            jobError.message
          );
          // Continue to next job
        }
      }

      if (autoClosedCount > 0) {
        console.log(
          `[JobReminder] Auto-closed ${autoClosedCount} rejection timeouts`
        );
      }
    } catch (error) {
      console.error('[JobReminder] checkAssigneeRejectionTimeout error:', error);
    }
  }
```

#### Change 3.2: Call new method in cron interval
**Location**: In the `start()` method (around line 43-50)  
**What**: Add call to `checkAssigneeRejectionTimeout()` in the cron interval  
**Why**: Run check every 60 minutes together with other checks

**Find this block** (around line 43-50):
```javascript
    // Run immediately on start
    this.checkStaleJobs();
    this.checkUpcomingSLA();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkStaleJobs();
      this.checkUpcomingSLA();
    }, this.intervalMinutes * 60 * 1000);
```

**Replace with**:
```javascript
    // Run immediately on start
    this.checkStaleJobs();
    this.checkUpcomingSLA();
    this.checkAssigneeRejectionTimeout();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkStaleJobs();
      this.checkUpcomingSLA();
      this.checkAssigneeRejectionTimeout();
    }, this.intervalMinutes * 60 * 1000);
```

---

## 📝 Frontend Changes (Optional but Recommended)

### Update JobActionPanel.jsx to show deadline message
**Location**: `frontend/src/modules/features/job-management/components/JobActionPanel.jsx`

เพิ่ม message แจ้งแนว "Approver มี 1 วันทำการเพื่อตัดสินใจ" เมื่อ job status = `assignee_rejected`

```jsx
{job.status === 'assignee_rejected' && (
  <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
    <p className="text-sm text-amber-800">
      ⏰ <strong>กำหนด 1 วันทำการ:</strong> ผู้อนุมัติจะต้องตัดสินใจว่า approve 
      คำขอปฏิเสธนี้ หรือไม่ ภายในเวลา 1 วันทำการ 
      หากเกินกำหนดระบบจะปฏิเสธงานโดยอัตโนมัติ
    </p>
  </div>
)}
```

---

## ✅ Testing Checklist

### Test Case 1: Auto-close after 1 working day (no holidays)
```bash
# ขั้นตอน:
1. Create job with status=in_progress, assigneeId=designer@test.com
2. Call POST /api/approvals/reject-by-assignee
   → Job status changes to assignee_rejected
   → Activity log created with action='job_rejected_by_assignee', createdAt=now
3. Manually update activity_logs.createdAt to 2 days ago:
   UPDATE activity_logs SET created_at = NOW() - INTERVAL '2 days'
   WHERE job_id = [jobId] AND action = 'job_rejected_by_assignee';
4. Run cron or call checkAssigneeRejectionTimeout() manually
5. Verify: job.status should be 'rejected' now
6. Check notification to requester
```

### Test Case 2: Deny rejection and verify dueDate is extended
```bash
# ขั้นตอน:
1. Create job with dueDate=2026-05-09 (1 working day from now)
2. Reject it today (2026-05-06) → Activity log created
3. Update activity log createdAt to 2026-05-07 (1 working day passed)
4. Call POST /api/approvals/deny-rejection
5. Verify: job.dueDate should be extended by 1 working day → 2026-05-12
   (accounting for weekends/holidays if any)
6. Verify job.status = 'in_progress'
7. Verify activity log has action='assignee_rejection_denied'
```

### Test Case 3: Multiple holidays between rejection and deny
```bash
# ขั้นตอน:
1. Create holidays: 2026-05-07, 2026-05-08 in holidays table
2. Create job with dueDate=2026-05-09
3. Reject on 2026-05-06 
4. Deny on 2026-05-09 (but only 1 working day passed: 2026-05-06 counted)
5. dueDate should extend by 1 day → 2026-05-12
```

### Test Case 4: No timeout if denied before 1 working day
```bash
# ขั้นตอน:
1. Reject job at 2026-05-06 10:00 AM
2. Deny immediately on same day 2026-05-06 2:00 PM
3. Verify: job.status = 'in_progress' (no auto-close)
4. Verify: dueDate NOT extended (0 working days between)
```

---

## 🔄 Rollback Strategy

ถ้าต้องการ rollback ทั้งหมด:

1. **Disable cron check** temporarily:
   ```javascript
   // ใน jobReminderCron.js start() method
   // Comment out: this.checkAssigneeRejectionTimeout();
   ```

2. **Revert denyAssigneeRejection()** changes:
   ```javascript
   // ลบการ count working days + extend dueDate
   // Keep: status = in_progress, rejectionDeniedAt, rejectionDeniedBy
   ```

3. **ไม่ต้องลบ countWorkingDaysBetween()**: 
   - มีประโยชน์สำหรับ future features
   - ไม่มีผลกระทบต่อ production

---

## 📊 Summary of Changes

| File | Type | Lines | Complexity |
|------|------|-------|------------|
| jobAcceptanceService.js | Add function | ~30 | Low |
| approvalService.js | Update 1 method | ~40 | Medium |
| jobReminderCron.js | Add method + update interval | ~120 | Medium |
| JobActionPanel.jsx | Add UI message | ~10 | Low |

**Total New Code**: ~200 lines  
**Database Changes**: None ✅  
**Backward Compatible**: Yes ✅  
**Can disable safely**: Yes ✅  

---

## 🚀 Implementation Steps

1. ✅ Add `countWorkingDaysBetween()` in jobAcceptanceService.js
2. ✅ Import in approvalService.js
3. ✅ Update `denyAssigneeRejection()` with due date extension logic
4. ✅ Add `checkAssigneeRejectionTimeout()` in jobReminderCron.js
5. ✅ Update `start()` to call new cron method
6. ✅ (Optional) Update UI message in JobActionPanel.jsx
7. ✅ Test all 4 test cases
8. ✅ Deploy to production

---

## 📝 Notes

- **Activity Log as Timeline Source**: ไม่ต้องแก้ DB schema เพราะ `activityLog.createdAt` มีอยู่แล้ว
- **Working Day Calculation**: Reuse `loadTenantHolidaySet()` และ `addWorkingDaysWithTenantHolidays()` ที่มีอยู่
- **Timezone**: ใช้ server timezone ตลอด (no client-side time conversion)
- **Performance**: Cron runs every 60 minutes (optimize for background execution, not real-time)
- **Error Handling**: Log errors but continue (don't break cron for 1 job failure)

---

## 🎯 Success Criteria

- ✅ Jobs ใน `assignee_rejected` ปิดเองหากเกิน 1 วันทำการ
- ✅ Requester รับ notification เมื่อ auto-close
- ✅ dueDate extend ตามวันที่ pause เมื่อ deny
- ✅ ไม่มีการแก้ Database schema
- ✅ ทดสอบผ่านทุก test case
- ✅ Production ปลอดภัย (rollback ง่าย)
