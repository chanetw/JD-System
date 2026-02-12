
import { supabase } from '../supabaseClient';
import { handleResponse } from '../utils';
import { notificationService } from './notificationService';
import httpClient from '../httpClient';

export const jobService = {
    // --- Jobs CRUD ---

    getJobs: async (filters = {}) => {
        try {
            // ✓ NEW: Use Backend REST API with RLS context
            const params = {};
            if (filters.status && filters.status !== 'All') {
                params.status = filters.status.toLowerCase();
            }

            const response = await httpClient.get('/jobs', { params });

            if (!response.data.success) {
                console.warn('[jobService] Get jobs failed:', response.data.message);
                return [];
            }

            const jobs = response.data.data || [];

            // Normalize data for UI
            const normalizedJobs = jobs.map(job => ({
                ...job,
                // Ensure fields exist for UI Logic
                isParent: job.isParent || job.is_parent || false,
                parentJobId: job.parentJobId || job.parent_job_id || null,
                children: job.children || [] // If backend populates children
            }));

            console.log(`[jobService] getJobs: Fetched ${normalizedJobs.length} jobs`);
            return normalizedJobs;

        } catch (error) {
            console.error('[jobService] getJobs error:', error);
            return [];
        }
    },

    getJobsByRole: async (user) => {
        try {
            // ✓ NEW: Use Backend REST API with RLS context
            // Handle V1 (roles array) and V2 (role object or roleName string)

            // Guard against null/undefined user
            if (!user) {
                console.warn('[getJobsByRole] User is null or undefined, returning empty jobs list');
                return [];
            }

            let role = 'requester';

            if (typeof user.role === 'string') {
                role = user.role;
            } else if (user.role && user.role.name) {
                role = user.role.name;
            } else if (user.roleName) {
                role = user.roleName;
            } else if (user.roles && user.roles.length > 0) {
                role = user.roles[0]?.name || user.roles[0]?.roleName || user.roles[0];
            }

            const userId = user.id;

            console.log(`[getJobsByRole] Filtering for Role: ${role}, UserID: ${userId}`);

            const response = await httpClient.get('/jobs', {
                params: { role: role.toLowerCase() }
            });

            if (!response.data.success) {
                console.warn('[jobService] Get jobs by role failed:', response.data.message);
                return [];
            }

            const jobs = response.data.data || [];
            console.log(`[jobService] getJobsByRole: Fetched ${jobs.length} jobs (Role: ${role})`);
            return jobs;

        } catch (error) {
            console.error('[jobService] getJobsByRole error:', error);
            return [];
        }
    },


    /**
     * ดึงงานของผู้รับผิดชอบ (Assignee) แบ่งตามกลุ่มสถานะ
     * @param {number} userId - ID ของผู้ใช้งาน
     * @param {string} filterStatus - กลุ่มสถานะ ('todo', 'in_progress', 'waiting', 'done')
     */
    getAssigneeJobs: async (userId, filterStatus = 'all') => {
        try {
            // Base query: ดึงงานที่ assignee_id ตรงกับ user
            let query = supabase
                .from('jobs')
                .select(`
                    *,
                    project:projects(name, code),
                    job_type:job_types(name, icon, color_theme, sla_days),
                    requester:users!jobs_requester_id_fkey(first_name, last_name, display_name, avatar_url)
                `)
                .eq('assignee_id', userId);

            // Filter ตามกลุ่มสถานะ
            switch (filterStatus) {
                case 'todo':
                    query = query.in('status', ['assigned']); // งานใหม่ที่ยังไม่เริ่ม
                    break;
                case 'in_progress':
                    query = query.eq('status', 'in_progress'); // กำลังทำ
                    break;
                case 'waiting':
                    query = query.in('status', ['correction', 'pending_approval']); // รอคนอื่น
                    break;
                case 'done':
                    query = query.in('status', ['completed', 'closed']); // เสร็จแล้ว
                    break;
            }

            // Order by due_date (urgent first)
            query = query.order('due_date', { ascending: true });

            const { data, error } = await query;
            if (error) {
                console.warn('getAssigneeJobs error:', error.message);
                return [];
            }
            console.log(`[jobService] getAssigneeJobs: Fetched ${data?.length || 0} jobs (Filter: ${filterStatus})`);
            // คำนวณ Health Status สำหรับแต่ละงาน
            return data.map(job => {
                const now = new Date();
                const dueDate = new Date(job.due_date);
                const hoursRemaining = (dueDate - now) / (1000 * 60 * 60);

                let healthStatus = 'normal';

                if (filterStatus === 'done') {
                    healthStatus = 'normal'; // งานเสร็จแล้วไม่ต้องสน SLA
                } else if (hoursRemaining < 0) {
                    healthStatus = 'critical'; // เลยกำหนด (Overdue)
                } else if (hoursRemaining < 4) {
                    healthStatus = 'critical'; // เหลือเวลาน้อยกว่า 4 ชม.
                } else if (hoursRemaining <= 48) {
                    healthStatus = 'warning'; // เหลือเวลา 2 วัน
                }

                return {
                    id: job.id,
                    djId: job.dj_id,
                    subject: job.subject,
                    status: job.status,
                    priority: job.priority,
                    deadline: job.due_date,
                    projectCode: job.project?.code,
                    projectName: job.project?.name,
                    jobTypeName: job.job_type?.name,
                    requesterName: job.requester?.display_name || 'Unknown',
                    requesterAvatar: job.requester?.avatar_url,
                    healthStatus: healthStatus,
                    hoursRemaining: Math.round(hoursRemaining * 10) / 10
                };
            });

        } catch (error) {
            console.error('Error fetching assignee jobs:', error);
            // Fallback to empty array if error
            return [];
        }
    },

    /**
     * ดึงรายละเอียดงานเดี่ยวผ่าน Backend API (V2)
     * @param {number} id - รหัสงาน
     */
    getJobById: async (id) => {
        try {
            console.log(`[jobService] getJobById: ${id}`);
            const response = await httpClient.get(`/jobs/${id}`);

            if (!response.data.success) {
                console.error('[jobService] getJobById failed:', response.data.message);
                return null;
            }

            const data = response.data.data;

            // Map Backend V2 data to Frontend component expectation
            return {
                ...data,
                // Ensure field names match what JobDetail.jsx expects
                brief: {
                    objective: data.objective,
                    headline: data.headline,
                    subHeadline: data.subHeadline,
                    sellingPoints: data.sellingPoints || []
                },
                // Flatten relation names for InfoRow
                project: data.project, // Backend already returns name as 'project'
                jobType: data.jobType, // Backend already returns name as 'jobType'
                slaWorkingDays: data.slaWorkingDays,
                assigneeName: data.assignee?.name || null,
                requesterName: data.requester?.name || null,
                // Support both snake_case and camelCase for legacy compatibility
                dj_id: data.djId,
                due_date: data.deadline,
                requester_id: data.requesterId,
                assignee_id: data.assigneeId,
                project_id: data.projectId,
                job_type_id: data.jobTypeId
            };

        } catch (error) {
            console.error('[jobService] getJobById error:', error);
            return null;
        }
    },

    /**
     * สร้างงานใหม่ผ่าน Backend API (V2)
     * 
     * ใช้ Approval Flow V2 Logic:
     * - Skip Approval: ถ้า Template กำหนด totalLevels = 0
     * - Auto-Assign: มอบหมายงานอัตโนมัติตาม Template Config
     * 
     * @param {Object} jobData - ข้อมูลงาน
     * @param {number} jobData.projectId - รหัสโครงการ
     * @param {number|null} jobData.jobTypeId - รหัสประเภทงาน (สำหรับ Single Job)
     * @param {Array|null} jobData.jobTypes - รายการประเภทงาน (สำหรับ Parent-Child)
     * @param {string} jobData.subject - หัวข้องาน
     * @param {string} jobData.priority - ความสำคัญ (low, normal, urgent)
     * @param {Object} jobData.brief - รายละเอียด Brief
     * @param {string} jobData.deadline - วันกำหนดส่ง
     * 
     * @returns {Object} - { success: true, job: { id, djId, status, flowInfo } }
     */
    createJob: async (jobData) => {
        // ============================================
        // ถ้ามี jobTypes array -> สร้างแบบ Parent-Child (Legacy)
        // TODO: ย้าย Parent-Child Logic ไป Backend ในอนาคต
        // ============================================
        if (jobData.jobTypes && Array.isArray(jobData.jobTypes) && jobData.jobTypes.length > 0) {
            return await jobService.createParentWithChildren(jobData);
        }

        try {
            // ============================================
            // V2: เรียก Backend API แทน Supabase โดยตรง
            // Backend จะจัดการ:
            // - Flow Assignment Resolution
            // - Skip Approval Logic
            // - Auto-Assign Logic
            // - DJ ID Generation
            // - Activity Logging
            // ============================================
            const response = await httpClient.post('/jobs', {
                projectId: parseInt(jobData.projectId),
                jobTypeId: parseInt(jobData.jobTypeId),
                subject: jobData.subject,
                priority: jobData.priority?.toLowerCase() || 'normal',
                dueDate: jobData.deadline,
                objective: jobData.brief?.objective || null,
                headline: jobData.brief?.headline || null,
                subHeadline: jobData.brief?.subHeadline || null,
                description: jobData.brief?.description || null,
                assigneeId: jobData.assigneeId || null,
                items: jobData.items || []
            });

            // ตรวจสอบ Response
            if (!response.data.success) {
                console.error('[jobService] Create job failed:', response.data.message);
                throw new Error(response.data.message || 'Create job failed');
            }

            const jobResult = response.data.data;
            console.log(`[jobService] Job created: ${jobResult.djId}, status: ${jobResult.status}, skip: ${jobResult.flowInfo?.isSkipped}`);

            // ============================================
            // Legacy: ถ้าเป็นงานด่วน และ Backend ยังไม่ได้ Assign
            // ให้เรียก SLA Shift จาก Frontend (จะย้ายไป Backend ในอนาคต)
            // ============================================
            if (jobData.priority?.toLowerCase() === 'urgent' && jobResult.assigneeId) {
                try {
                    const { adminService } = await import('./adminService');
                    const holidays = await adminService.getHolidayDates();
                    await jobService.shiftSLAIfUrgent(jobResult.id, jobResult.assigneeId, holidays);
                } catch (slaError) {
                    console.warn('[jobService] SLA Shift failed (non-critical):', slaError.message);
                }
            }

            // ============================================
            // Legacy: Send Notification (Frontend)
            // TODO: ย้าย Notification ไป Backend ในอนาคต
            // ============================================
            try {
                const eventType = jobData.priority?.toLowerCase() === 'urgent' ? 'urgent_impact' : 'job_created';
                await notificationService.sendNotification(eventType, jobResult.id);
            } catch (notifError) {
                console.warn('[jobService] Notification failed (non-critical):', notifError.message);
            }

            return {
                success: true,
                job: {
                    id: jobResult.id,
                    djId: jobResult.djId,
                    status: jobResult.status,
                    assigneeId: jobResult.assigneeId,
                    flowInfo: jobResult.flowInfo
                }
            };

        } catch (error) {
            console.error('[jobService] createJob error:', error);

            // แปลง Error Response จาก Backend
            const errorMessage = error.response?.data?.message || error.message || 'ไม่สามารถสร้างงานได้';
            throw new Error(errorMessage);
        }
    },

    /**
     * สร้าง Parent Job พร้อม Child Jobs
     *
     * ✅ V2: ใช้ Backend API แทน Supabase โดยตรง
     * - Security: Bypass RLS restrictions (ใช้ Service Role)
     * - Atomicity: All-or-nothing (Transaction)
     * - Data Integrity: ไม่มี orphan jobs
     *
     * @param {Object} jobData - ข้อมูลงาน
     * @param {number} jobData.projectId - รหัสโครงการ
     * @param {string} jobData.subject - หัวข้องาน
     * @param {string} jobData.priority - ความเร่งด่วน
     * @param {Object} jobData.brief - รายละเอียด Brief
     * @param {Array} jobData.jobTypes - รายการประเภทงาน [{ jobTypeId, assigneeId? }]
     * @param {string} jobData.deadline - วันกำหนดส่ง
     *
     * @returns {Object} - { success: true, job: { id, djId }, children: [...] }
     */
    createParentWithChildren: async (jobData) => {
        // New Backend V2 Implementation (Atomic Transaction)
        console.log('[Parent-Child] Creating via Backend API:', jobData.jobTypes.length, 'children');

        try {
            const response = await httpClient.post('/jobs/parent-child', {
                projectId: jobData.projectId,
                subject: jobData.subject,
                priority: jobData.priority,
                deadline: jobData.deadline || new Date().toISOString(),
                brief: jobData.brief,
                jobTypes: jobData.jobTypes // [{ jobTypeId, assigneeId }]
            });

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to create parent-child jobs');
            }

            // Map backend response { data: { parent, children } } to frontend expectation
            const { parent, children } = response.data.data;

            console.log('[Parent-Child] ✅ Complete:', parent.djId, 'children:', children.length);

            return {
                success: true,
                job: { id: parent.id, djId: parent.djId },
                children: children.map(c => ({ id: c.id, djId: c.djId }))
            };

        } catch (error) {
            console.error('[jobService] createParentWithChildren error:', error);

            // Enhance error message for UI
            const msg = error.response?.data?.message || error.message || 'Error running parent-child transaction';
            throw new Error(msg);
        }
    },

    /**
     * อนุมัติงาน (Approve Job) - รองรับ Multi-level Approval
     * 
     * Logic:
     * 1. ดึงข้อมูล Approval Flow ของ Project นี้
     * 2. ตรวจสอบว่าตอนนี้อยู่ที่ Level ไหน (จาก status)
     * 3. ถ้ามี Level ถัดไป -> Update status เป็น pending_level_X
     * 4. ถ้าไม่มี (จบ Flow) -> Update status เป็น approved (หรือ in_progress)
     */
    approveJob: async (jobId, approverId, comment) => {
        try {
            // 1. Call Backend API
            const response = await httpClient.post(`/jobs/${jobId}/approve`, { comment });
            if (!response.data.success) throw new Error(response.data.message);

            const { status, isFinal, assignResult } = response.data.data;

            // Backend now handles auto-assign logic if isFinal is true.
            // assignResult contains details of auto-assign (success, needsManualAssign, etc.)

            if (isFinal && assignResult) {
                if (assignResult.success) {
                    return { success: true, nextStatus: 'assigned', isFinal: true, autoAssigned: true, assigneeId: assignResult.assigneeId };
                } else if (assignResult.needsManualAssign) {
                    return { success: true, nextStatus: 'approved', isFinal: true, needsManualAssign: true };
                }
            }

            return { success: true, nextStatus: status, isFinal };
        } catch (error) {
            console.error('[jobService] approveJob error:', error);
            throw error;
        }
    },

    rejectJob: async (jobId, approverId, comment) => {
        try {
            const response = await httpClient.post(`/jobs/${jobId}/reject`, { comment });
            if (!response.data.success) throw new Error(response.data.message);
            return response.data;
        } catch (error) {
            console.error('[jobService] rejectJob error:', error);
            throw error;
        }
    },

    reassignJob: async (jobId, newAssigneeId, reason, userId) => {
        console.log(`[Reassign] Job ${jobId} -> New Assignee ${newAssigneeId} by User ${userId}`);

        // 1. Update Assignee
        const { error } = await supabase.from('jobs')
            .update({ assignee_id: newAssigneeId })
            .eq('id', jobId);

        if (error) throw error;

        // 2. Fetch New Assignee Info (ข้อมูลเต็ม)
        const { data: userData } = await supabase.from('users')
            .select('id, display_name, first_name, last_name, avatar_url, email')
            .eq('id', newAssigneeId)
            .single();

        const assigneeName = userData?.display_name || 'Unknown';

        // 3. Log Activity
        await supabase.from('activity_logs').insert([{
            job_id: jobId,
            user_id: userId,
            action: 'reassigned',
            message: `Reassigned to ${assigneeName}. Note: ${reason || '-'}`
        }]);

        // 4. Send Notification (Optional: Notify new assignee)
        await notificationService.sendNotification('job_assigned', jobId);

        // 🔥 NEW: Return ข้อมูล Assignee ใหม่
        return {
            success: true,
            assignee: {
                id: userData.id,
                name: assigneeName,
                email: userData.email,
                avatar: userData.avatar_url
            }
        };
    },


    finishJob: async (jobId, finalFiles, notes, userId) => {
        // 1. Upload files (Mock data structure for files)
        const filesData = finalFiles.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type,
        }));

        // 2. Update job
        const { data, error } = await supabase
            .from('jobs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                completed_by: userId,
                final_files: filesData
            })
            .eq('id', jobId)
            .select()
            .single();

        if (error) throw error;

        // 3. Add to job history
        await supabase.from('job_history').insert({
            job_id: jobId,
            action: 'completed',
            user_id: userId,
            details: notes ? { notes } : null
        });

        // 4. Send notifications
        await notificationService.sendNotification('job_completed', jobId, { notes });

        return data;
    },

    // Alias for consistency with Mock API
    completeJob: async (jobId, data) => {
        // Data: { attachments, note, userId }
        // Default userId from params or Auth context (ideally passed)
        // For now assume logic handles it or we parse it
        const note = data?.note || '';
        const files = data?.attachments || [];
        const userId = data?.userId; // Caller must ensure userId is passed or we get it from auth

        return await jobService.finishJob(jobId, files, note, userId);
    },

    // --- Dashboard Stats ---

    getDashboardStats: async () => {
        try {
            const { data: jobs, error } = await supabase
                .from('jobs')
                .select('id, status, due_date, created_at');

            if (error) {
                console.error('getDashboardStats error:', error.message);
                return jobService.calculateStats([]);
            }

            // Map due_date to deadline for calculation compatibility
            const mappedJobs = jobs.map(j => ({ ...j, deadline: j.due_date }));
            return jobService.calculateStats(mappedJobs);
        } catch (err) {
            console.error('getDashboardStats error:', err);
            return { newToday: 0, dueToday: 0, overdue: 0, totalJobs: 0, pending: 0 };
        }
    },

    calculateStats: (jobs) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newToday = 0;
        let dueToday = 0;
        let overdue = 0;

        (jobs || []).forEach(job => {
            if (job.created_at) {
                const createdAt = new Date(job.created_at);
                createdAt.setHours(0, 0, 0, 0);
                if (createdAt.getTime() === today.getTime()) newToday++;
            }

            if (job.deadline) {
                const dueDate = new Date(job.deadline);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate.getTime() === today.getTime()) dueToday++;
                if (dueDate.getTime() < today.getTime() && job.status !== 'completed' && job.status !== 'closed') {
                    overdue++;
                }
            }
        });

        return {
            newToday,
            dueToday,
            overdue,
            totalJobs: jobs?.length || 0,
            pending: (jobs || []).filter(j => j.status === 'pending_approval').length,
        };
    },

    // --- Urgent Job Logic ---

    /**
     * ฟังก์ชันเลื่อนวันกำหนดส่งของงานอื่นๆ เมื่อมีงานด่วนเข้ามา
     * 
     * วัตถุประสงค์:
     * เมื่อมีงาน Priority: Urgent สร้างขึ้น งานอื่นทั้งหมดในมือของ Graphic คนเดียวกัน
     * จะถูกเลื่อนวันกำหนดส่งออกไปอีก 2 วันทำการ (ข้ามวันหยุด) เพื่อให้มีเวลาทำงานด่วน
     * 
     * @param {number} urgentJobId - ID ของงานด่วนที่เพิ่งสร้าง
     * @param {number} assigneeId - ID ของ Graphic ที่ได้รับมอบหมายงานด่วนนี้
     * @param {Array} holidays - รายการวันหยุดราชการ (สำหรับคำนวณวันทำการ)
     * 
     * หลักการทำงาน:
     * 1. ค้นหางานทั้งหมดในมือ Graphic คนนี้ที่ยังไม่เสร็จ (ยกเว้นงานด่วนที่เพิ่งสร้าง)
     * 2. Loop เลื่อน due_date ของแต่ละงานออกไป +2 วันทำการ (ไม่นับวันหยุด)
     * 3. บันทึก original_due_date และ shifted_by_job_id ลง Database
     * 4. เพิ่ม Log ลงตาราง sla_shift_logs เพื่อติดตามประวัติ
     * 5. ส่ง Notification ไปหาเจ้าของงานที่ได้รับผลกระทบ
     * 
     * @returns {Promise<void>}
     */
    shiftSLAIfUrgent: async (urgentJobId, assigneeId, holidays = []) => {
        console.log(`[Urgent Logic] Calculating SLA shift for Assignee ID: ${assigneeId} caused by Job ID: ${urgentJobId}`);

        try {
            // 1. หา Job ทั้งหมดของ Assignee คนนี้ที่ยังไม่เสร็จ (active jobs)
            const { data: activeJobs, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('assignee_id', assigneeId)
                .neq('id', urgentJobId) // ไม่รวมงานใหม่
                .in('status', ['pending_approval', 'approved', 'in_progress', 'correction']);

            if (error) {
                console.error('[Urgent Logic] Error fetching active jobs:', error);
                return;
            }

            if (!activeJobs || activeJobs.length === 0) {
                console.log('[Urgent Logic] No other active jobs to shift.');
                return;
            }

            console.log(`[Urgent Logic] Found ${activeJobs.length} active jobs to shift +2 working days.`);

            // 2. Import addWorkDays function เพื่อคำนวณวันทำการ
            const { addWorkDays } = await import('../../utils/slaCalculator');

            // 3. Loop update each job
            for (const job of activeJobs) {
                const currentDueDate = new Date(job.due_date);

                // คำนวณวันทำการ ข้ามวันหยุด
                const newDueDate = addWorkDays(currentDueDate, 2, holidays);

                console.log(` >> Shifting Job ${job.id} (${job.subject}): ${job.due_date} -> ${newDueDate.toISOString()}`);

                // Update Database จริง
                await supabase.from('jobs').update({
                    due_date: newDueDate.toISOString(),
                    original_due_date: job.original_due_date || job.due_date,
                    shifted_by_job_id: urgentJobId
                }).eq('id', job.id);

                // บันทึก Log
                await supabase.from('sla_shift_logs').insert({
                    job_id: job.id,
                    urgent_job_id: urgentJobId,
                    original_due_date: job.original_due_date || job.due_date,
                    new_due_date: newDueDate.toISOString(),
                    shift_days: 2
                });

                // ส่ง Notification ไปหาเจ้าของงาน
                await notificationService.sendNotification('deadline_approaching', job.id, {
                    shiftDays: 2,
                    reasonJobId: urgentJobId,
                    reason: 'ถูกเลื่อนเนื่องจากมีงานด่วนเข้ามา'
                });
            }

            console.log(`[Urgent Logic] ✅ Successfully shifted ${activeJobs.length} jobs.`);

        } catch (err) {
            console.error('[Urgent Logic] Exception:', err);
        }
    },


    /**
     * เริ่มงาน (Start Job)
     * @param {string} jobId - รหัสงาน
     * @param {string} triggerType - 'manual' | 'view' | 'auto'
     */
    startJob: async (jobId, triggerType = 'manual') => {
        try {
            console.log(`[jobService] startJob: ${jobId}, trigger: ${triggerType}`);

            // Real Supabase Implementation
            // 1. Get current status to validate
            const { data: job, error: fetchErr } = await supabase
                .from('jobs')
                .select('status')
                .eq('id', jobId)
                .single();

            if (fetchErr || !job) throw new Error('Job not found');
            if (job.status !== 'assigned') return { message: 'Job already started or not ready' };

            // 2. Update status and log
            const { data, error } = await supabase
                .from('jobs')
                .update({
                    status: 'in_progress',
                    started_at: new Date().toISOString()
                })
                .eq('id', jobId)
                .select()
                .single();

            if (error) throw error;

            // 3. Log Activity
            await supabase.from('activity_logs').insert([{
                job_id: jobId,
                action: 'started',
                message: `Job started (${triggerType})`
            }]);

            return data;
        } catch (err) {
            console.error('[jobService] startJob error:', err);
            throw err;
        }
    },

    /**
     * ส่งงาน (Complete Job)
     * @param {string} jobId - รหัสงาน
     * @param {Object} data - { attachments, note }
     */
    completeJob: async (jobId, payload) => {
        try {
            // Call Backend API
            const response = await httpClient.post(`/jobs/${jobId}/complete`, payload);
            if (!response.data.success) throw new Error(response.data.message);
            return response.data;
        } catch (err) {
            console.error('[jobService] completeJob error:', err);
            throw err;
        }
    },

    /**
     * ล้างข้อมูล Demo (ลบงานที่สร้างขึ้นใหม่ทั้งหมด ยกเว้น Seed Data)
     * Seed Data จะมี DJ ID ขึ้นต้นด้วย 'TEST-' (ตามที่กำหนดใน migration 010)
     */
    resetDemoData: async () => {
        console.log('[Demo] Resetting data...');
        try {
            // ลบงานที่ไม่ได้ขึ้นต้นด้วย TEST-
            // Note: Supabase doesn't support NOT LIKE easily in JS client for delete
            // So we fetch IDs first then delete. Safety check.

            const { data: jobsToDelete, error: fetchErr } = await supabase
                .from('jobs')
                .select('id, dj_id')
                .not('dj_id', 'like', 'TEST-%');

            if (fetchErr) throw fetchErr;

            if (jobsToDelete.length > 0) {
                const ids = jobsToDelete.map(j => j.id);
                const { error: delErr } = await supabase
                    .from('jobs')
                    .delete()
                    .in('id', ids);

                if (delErr) throw delErr;
            }

            console.log(`[Demo] Reset completed. Deleted ${jobsToDelete.length} jobs.`);
            return { success: true, count: jobsToDelete.length };
        } catch (error) {
            console.error('[Demo] Reset failed:', error);
            throw error;
        }
    },


    /**
     * จำลองการทำงานของ Background Job (Auto-Start)
     * Note: Requires Edge Functions for production implementation
     */
    checkAutoJobStart: async () => {
        return { message: 'Not implemented yet (Requires Edge Functions)' };
    },

    /**
     * Auto-assign job after all approvals completed
     * Logic: Team Lead → Department Manager → Needs Manual Assignment
     * 
     * @param {number} jobId - Job ID to assign
     * @returns {Promise<Object>} - Result with success status and assignee info
     */


    /**
     * Manual assign job (called by Department Manager or Admin)
     * 
     * @param {number} jobId - Job ID to assign
     * @param {number} assigneeId - User ID to assign to
     * @param {number|null} assignedBy - User ID who performed the assignment
     * @param {string} source - Source of assignment ('manual', 'auto-assign: team-lead', etc.)
     * @returns {Promise<Object>} - Result with success status
     */
    assignJobManually: async (jobId, assigneeId, assignedBy = null, source = 'manual') => {
        try {
            // Update job with assignee
            const { data: updatedJob, error: updateErr } = await supabase
                .from('jobs')
                .update({
                    assignee_id: assigneeId,
                    assigned_at: new Date().toISOString(),
                    status: 'assigned'
                })
                .eq('id', jobId)
                .select()
                .single();

            if (updateErr) throw updateErr;

            // Log activity
            await supabase.from('job_activities').insert({
                job_id: jobId,
                user_id: assignedBy,
                activity_type: 'assigned',
                description: `Job assigned to user ${assigneeId}`,
                metadata: { source, timestamp: new Date().toISOString() }
            });

            console.log('[Assign] Job assigned successfully:', { jobId, assigneeId, source });

            // Send notification to assignee
            try {
                await notificationService.createNotification({
                    userId: assigneeId,
                    jobId: jobId,
                    type: 'job_assigned',
                    message: `You have been assigned to job ${updatedJob.dj_id}`,
                    metadata: { source }
                });
            } catch (notifErr) {
                console.warn('[Assign] Failed to send notification:', notifErr);
            }

            return { success: true, data: updatedJob };
        } catch (error) {
            console.error('[Assign] Failed:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // Job Comments API
    // ============================================

    /**
     * Get comments for a job
     * @param {number} jobId - Job ID
     * @param {object} options - Pagination options { page, limit }
     * @returns {Promise<object>} - { success, data, pagination }
     */
    getJobComments: async (jobId, options = {}) => {
        try {
            const { page = 1, limit = 50 } = options;
            const response = await httpClient.get(`/jobs/${jobId}/comments`, {
                params: { page, limit }
            });

            if (!response.data.success) {
                console.warn('[jobService] Get comments failed:', response.data.message);
                return { success: false, data: [], error: response.data.message };
            }

            return {
                success: true,
                data: response.data.data || [],
                pagination: response.data.pagination
            };
        } catch (error) {
            console.error('[jobService] getJobComments error:', error);
            return { success: false, data: [], error: error.message };
        }
    },

    /**
     * Add a comment to a job
     * @param {number} jobId - Job ID
     * @param {string} comment - Comment text (supports @mentions)
     * @returns {Promise<object>} - { success, data, meta }
     */
    addJobComment: async (jobId, comment) => {
        try {
            const response = await httpClient.post(`/jobs/${jobId}/comments`, {
                comment
            });

            if (!response.data.success) {
                console.warn('[jobService] Add comment failed:', response.data.message);
                return { success: false, error: response.data.message };
            }

            return {
                success: true,
                data: response.data.data,
                meta: response.data.meta
            };
        } catch (error) {
            console.error('[jobService] addJobComment error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update a comment
     * @param {number} jobId - Job ID
     * @param {number} commentId - Comment ID
     * @param {string} comment - Updated comment text
     * @returns {Promise<object>} - { success, data }
     */
    updateJobComment: async (jobId, commentId, comment) => {
        try {
            const response = await httpClient.put(`/jobs/${jobId}/comments/${commentId}`, {
                comment
            });

            if (!response.data.success) {
                console.warn('[jobService] Update comment failed:', response.data.message);
                return { success: false, error: response.data.message };
            }

            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('[jobService] updateJobComment error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete a comment
     * @param {number} jobId - Job ID
     * @param {number} commentId - Comment ID
     * @returns {Promise<object>} - { success, message }
     */
    deleteJobComment: async (jobId, commentId) => {
        try {
            const response = await httpClient.delete(`/jobs/${jobId}/comments/${commentId}`);

            if (!response.data.success) {
                console.warn('[jobService] Delete comment failed:', response.data.message);
                return { success: false, error: response.data.message };
            }

            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            console.error('[jobService] deleteJobComment error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get activities for a job
     * @param {number} jobId
     * @param {object} options
     * @returns {Promise<object>}
     */
    getJobActivities: async (jobId, options = {}) => {
        try {
            const { page = 1, limit = 50 } = options;
            const response = await httpClient.get(`/jobs/${jobId}/activities`, {
                params: { page, limit }
            });

            if (!response.data.success) {
                console.warn('[jobService] Get activities failed:', response.data.message);
                return { success: false, data: [], error: response.data.message };
            }

            return {
                success: true,
                data: response.data.data || [],
                pagination: response.data.pagination
            };
        } catch (error) {
            console.error('[jobService] getJobActivities error:', error);
            return { success: false, data: [], error: error.message };
        }
    }
};
