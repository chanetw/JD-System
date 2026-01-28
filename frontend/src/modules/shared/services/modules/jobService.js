
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
            console.log(`[jobService] getJobs: Fetched ${jobs.length} jobs`);
            return jobs;

        } catch (error) {
            console.error('[jobService] getJobs error:', error);
            return [];
        }
    },

    getJobsByRole: async (user) => {
        try {
            // ✓ NEW: Use Backend REST API with RLS context
            const role = user.role || (user.roles && (user.roles[0]?.name || user.roles[0]?.roleName || user.roles[0])) || 'requester';
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

    getJobById: async (id) => {
        // Try Complex Query
        let { data, error } = await supabase.from('jobs')
            .select(`
            *,
            project:projects(*),
            job_type:job_types(*),
            requester:users!jobs_requester_id_fkey(*),
            assignee:users!jobs_assignee_id_fkey(*)
         `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('[apiDatabase] getJobById Complex Query Error:', error);
            // Fallback: Simple Query
            const simpleResult = await supabase.from('jobs').select('*').eq('id', id).single();
            if (simpleResult.error) return null;
            data = simpleResult.data;
        }

        if (!data) return null;

        return {
            id: data.id,
            djId: data.dj_id,
            subject: data.subject,
            status: data.status,
            priority: data.priority,
            deadline: data.due_date,
            brief: {
                objective: data.objective,
                headline: data.headline,
                subHeadline: data.sub_headline
            },
            requesterId: data.requester_id,
            assigneeId: data.assignee_id,
            projectId: data.project_id,
            jobTypeId: data.job_type_id
        };
    },

    /**
     * สร้างงานใหม่ (Single Job หรือ Parent-Child)
     * 
     * @param {Object} jobData - ข้อมูลงาน
     * @param {number} jobData.projectId - รหัสโครงการ
     * @param {number|null} jobData.jobTypeId - รหัสประเภทงาน (สำหรับ Single Job)
     * @param {Array|null} jobData.jobTypes - รายการประเภทงาน (สำหรับ Parent-Child)
     *        รูปแบบ: [{ jobTypeId: 1, assigneeId: 5, note: "หมายเหตุ" }, ...]
     * @param {string} jobData.subject - หัวข้องาน
     * @param {string} jobData.priority - ความสำคัญ (Low, Normal, Urgent)
     * @param {Object} jobData.brief - รายละเอียด Brief
     * @param {string} jobData.deadline - วันกำหนดส่ง
     * 
     * @returns {Object} - { success: true, job: { id, djId }, children?: [...] }
     */
    createJob: async (jobData) => {
        // ถ้ามี jobTypes array -> สร้างแบบ Parent-Child
        if (jobData.jobTypes && Array.isArray(jobData.jobTypes) && jobData.jobTypes.length > 0) {
            return await jobService.createParentWithChildren(jobData);
        }

        // Original: Single Job Creation
        const payload = {
            tenant_id: jobData.tenantId || 1, // Use from Auth context
            project_id: parseInt(jobData.projectId),
            job_type_id: parseInt(jobData.jobTypeId),
            subject: jobData.subject,
            objective: jobData.brief?.objective,
            headline: jobData.brief?.headline,
            sub_headline: jobData.brief?.subHeadline,
            priority: jobData.priority,
            status: 'pending_approval',
            requester_id: jobData.requesterId, // Use from Auth context
            assignee_id: jobData.assigneeId || null, // Add assignee
            due_date: jobData.deadline,
            is_parent: false,
            parent_job_id: null
        };

        const { data, error } = await supabase.from('jobs').insert([payload]).select().single();

        if (error) throw error;

        // ถ้าเป็นงานด่วน (Urgent) และมี Assignee แล้ว -> Shift SLA ของงานอื่น
        if (jobData.priority === 'Urgent' && jobData.assigneeId) {
            // ดึงข้อมูลวันหยุดก่อนส่งเข้าฟังก์ชัน (ใช้ getHolidayDates สำหรับ Date objects)
            const { adminService } = await import('./adminService');
            const holidays = await adminService.getHolidayDates();

            await jobService.shiftSLAIfUrgent(data.id, jobData.assigneeId, holidays);
        }

        // Send Notification
        const eventType = jobData.priority === 'Urgent' ? 'urgent_impact' : 'job_created';
        await notificationService.sendNotification(eventType, data.id);

        return {
            success: true,
            job: { id: data.id, djId: data.dj_id }
        };
    },

    /**
     * สร้าง Parent Job พร้อม Child Jobs
     * 
     * @param {Object} jobData - ข้อมูลงาน (ดูรายละเอียดใน createJob)
     * 
     * หลักการ:
     * 1. สร้าง Parent Job ก่อน (ใช้ job_type = PARENT_GROUP)
     * 2. Loop สร้าง Child Jobs ทั้งหมด (ผูก parent_job_id)
     * 3. ถ้า Priority = Urgent -> ส่งต่อให้ลูกทุกตัว และ Shift SLA ของ Assignee แต่ละคน
     * 4. คำนวณ Due Date ของ Parent จาก Max(Child Due Dates)
     * 
     * @returns {Object} - { success: true, job: { id, djId }, children: [...] }
     */
    createParentWithChildren: async (jobData) => {
        console.log('[Parent-Child] Creating Parent Job with', jobData.jobTypes.length, 'children');

        // 1. หา ID ของ PARENT_GROUP Job Type (ใช้ชื่อแทน code)
        const { data: parentType } = await supabase
            .from('job_types')
            .select('id')
            .eq('name', 'Project Group (Parent)')
            .single();

        if (!parentType) {
            throw new Error('PARENT_GROUP job type not found. Please run database migration first.');
        }

        // 2. สร้าง Parent Job
        const parentPayload = {
            tenant_id: jobData.tenantId || 1,
            project_id: parseInt(jobData.projectId),
            job_type_id: parentType.id, // Dummy Job Type
            subject: jobData.subject,
            objective: jobData.brief?.objective,
            headline: jobData.brief?.headline,
            sub_headline: jobData.brief?.subHeadline,
            priority: jobData.priority,
            status: 'pending_approval',
            requester_id: jobData.requesterId, // Use from Auth context
            assignee_id: null, // Parent ไม่มี Assignee
            due_date: null, // จะคำนวณหลังจากสร้าง Children
            is_parent: true,
            parent_job_id: null
        };

        const { data: parentJob, error: parentError } = await supabase
            .from('jobs')
            .insert([parentPayload])
            .select()
            .single();

        if (parentError) throw parentError;
        console.log('[Parent-Child] Parent Job created:', parentJob.dj_id);

        // 3. สร้าง Child Jobs
        const childJobs = [];
        const holidays = await (await import('./adminService')).adminService.getHolidayDates();
        let maxDueDate = null;

        for (const childType of jobData.jobTypes) {
            // ดึง SLA ของ Job Type นี้
            const { data: jobTypeInfo } = await supabase
                .from('job_types')
                .select('id, sla_working_days')
                .eq('id', childType.jobTypeId)
                .single();

            // คำนวณ Due Date จาก SLA
            const { addWorkDays } = await import('../../utils/slaCalculator');
            const childDueDate = addWorkDays(new Date(), jobTypeInfo?.sla_working_days || 7, holidays);

            // สร้าง Child Job
            const childPayload = {
                tenant_id: jobData.tenantId || 1,
                project_id: parseInt(jobData.projectId),
                job_type_id: parseInt(childType.jobTypeId),
                subject: `${jobData.subject} - Child #${childJobs.length + 1}`,
                objective: jobData.brief?.objective,
                headline: jobData.brief?.headline,
                sub_headline: jobData.brief?.subHeadline,
                priority: jobData.priority, // สืบทอด Priority จาก Parent
                status: 'pending_approval',
                requester_id: jobData.requesterId, // Use from Auth context
                assignee_id: childType.assigneeId || null,
                due_date: childDueDate.toISOString(),
                is_parent: false,
                parent_job_id: parentJob.id // ผูก Parent
            };

            const { data: childJob, error: childError } = await supabase
                .from('jobs')
                .insert([childPayload])
                .select()
                .single();

            if (childError) throw childError;
            childJobs.push(childJob);
            console.log('[Parent-Child] Child Job created:', childJob.dj_id, 'Type:', childType.jobTypeId);

            // Track Max Due Date for Parent
            if (!maxDueDate || childDueDate > maxDueDate) {
                maxDueDate = childDueDate;
            }

            // ถ้า Urgent และมี Assignee -> Shift SLA
            if (jobData.priority === 'Urgent' && childType.assigneeId) {
                await jobService.shiftSLAIfUrgent(childJob.id, childType.assigneeId, holidays);
            }
        }

        // 4. Update Parent Due Date
        if (maxDueDate) {
            await supabase.from('jobs')
                .update({ due_date: maxDueDate.toISOString() })
                .eq('id', parentJob.id);
        }

        // 5. Send Notification
        const eventType = jobData.priority === 'Urgent' ? 'urgent_impact' : 'job_created';
        await notificationService.sendNotification(eventType, parentJob.id);

        console.log('[Parent-Child] ✅ Complete:', parentJob.dj_id, 'with', childJobs.length, 'children');

        return {
            success: true,
            job: { id: parentJob.id, djId: parentJob.dj_id },
            children: childJobs.map(c => ({ id: c.id, djId: c.dj_id }))
        };
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
        // 1. ดึงข้อมูล Job เพื่อดู Project ID และ Status ปัจจุบัน
        const { data: job, error: jobErr } = await supabase
            .from('jobs')
            .select('id, project_id, status, job_type_id')
            .eq('id', jobId)
            .single();

        if (jobErr) throw new Error('Job not found');

        // 2. ดึง Approval Flow ของ Project
        // Note: เรียกใช้ adminService แบบ Dynamic Import เพื่อเลี่ยง Circular Dependency ถ้ามี
        const { adminService } = await import('./adminService');
        const flow = await adminService.getApprovalFlowByProject(job.project_id);

        let nextStatus = 'in_progress'; // Default ถ้าไม่มี Flow
        let isFinal = true;

        if (flow && flow.levels && flow.levels.length > 0) {
            // Map Status -> Current Level
            let currentLevel = 0;
            if (job.status === 'pending_approval') currentLevel = 1;
            else if (job.status.startsWith('pending_level_')) {
                currentLevel = parseInt(job.status.split('_')[2]);
            }

            // หาดูว่า Level นี้ต้องมีคนอนุมัติกี่คน (Logic ANY/ALL ยังไม่ทำใน Phase นี้ เอาแบบ ANY ไปก่อน)
            // เช็คว่ามี Level ถัดไปไหม?
            const nextLevelNode = flow.levels.find(l => l.level === currentLevel + 1);

            if (nextLevelNode) {
                // ยังไม่จบ -> ไป Level ถัดไป
                nextStatus = `pending_level_${nextLevelNode.level}`;
                isFinal = false;
            } else {
                // จบ Flow แล้ว -> Approved
                // เปลี่ยนเป็น approved ก่อน แล้วให้ Auto-Assign Logic จัดการต่อ
                nextStatus = 'approved';
                isFinal = true;
            }
        }

        console.log(`[Approval Logic] Job ${jobId} Level ${job.status} -> ${nextStatus}`);

        // 3. Update Status
        const updatePayload = {
            status: nextStatus,
            updated_at: new Date().toISOString()
        };

        // ถ้าจบ Flow ให้บันทึก started_at
        if (isFinal) {
            updatePayload.started_at = new Date().toISOString();
        }

        const { error } = await supabase.from('jobs')
            .update(updatePayload)
            .eq('id', jobId);

        if (error) throw error;

        // 4. Log Activity & Notification
        await supabase.from('activity_logs').insert([{
            job_id: jobId,
            user_id: approverId,
            action: 'approve',
            message: `Approved (Step -> ${nextStatus}). Comment: ${comment || '-'}`
        }]);

        await notificationService.sendNotification('job_approved', jobId, {
            nextStatus,
            isFinal
        });

        // 5. ถ้าจบ Flow แล้ว ให้ทำ Auto-Assign
        if (isFinal && nextStatus === 'approved') {
            try {
                const autoAssignResult = await jobService.autoAssignJobAfterApproval(jobId);

                if (autoAssignResult.success) {
                    console.log(`[Auto-Assign] Job ${jobId} assigned to user ${autoAssignResult.data.assignee_id}`);
                    return {
                        success: true,
                        nextStatus: 'assigned',
                        isFinal,
                        autoAssigned: true,
                        assigneeId: autoAssignResult.data.assignee_id
                    };
                } else if (autoAssignResult.needsManualAssign) {
                    console.log(`[Auto-Assign] Job ${jobId} needs manual assignment`);
                    return {
                        success: true,
                        nextStatus: 'approved',
                        isFinal,
                        needsManualAssign: true
                    };
                }
            } catch (autoAssignError) {
                console.error('[Auto-Assign] Error:', autoAssignError);
                // ถ้า Auto-Assign ล้มเหลว ให้คงสถานะ approved ไว้เพื่อรอ Manual Assign
                return {
                    success: true,
                    nextStatus: 'approved',
                    isFinal,
                    needsManualAssign: true,
                    autoAssignError: autoAssignError.message
                };
            }
        }

        return { success: true, nextStatus, isFinal };
    },

    rejectJob: async (jobId, reason, type, rejecterId) => {
        const newStatus = type === 'reject' ? 'rejected' : 'rework';

        const { error } = await supabase.from('jobs')
            .update({ status: newStatus })
            .eq('id', jobId);

        if (error) throw error;

        // Log Activity
        await supabase.from('activity_logs').insert([{
            job_id: jobId,
            user_id: rejecterId,
            action: type,
            message: `Job ${type}: ${reason}`
        }]);

        // Send Notification
        await notificationService.sendNotification('job_rejected', jobId, { reason });

        return { success: true };
    },

    reassignJob: async (jobId, newAssigneeId, reason, userId) => {
        console.log(`[Reassign] Job ${jobId} -> New Assignee ${newAssigneeId} by User ${userId}`);

        // 1. Update Assignee
        const { error } = await supabase.from('jobs')
            .update({ assignee_id: newAssigneeId })
            .eq('id', jobId);

        if (error) throw error;

        // 2. Fetch New Assignee Name (for Log)
        const { data: userData } = await supabase.from('users').select('display_name').eq('id', newAssigneeId).single();
        const assigneeName = userData?.display_name || 'Unknown';

        // 3. Log Activity
        await supabase.from('activity_logs').insert([{
            job_id: jobId,
            user_id: userId,
            action: 'assigned',
            message: `Reassigned to ${assigneeName}. Note: ${reason || '-'}`
        }]);

        // 4. Send Notification (Optional: Notify new assignee)
        await notificationService.sendNotification('job_assigned', jobId);

        return { success: true };
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

            // Check Environment (Mock vs Real)
            const isMock = import.meta.env.VITE_USE_MOCK_API === 'true';

            if (isMock) {
                const { mockApiService } = await import('../../services/mockApi');
                return await mockApiService.startJob(jobId, triggerType);
            } else {
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
            }
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
            console.log(`[jobService] completeJob: ${jobId}`, payload);

            const isMock = import.meta.env.VITE_USE_MOCK_API === 'true';

            if (isMock) {
                const { mockApiService } = await import('../../services/mockApi');
                return await mockApiService.completeJob(jobId, payload);
            } else {
                // Real DB Implementation would go here (omitted for brevity)
                // Reuse finishJob logic or similar
                // For now, assume finishJob handles it
                return await jobService.finishJob(jobId, payload.attachments || [], payload.note, 1); // Mock userId 1
            }
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
     */
    checkAutoJobStart: async () => {
        const isMock = true; // Force check mock for simulation
        if (isMock) {
            const { mockApiService } = await import('../../services/mockApi');
            return await mockApiService.simulateAutoStartCheck();
        }
        return { message: 'Not implemented for Real DB yet (Requires Edge Functions)' };
    },

    /**
     * Auto-assign job after all approvals completed
     * Logic: Team Lead → Department Manager → Needs Manual Assignment
     * 
     * @param {number} jobId - Job ID to assign
     * @returns {Promise<Object>} - Result with success status and assignee info
     */
    autoAssignJobAfterApproval: async (jobId) => {
        try {
            // Fetch job with project and department relations
            const { data: job, error: jobErr } = await supabase
                .from('jobs')
                .select(`
                    *,
                    project:projects(id, name),
                    requester:users!jobs_requester_id_fkey(id, display_name, department_id)
                `)
                .eq('id', jobId)
                .single();

            if (jobErr || !job) {
                throw new Error('Job not found');
            }

            // Step 1: Check Approval Flow Config for Team Lead
            const { data: flowData, error: flowErr } = await supabase
                .from('approval_flows')
                .select('include_team_lead, team_lead_id')
                .eq('project_id', job.project_id)
                .not('team_lead_id', 'is', null)
                .limit(1);

            const flow = flowData && flowData.length > 0 ? flowData[0] : null;

            if (!flowErr && flow?.include_team_lead && flow?.team_lead_id) {
                console.log('[Auto-Assign] Assigning to Team Lead:', flow.team_lead_id);
                return await jobService.assignJobManually(
                    jobId,
                    flow.team_lead_id,
                    null,
                    'auto-assign: team-lead'
                );
            }

            // Step 2: Check Department Manager (from requester's department)
            if (job.requester?.department_id) {
                const { data: dept, error: deptErr } = await supabase
                    .from('departments')
                    .select('id, name, manager_id')
                    .eq('id', job.requester.department_id)
                    .single();

                if (!deptErr && dept?.manager_id) {
                    console.log('[Auto-Assign] Assigning to Department Manager:', dept.manager_id);
                    return await jobService.assignJobManually(
                        jobId,
                        dept.manager_id,
                        null,
                        'auto-assign: dept-manager'
                    );
                }
            }

            // Step 3: No auto-assign possible - needs manual selection
            console.log('[Auto-Assign] No auto-assign available - needs manual selection');
            return {
                success: false,
                needsManualAssign: true,
                jobId: jobId,
                message: 'Job approved but needs manual assignment by Department Manager or Admin'
            };
        } catch (error) {
            console.error('[Auto-Assign] Failed:', error);
            return { success: false, error: error.message };
        }
    },

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
    }
};
