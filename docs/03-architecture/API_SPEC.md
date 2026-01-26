# 🔌 API Specification

## 1. Job Execution Endpoints

### 1.1 Start Job (Manual / Triggered)
- **Endpoint:** `POST /api/jobs/:id/start`
- **Description:** เริ่มนับเวลาทำงาน (`started_at`). ใช้เมื่อ User กดดูงานครั้งแรก หรือกดปุ่มเริ่มงาน.
- **Payload:** `{}`
- **Logic:**
  1. Check if job status is `assigned`.
  2. Update `status` = `in_progress`.
  3. Update `started_at` = `NOW()`.
  4. Create `activity_logs`: "Job started (Manual/View)".

### 1.2 Access Job (View Event)
- **Endpoint:** `POST /api/jobs/:id/view`
- **Description:** เรียกเมื่อ Assignee เปิดหน้า Job Detail.
- **Logic:**
  1. Check if user is the `assignee`.
  2. Check if job status is `assigned`.
  3. If yes -> Call **1.1 Start Job** immediately (Immediate Start Policy).

### 1.3 Complete Job
- **Endpoint:** `POST /api/jobs/:id/complete`
- **Description:** ส่งงานเมื่อทำเสร็จ
- **Payload:**
  ```json
  {
      "attachments": [
          { "name": "final_artwork.pdf", "url": "..." },
          { "name": "source_link", "url": "..." }
      ],
      "note": "ส่งงานครับ"
  }
  ```
- **Logic:**
  1. Update `status` = `completed` (or `review` based on workflow).
  2. Update `completed_at` = `NOW()`.
  3. Calculate `actual_hours` = `completed_at` - `started_at`.
  4. Save `design_job_items` status if needed.

---

## 2. Background Jobs (Scheduler)

### 2.1 Auto-Start Check (Cron Job)
- **Trigger:** Every 1 Hour
- **Logic (Pseudocode):**
  ```javascript
  // 1. Get Config
  const jobTypes = await DB.get('job_types'); 
  // Map: { 1: 4 hours, 2: 1 hour }
  
  // 2. Find Candidates
  const jobs = await DB.query(`
      SELECT j.id, j.job_type_id, j.assigned_at 
      FROM jobs j
      WHERE j.status = 'assigned' 
      AND j.started_at IS NULL
  `);
  
  // 3. Process
  for (const job of jobs) {
      const timeoutHours = jobTypes[job.job_type_id].auto_start_hours;
      const hoursPassed = (NOW() - job.assigned_at).hours;
      
      if (hoursPassed > timeoutHours) {
          // Force Start
          await api.startJob(job.id, { system_trigger: true });
          await Logger.log(`Auto-started Job ${job.id} due to timeout`);
      }
  }
  ```
