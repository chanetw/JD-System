/**
 * @file jobEvents.js
 * @description Socket.io Event Handlers สำหรับ Job-related Events
 * 
 * Handles:
 * - job:start
 * - job:complete
 * - test:create-job (for testing)
 * - test:assign-job (for testing)
 */

/**
 * @function setupJobEventHandlers
 * @description ตั้งค่า Event Handlers สำหรับ Job Events
 * 
 * @param {Object} socket - Socket.io socket instance
 * @param {Object} io - Socket.io server instance
 * @param {Object} userInfo - ข้อมูล User {userId, tenantId, role}
 * 
 * @returns {void}
 */
export const setupJobEventHandlers = (socket, io, userInfo) => {
  const { userId, tenantId, role } = userInfo;

  // ==========================================
  // Event: job:start
  // ==========================================
  /**
   * เมื่อผู้ใช้เริ่มต้นงาน (Start Job)
   * 
   * Expected payload:
   * {
   *   jobId: number,
   *   startTime: ISO string
   * }
   */
  socket.on('job:start', (data, callback) => {
    try {
      console.log('[Job Event] job:start received:', {
        jobId: data?.jobId,
        userId,
        socketId: socket.id
      });

      // =====================================
      // Validate Input
      // =====================================
      if (!data?.jobId) {
        if (callback) callback({ success: false, error: 'Missing jobId' });
        return;
      }

      // =====================================
      // TODO: Update Database
      // =====================================
      // const updatedJob = await jobService.startJob(data.jobId, userId);

      // =====================================
      // Broadcast Event to All Users
      // =====================================
      // ส่ง event ไปยังผู้ใช้ทั้งหมดที่เกี่ยวข้องกับงานนี้
      const broadcastRoom = `tenant_${tenantId}:job_${data.jobId}`;
      io.to(broadcastRoom).emit('job:started', {
        jobId: data.jobId,
        userId,
        startTime: new Date().toISOString(),
        status: 'in_progress'
      });

      // ==========================================
      // Send Acknowledgement
      // ==========================================
      if (callback) {
        callback({ success: true, message: 'Job started' });
      }
    } catch (err) {
      console.error('[Job Event] job:start error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // ==========================================
  // Event: job:complete
  // ==========================================
  /**
   * เมื่อผู้ใช้เสร็จสิ้นงาน (Complete Job)
   * 
   * Expected payload:
   * {
   *   jobId: number,
   *   completionTime: ISO string,
   *   note: string (optional)
   * }
   */
  socket.on('job:complete', (data, callback) => {
    try {
      console.log('[Job Event] job:complete received:', {
        jobId: data?.jobId,
        userId,
        socketId: socket.id
      });

      // =====================================
      // Validate Input
      // =====================================
      if (!data?.jobId) {
        if (callback) callback({ success: false, error: 'Missing jobId' });
        return;
      }

      // =====================================
      // TODO: Update Database
      // =====================================
      // const updatedJob = await jobService.completeJob(data.jobId, userId, data.note);

      // =====================================
      // Broadcast Event
      // =====================================
      const broadcastRoom = `tenant_${tenantId}:job_${data.jobId}`;
      io.to(broadcastRoom).emit('job:completed', {
        jobId: data.jobId,
        userId,
        completionTime: new Date().toISOString(),
        note: data.note || '',
        status: 'completed'
      });

      // ==========================================
      // Create Notification
      // ==========================================
      // TODO: Create notification for job requester
      const requesterRoom = `tenant_${tenantId}:user_REQUESTER_ID`;
      io.to(requesterRoom).emit('notification:new', {
        id: Math.random(),
        type: 'job_completed',
        priority: 'LOW',
        title: `DJ-XXXX Completed`,
        message: 'Your job has been completed',
        data: { jobId: data.jobId },
        createdAt: new Date().toISOString()
      });

      // ==========================================
      // Send Acknowledgement
      // ==========================================
      if (callback) {
        callback({ success: true, message: 'Job completed' });
      }
    } catch (err) {
      console.error('[Job Event] job:complete error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // ==========================================
  // TEST Event: test:create-job
  // ==========================================
  /**
   * สำหรับเทส - สร้างงาน mock ใหม่
   * 
   * Expected payload:
   * {
   *   projectId: number,
   *   jobTypeId: number,
   *   subject: string
   * }
   */
  socket.on('test:create-job', (data, callback) => {
    try {
      console.log('[Test Event] test:create-job:', data);

      const mockJob = {
        id: Math.floor(Math.random() * 10000),
        djId: `DJ-2026-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        projectId: data?.projectId || 1,
        subject: data?.subject || 'Test Job',
        priority: 'normal',
        status: 'todo',
        assigneeId: userId,
        createdAt: new Date().toISOString()
      };

      // Broadcast to all users in tenant
      io.to(`tenant_${tenantId}`).emit('job:assigned', mockJob);

      if (callback) callback({ success: true, job: mockJob });
    } catch (err) {
      console.error('[Test Event] test:create-job error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // ==========================================
  // TEST Event: test:assign-job
  // ==========================================
  /**
   * สำหรับเทส - มอบหมายงานให้ user
   * 
   * Expected payload:
   * {
   *   jobId: number,
   *   assigneeId: number
   * }
   */
  socket.on('test:assign-job', (data, callback) => {
    try {
      console.log('[Test Event] test:assign-job:', data);

      if (!data?.jobId || !data?.assigneeId) {
        if (callback) callback({ success: false, error: 'Missing jobId or assigneeId' });
        return;
      }

      const assigneeRoom = `tenant_${tenantId}:user_${data.assigneeId}`;

      // ส่ง notification ไปยัง assignee
      io.to(assigneeRoom).emit('notification:new', {
        id: Math.random(),
        type: 'job_assigned',
        priority: 'HIGH',
        title: `Job Assigned - DJ-2026-0001`,
        message: 'New job has been assigned to you',
        data: { jobId: data.jobId },
        createdAt: new Date().toISOString()
      });

      // ส่ง job:assigned event
      io.to(assigneeRoom).emit('job:assigned', {
        jobId: data.jobId,
        assigneeId: data.assigneeId,
        status: 'assigned'
      });

      if (callback) callback({ success: true, message: 'Job assigned' });
    } catch (err) {
      console.error('[Test Event] test:assign-job error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // ==========================================
  // Event: error handling
  // ==========================================
  socket.on('error', (error) => {
    console.error('[Job Events] Socket error:', error);
  });
};

export default setupJobEventHandlers;
