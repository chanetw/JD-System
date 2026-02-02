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

### 1.4 Create Job (V2: Template-Based Approval Flow)
- **Endpoint:** `POST /api/jobs`
- **Description:** สร้างใบงานใหม่พร้อมตรวจสอบ Approval Flow V2 และ Auto-Assign
- **Authentication:** Required (`Bearer Token`)
- **Payload:**
  ```json
  {
      "projectId": 1,
      "jobTypeId": 2,
      "subject": "New Social Media Post",
      "priority": "normal",
      "dueDate": "2026-02-15T17:00:00Z",
      "objective": "สร้าง Content สำหรับ Campaign",
      "headline": "Valentine Campaign 2026",
      "subHeadline": "Sweet Moments",
      "description": "รายละเอียดเพิ่มเติม...",
      "assigneeId": null,
      "items": [
          {
              "name": "Facebook Post",
              "quantity": 3,
              "size": "1080x1080"
          }
      ]
  }
  ```
- **Response (Success):**
  ```json
  {
      "success": true,
      "data": {
          "id": 123,
          "djId": "DJ-2026-0123",
          "status": "pending_approval",
          "assigneeId": null,
          "flowInfo": {
              "templateName": "Single Level Approval",
              "isSkipped": false,
              "autoAssigned": false
          }
      }
  }
  ```
- **Logic (Pseudocode - Thai):**
  ```
  1. Security & Validation
     - ตรวจสอบ tenant_id ของ User กับ Project ว่าตรงกันหรือไม่
     - Validate Required Fields (projectId, jobTypeId, subject, dueDate)
     - ตรวจสอบว่า User มีสิทธิ์สร้างงานใน Project นี้หรือไม่

  2. Get Flow Assignment (V2)
     assignment = await approvalService.getFlowAssignmentV2(projectId, jobTypeId)
     // Priority: Specific (Project+JobType) > Default (Project+NULL)
     
  3. Check Skip Approval
     isSkip = approvalService.isSkipApprovalV2(assignment)
     // isSkip = true ถ้า assignment.template.totalLevels === 0
     
  4. Determine Initial Status
     IF isSkip = true THEN
       initialStatus = 'approved'
     ELSE
       initialStatus = 'pending_approval'
     END IF
     
  5. Create Job Record (Transaction Start)
     BEGIN TRANSACTION
       INSERT INTO jobs (
         tenant_id, project_id, job_type_id, 
         subject, status, priority, requester_id, 
         due_date, objective, headline, sub_headline, 
         description, created_at
       ) VALUES (...)
       RETURNING id, dj_id
       
  6. Auto-Assign Logic (If Skip Approval)
     IF isSkip = true AND assigneeId IS NULL THEN
       result = await approvalService.autoAssignJobV2(jobId, assignment, requesterId)
       
       IF result.success THEN
         UPDATE jobs 
         SET status = 'assigned', 
             assignee_id = result.assigneeId,
             started_at = NOW()
         WHERE id = jobId
       ELSE
         // Keep status = 'approved' (Manual Assign Required)
       END IF
     END IF
     
  7. Create Job Items (If Provided)
     FOR EACH item IN request.items DO
       INSERT INTO design_job_items (
         job_id, name, quantity, size, status
       ) VALUES (jobId, item.name, item.quantity, item.size, 'pending')
     END FOR
     
  8. Handle Urgent Priority (SLA Shift)
     IF priority = 'urgent' AND assigneeId IS NOT NULL THEN
       await jobService.shiftSLAIfUrgent(jobId, assigneeId, holidays)
     END IF
     
  COMMIT TRANSACTION
  
  9. Send Notifications
     IF status = 'pending_approval' THEN
       // แจ้ง Approver Level 1
       approver = await approvalService.getApproverForLevelV2(assignment, 1, requesterId)
       await notificationService.sendNotification({
         type: 'job_approval_request',
         userIds: [approver.id],
         jobId: jobId
       })
     ELSE IF status = 'assigned' THEN
       // แจ้ง Assignee
       await notificationService.sendNotification({
         type: 'job_assigned',
         userIds: [assigneeId],
         jobId: jobId
       })
     END IF
     
  10. Return Response
      RETURN {
        success: true,
        data: {
          id, djId, status, assigneeId,
          flowInfo: {
            templateName: assignment.template.name,
            isSkipped: isSkip,
            autoAssigned: (status === 'assigned')
          }
        }
      }
  ```
- **Error Codes:**
  - `400 BAD_REQUEST`: Missing required fields หรือ Invalid data
  - `403 FORBIDDEN`: User ไม่มีสิทธิ์สร้างงานใน Project นี้
  - `404 NOT_FOUND`: Project หรือ JobType ไม่พบ
  - `500 INTERNAL_ERROR`: Database error หรือ Transaction failed


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

---

## 3. User Management Endpoints

### 3.1 Get All Users (Paginated)
- **Endpoint:** `GET /api/users`
- **Query Params:**
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `search`: Search keyword (optional)
- **Response (Success):**
  ```json
  {
      "success": true,
      "data": {
          "data": [
              {
                  "id": 1,
                  "email": "admin@sena.co.th",
                  "firstName": "Admin",
                  "lastName": "System",
                  "department": { "name": "IT" },
                  "scope_assignments": [ ... ]
              }
          ],
          "pagination": {
              "page": 1,
              "limit": 20,
              "total": 50,
              "totalPages": 3
          }
      }
  }
  ```
