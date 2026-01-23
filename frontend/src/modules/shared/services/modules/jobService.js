
import { supabase } from '../supabaseClient';
import { handleResponse } from '../utils';
import { notificationService } from './notificationService';

export const jobService = {
    // --- Jobs CRUD ---

    getJobs: async (filters = {}) => {
        let query = supabase.from('jobs')
            .select(`
            *,
            project:projects(name),
            job_type:job_types(name),
            requester:users!jobs_requester_id_fkey(display_name, avatar_url),
            assignee:users!jobs_assignee_id_fkey(display_name, avatar_url)
         `)
            .order('created_at', { ascending: false });

        if (filters.status && filters.status !== 'All') {
            query = query.eq('status', filters.status.toLowerCase());
        }

        const data = handleResponse(await query);

        return data.map(j => ({
            id: j.id,
            djId: j.dj_id,
            subject: j.subject,
            jobType: j.job_type?.name,
            project: j.project?.name,
            projectName: j.project?.name,
            status: j.status,
            priority: j.priority,
            deadline: j.due_date,
            createdAt: j.created_at,
            requester: j.requester?.display_name,
            requesterAvatar: j.requester?.avatar_url,
            assignee: j.assignee?.display_name,
            assigneeName: j.assignee?.display_name,
            assigneeAvatar: j.assignee?.avatar_url
        }));
    },

    getJobsByRole: async (user) => {
        try {
            // TODO: Filter by role logic if needed (currently fetches all + limit)
            const { data: jobs, error } = await supabase
                .from('jobs')
                .select(`
                    *,
                    project:projects(name),
                    job_type:job_types(name),
                    requester:users!jobs_requester_id_fkey(display_name, avatar_url),
                    assignee:users!jobs_assignee_id_fkey(display_name, avatar_url)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.warn('Error fetching jobs by role:', error.message);
                return [];
            }

            return (jobs || []).map(j => ({
                id: j.id,
                djId: j.dj_id,
                subject: j.subject,
                jobType: j.job_type?.name,
                project: j.project?.name,
                projectName: j.project?.name,
                status: j.status,
                priority: j.priority,
                deadline: j.due_date,
                createdAt: j.created_at,
                isOverdue: j.due_date ? new Date(j.due_date) < new Date() && j.status !== 'completed' : false,
                requester: j.requester?.display_name,
                requesterAvatar: j.requester?.avatar_url,
                assignee: j.assignee?.display_name,
                assigneeName: j.assignee?.display_name,
                assigneeAvatar: j.assignee?.avatar_url
            }));
        } catch (err) {
            console.error('getJobsByRole error:', err);
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
            tenant_id: 1, // Default
            project_id: parseInt(jobData.projectId),
            job_type_id: parseInt(jobData.jobTypeId),
            subject: jobData.subject,
            objective: jobData.brief?.objective,
            headline: jobData.brief?.headline,
            sub_headline: jobData.brief?.subHeadline,
            priority: jobData.priority,
            status: 'pending_approval',
            requester_id: 1, // Current User Hardcoded (Replace with Auth context later)
            assignee_id: jobData.assigneeId || null, // Add assignee
            due_date: jobData.deadline,
            is_parent: false,
            parent_job_id: null
        };

        const { data, error } = await supabase.from('jobs').insert([payload]).select().single();

        if (error) throw error;

        // ถ้าเป็นงานด่วน (Urgent) และมี Assignee แล้ว -> Shift SLA ของงานอื่น
        if (jobData.priority === 'Urgent' && jobData.assigneeId) {
            // ดึงข้อมูลวันหยุดก่อนส่งเข้าฟังก์ชัน
            const { adminService } = await import('./adminService');
            const holidays = await adminService.getHolidays();

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
            tenant_id: 1,
            project_id: parseInt(jobData.projectId),
            job_type_id: parentType.id, // Dummy Job Type
            subject: jobData.subject,
            objective: jobData.brief?.objective,
            headline: jobData.brief?.headline,
            sub_headline: jobData.brief?.subHeadline,
            priority: jobData.priority,
            status: 'pending_approval',
            requester_id: 1,
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
        const holidays = await (await import('./adminService')).adminService.getHolidays();
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
                tenant_id: 1,
                project_id: parseInt(jobData.projectId),
                job_type_id: parseInt(childType.jobTypeId),
                subject: `${jobData.subject} - Child #${childJobs.length + 1}`,
                objective: jobData.brief?.objective,
                headline: jobData.brief?.headline,
                sub_headline: jobData.brief?.subHeadline,
                priority: jobData.priority, // สืบทอด Priority จาก Parent
                status: 'pending_approval',
                requester_id: 1,
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

    approveJob: async (jobId, approverId, comment) => {
        // Update status
        const { error } = await supabase.from('jobs')
            .update({ status: 'in_progress', started_at: new Date() })
            .eq('id', jobId);

        if (error) throw error;

        // Log Activity
        await supabase.from('activity_logs').insert([{
            job_id: jobId,
            user_id: approverId,
            action: 'approve',
            message: comment || 'Job approved'
        }]);

        // Send Notification
        await notificationService.sendNotification('job_approved', jobId);

        return { success: true };
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

    // --- Dashboard Stats ---

    getDashboardStats: async () => {
        try {
            const { data: jobs, error } = await supabase
                .from('design_jobs') // Note: Assuming view or alias. If 'jobs' table, verify schema.
                .select('id, status, deadline, created_at'); // Using 'deadline' or 'due_date' depending on schema alias

            // Fallback if 'design_jobs' not found, try 'jobs'
            if (error) {
                const { data: jobsFallback } = await supabase.from('jobs').select('id, status, due_date, created_at');
                // map due_date to deadline
                if (jobsFallback) {
                    return jobService.calculateStats(jobsFallback.map(j => ({ ...j, deadline: j.due_date })));
                }
                return { newToday: 0, dueToday: 0, overdue: 0, totalJobs: 0, pending: 0 };
            }

            return jobService.calculateStats(jobs);
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
    }
};
