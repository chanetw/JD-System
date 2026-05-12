
import { handleResponse } from '../utils';
import { notificationService } from './notificationService';
import httpClient from '../httpClient';

function _extractRoleParam(user) {
    if (!user) return 'requester';
    let roles = [];
    if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        roles = user.roles.map(r => (typeof r === 'string' ? r : r?.name || '')).filter(Boolean);
    }
    if (roles.length === 0) {
        const single = user.roleName || user.role?.name || (typeof user.role === 'string' ? user.role : '') || 'requester';
        roles = [single];
    }
    return roles.map(r => r.toLowerCase()).join(',') || 'requester';
}

const parseValidDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const toDisplayText = (value, fallback = null) => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || fallback;
    }

    if (value && typeof value === 'object') {
        return value.name || value.displayName || value.subject || fallback;
    }

    return fallback;
};

const mapAssigneeQueueJob = (job, { filterStatus, now, index }) => {
    try {
        const normalizedStatus = String(job?.status || '').trim();
        const isDone = filterStatus === 'done' || ['completed', 'closed', 'approved'].includes(normalizedStatus);
        const deadlineRaw = job?.deadline || job?.dueDate || null;
        const dueDate = parseValidDate(deadlineRaw);
        const acceptanceDateRaw = job?.acceptanceDate || job?.createdAt || null;
        const acceptanceDate = parseValidDate(acceptanceDateRaw);
        const hoursRemaining = dueDate ? (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60) : null;

        const numericSlaWorkingDays = Number(job?.slaWorkingDays);
        const hasValidSlaWorkingDays = Number.isFinite(numericSlaWorkingDays) && numericSlaWorkingDays > 0;

        let shouldStartBy = null;
        if (dueDate && hasValidSlaWorkingDays) {
            const slaHours = numericSlaWorkingDays * 8;
            const candidateDate = new Date(dueDate.getTime() - slaHours * 60 * 60 * 1000);
            shouldStartBy = Number.isNaN(candidateDate.getTime()) ? null : candidateDate;
        }

        let slaProgress = null;
        if (dueDate && acceptanceDate && !isDone) {
            const totalMs = dueDate.getTime() - acceptanceDate.getTime();
            const usedMs = now.getTime() - acceptanceDate.getTime();
            slaProgress = totalMs > 0 ? Math.min(100, Math.round((usedMs / totalMs) * 100)) : 100;
        }

        let healthStatus = 'normal';
        if (isDone) {
            healthStatus = 'normal';
        } else if (hoursRemaining === null) {
            healthStatus = 'normal';
        } else if (hoursRemaining < 0 || hoursRemaining < 4) {
            healthStatus = 'critical';
        } else if (shouldStartBy && now > shouldStartBy) {
            healthStatus = 'warning';
        } else if (hoursRemaining <= 48) {
            healthStatus = 'warning';
        }

        return {
            id: job?.id ?? `queue-row-${index}`,
            djId: job?.djId || null,
            subject: toDisplayText(job?.subject, '-'),
            status: normalizedStatus || 'unknown',
            priority: job?.priority || null,
            deadline: deadlineRaw,
            projectCode: job?.projectCode || null,
            projectName: toDisplayText(job?.project, null),
            jobTypeName: toDisplayText(job?.jobType, null),
            requesterName: toDisplayText(job?.requester, null),
            requesterAvatar: job?.requesterAvatar || null,
            assignee: toDisplayText(job?.assignee, null),
            healthStatus,
            hoursRemaining: hoursRemaining !== null ? Math.round(hoursRemaining * 10) / 10 : null,
            slaWorkingDays: hasValidSlaWorkingDays ? numericSlaWorkingDays : null,
            slaProgress,
            shouldStartBy: shouldStartBy ? shouldStartBy.toISOString() : null,
            startedAt: job?.startedAt || null,
            completedAt: job?.completedAt || null,
            acceptanceDate: acceptanceDateRaw || null,
            createdAt: job?.createdAt || null,
            predecessorDjId: job?.predecessorDjId || null,
            predecessorStatus: job?.predecessorStatus || null
        };
    } catch (error) {
        console.warn('[jobService] getAssigneeJobs normalization fallback:', {
            jobId: job?.id,
            djId: job?.djId,
            message: error.message
        });

        return {
            id: job?.id ?? `queue-row-${index}`,
            djId: job?.djId || null,
            subject: toDisplayText(job?.subject, '-'),
            status: String(job?.status || 'unknown'),
            priority: job?.priority || null,
            deadline: job?.deadline || job?.dueDate || null,
            projectCode: job?.projectCode || null,
            projectName: toDisplayText(job?.project, null),
            jobTypeName: toDisplayText(job?.jobType, null),
            requesterName: toDisplayText(job?.requester, null),
            requesterAvatar: job?.requesterAvatar || null,
            assignee: toDisplayText(job?.assignee, null),
            healthStatus: 'normal',
            hoursRemaining: null,
            slaWorkingDays: null,
            slaProgress: null,
            shouldStartBy: null,
            startedAt: job?.startedAt || null,
            completedAt: job?.completedAt || null,
            acceptanceDate: job?.acceptanceDate || null,
            createdAt: job?.createdAt || null,
            predecessorDjId: job?.predecessorDjId || null,
            predecessorStatus: job?.predecessorStatus || null
        };
    }
};

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

            return normalizedJobs;

        } catch (error) {
            console.error('[jobService] getJobs error:', error);
            return [];
        }
    },

    getJobsByRole: async (user, options = {}) => {
        try {
            // Multi-role support: collect ALL user roles and send as comma-separated
            // Backend will return union of jobs from all applicable roles

            if (!user) {
                console.warn('[getJobsByRole] User is null or undefined, returning empty jobs list');
                return [];
            }

            // Collect all roles from various auth formats (V1 array, V2 object/string)
            let allRoles = [];

            if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
                allRoles = user.roles.map(r => {
                    if (typeof r === 'string') return r;
                    return r?.name || r?.roleName || '';
                }).filter(Boolean);
            }

            // Fallback: single role formats
            if (allRoles.length === 0) {
                if (typeof user.role === 'string') {
                    allRoles = [user.role];
                } else if (user.role && user.role.name) {
                    allRoles = [user.role.name];
                } else if (user.roleName) {
                    allRoles = [user.roleName];
                }
            }

            // Send comma-separated roles to backend
            const roleParam = allRoles.map(r => r.toLowerCase()).join(',') || 'requester';


            const params = {
                role: roleParam,
                limit: 500,
                ...options
            };

            const sanitizedParams = Object.fromEntries(
                Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
            );

            const response = await httpClient.get('/jobs', {
                params: sanitizedParams
            });

            if (!response.data.success) {
                console.warn('[jobService] Get jobs by role failed:', response.data.message);
                return [];
            }

            const jobs = response.data.data || [];
            const stats = response.data.stats || {};

            // Return both jobs and stats for components that need them
            // For backward compatibility, return jobs array if no stats
            return stats && Object.keys(stats).length > 0
                ? { data: jobs, stats }
                : jobs;

        } catch (error) {
            console.error('[jobService] getJobsByRole error:', error);
            return [];
        }
    },

    getApprovalActionableList: async (user) => {
        const response = await jobService.getJobsByRole(user, {
            approvalView: 'waiting',
            limit: 500,
        });

        return Array.isArray(response) ? response : (response?.data || []);
    },

    getApprovalHistoryList: async (user, category = 'approved') => {
        const normalizedCategory = category === 'not_approved' ? 'not_approved' : 'approved';
        const response = await jobService.getJobsByRole(user, {
            approvalView: normalizedCategory,
            limit: 500,
        });

        return Array.isArray(response) ? response : (response?.data || []);
    },


    /**
     * ดึงงานของผู้รับผิดชอบ (Assignee) แบ่งตามกลุ่มสถานะ
     * @param {number} userId - ID ของผู้ใช้งาน
     * @param {string} filterStatus - กลุ่มสถานะ ('todo', 'in_progress', 'waiting', 'done')
     */
    getAssigneeJobs: async (userId, filterStatus = 'all') => {
        try {
            const response = await httpClient.get('/jobs', {
                params: { role: 'assignee', status: filterStatus }
            });

            if (!response.data.success) {
                console.warn('[jobService] getAssigneeJobs failed:', response.data.message);
                return [];
            }

            const data = response.data.data || [];
            const serverNowRaw = response.data?.meta?.serverNow;
            const serverNow = serverNowRaw ? new Date(serverNowRaw) : null;
            const now = serverNow && !Number.isNaN(serverNow.getTime()) ? serverNow : new Date();
            return data.map((job, index) => mapAssigneeQueueJob(job, {
                filterStatus,
                now,
                index
            }));

        } catch (error) {
            console.error('Error fetching assignee jobs:', error);
            // Fallback to empty array if error
            return [];
        }
    },

    /**
     * ⚡ Performance: ดึงจำนวนงานแบ่งตาม status group ใน 1 API call
     * แทนการเรียก getAssigneeJobs 4 ครั้งเพื่อนับจำนวน
     * @returns {Object} { in_progress, completed, rejected, all, todo, waiting }
     */
    getJobCounts: async () => {
        try {
            const response = await httpClient.get('/jobs/counts');
            if (!response.data.success) {
                console.warn('[jobService] getJobCounts failed:', response.data.message);
                return { in_progress: 0, completed: 0, rejected: 0, all: 0, todo: 0, waiting: 0 };
            }
            return response.data.data;
        } catch (error) {
            console.error('[jobService] getJobCounts error:', error);
            return { in_progress: 0, completed: 0, rejected: 0, all: 0, todo: 0, waiting: 0 };
        }
    },

    /**
     * ดึงรายละเอียดงานเดี่ยวผ่าน Backend API (V2)
     * @param {number} id - รหัสงาน
     */
    getJobById: async (id) => {
        try {
            const response = await httpClient.get(`/jobs/${id}`);

            if (!response.data.success) {
                console.error('[jobService] getJobById failed:', response.data.message);
                return null;
            }

            const data = response.data.data;

            // Map Backend V2 data to Frontend component expectation
            const mapped = {
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
                job_type_id: data.jobTypeId,
                // Completion Data
                completedAt: data.completedAt,
                completedByUser: data.completedByUser,
                finalFiles: data.finalFiles
            };


            return mapped;

        } catch (error) {
            const code = error.response?.data?.error;
            if (code === 'JOB_NOT_FOUND' || code === 'INSUFFICIENT_PERMISSIONS') {
                const err = new Error(error.response.data.message || 'Job error');
                err.code = code;
                throw err;
            }
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
            // V2: เรียก Backend API โดยตรง
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
                dueDate: jobData.dueDate || jobData.deadline,
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

            // Urgent SLA shifting is handled by the backend only.
            // Keeping this path disabled prevents duplicate due-date shifts.

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
     * ✅ V2: ใช้ Backend API โดยตรง
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
                deadline: jobData.dueDate || jobData.deadline || new Date().toISOString(),
                brief: jobData.brief,
                jobTypes: jobData.jobTypes, // [{ jobTypeId, assigneeId }]
                items: jobData.items || [] // ส่งรายการชิ้นงานไปด้วย
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

    rejectJobByAssignee: async (jobId, comment) => {
        try {
            const response = await httpClient.post(`/jobs/${jobId}/reject-by-assignee`, { comment });
            if (!response.data.success) throw new Error(response.data.message);
            return response.data;
        } catch (error) {
            console.error('[jobService] rejectJobByAssignee error:', error);
            throw error;
        }
    },

    confirmAssigneeRejection: async (jobId, comment) => {
        try {
            const response = await httpClient.post(`/jobs/${jobId}/confirm-assignee-rejection`, { comment });
            if (!response.data.success) throw new Error(response.data.message);
            return response.data;
        } catch (error) {
            console.error('[jobService] confirmAssigneeRejection error:', error);
            throw error;
        }
    },

    denyAssigneeRejection: async (jobId, reason) => {
        try {
            const response = await httpClient.post(`/jobs/${jobId}/deny-assignee-rejection`, { reason });
            if (!response.data.success) throw new Error(response.data.message);
            return response.data;
        } catch (error) {
            console.error('[jobService] denyAssigneeRejection error:', error);
            throw error;
        }
    },

    reassignJob: async (jobId, newAssigneeId, reason, userId, user = null) => {
        console.log(`[Reassign] Job ${jobId} -> New Assignee ${newAssigneeId} by User ${userId}`);

        try {
            const response = await httpClient.post(`/jobs/${jobId}/reassign`, {
                newAssigneeId,
                reason
            });

            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            // Backend returns assignee data
            return {
                success: true,
                assignee: response.data.data.assignee
            };
        } catch (error) {
            console.error('[jobService] reassignJob error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'ไม่มีสิทธิ์ย้ายงาน หรือดึงข้อมูลผิดพลาด';
            const enhancedError = new Error(errorMessage);
            enhancedError.code = error.response?.status === 403 ? 'PERMISSION_DENIED' : 'API_ERROR';
            throw enhancedError;
        }
    },


    finishJob: async (jobId, finalFiles, notes, userId) => {
        const attachments = (finalFiles || []).map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
        }));

        const response = await httpClient.post(`/jobs/${jobId}/complete`, {
            attachments,
            note: notes,
            completedBy: userId
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to complete job');
        }

        return response.data.data || response.data;
    },

    // --- Dashboard Stats ---

    _buildDashboardParams: (filtersOrStatus = {}, legacyAssigneeFilter = '') => {
        const filters = typeof filtersOrStatus === 'object' && filtersOrStatus !== null
            ? filtersOrStatus
            : { status: filtersOrStatus, assignee: legacyAssigneeFilter };

        const params = {};
        if (filters.status && String(filters.status).trim()) params.status = String(filters.status).trim();
        if (filters.assignee && String(filters.assignee).trim()) params.assignee = String(filters.assignee).trim();
        if (filters.projectId) params.projectId = filters.projectId;
        if (filters.budId) params.budId = filters.budId;
        if (typeof filters.includeCompleted === 'boolean') params.includeCompleted = filters.includeCompleted ? 'true' : 'false';
        if (filters.q && String(filters.q).trim()) params.q = String(filters.q).trim();
        return params;
    },

    // ⚡ Performance: ใช้ Backend API ที่ใช้ COUNT() แทนการดึงทุก row
    getDashboardStats: async (_user, filtersOrStatus = {}, legacyAssigneeFilter = '') => {
        try {
            const params = jobService._buildDashboardParams(filtersOrStatus, legacyAssigneeFilter);
            
            const response = await httpClient.get('/jobs/dashboard-stats', { params });
            if (!response.data.success) {
                console.warn('getDashboardStats API failed:', response.data.message);
                return { newToday: 0, dueToday: 0, overdue: 0, totalJobs: 0, totalItems: 0, pending: 0, myJobs: 0, assigneeSummary: [] };
            }
            return response.data.data;
        } catch (err) {
            console.error('getDashboardStats error:', err);
            return { newToday: 0, dueToday: 0, overdue: 0, totalJobs: 0, totalItems: 0, pending: 0, myJobs: 0, assigneeSummary: [] };
        }
    },

    /**
     * ดึงรายการงานสำหรับ KPI Card Drill-down แบบ Lazy Load
     * 
     * @param {string} type - ประเภทงาน: 'newToday' | 'dueToday' | 'overdue'
     * @param {number} page - หน้าที่ต้องการ (default: 1)
     * @param {number} limit - จำนวนต่อหน้า (default: 20)
     * @returns {{ jobs: Array, total: number, page: number, hasMore: boolean }}
     */
    getDashboardJobs: async (type, page = 1, limit = 20, filters = {}) => {
        try {
            const params = {
                type,
                page,
                limit,
                ...jobService._buildDashboardParams(filters)
            };
            const response = await httpClient.get('/jobs/dashboard-jobs', {
                params
            });
            if (!response.data.success) {
                console.warn('getDashboardJobs API failed:', response.data.message);
                return { jobs: [], total: 0, page: 1, hasMore: false };
            }
            return response.data.data;
        } catch (err) {
            console.error('getDashboardJobs error:', err);
            return { jobs: [], total: 0, page: 1, hasMore: false };
        }
    },

    getDashboardList: async (filters = {}) => {
        try {
            const response = await httpClient.get('/jobs/dashboard-list', {
                params: jobService._buildDashboardParams(filters)
            });

            if (!response.data.success) {
                console.warn('getDashboardList API failed:', response.data.message);
                return { jobs: [], total: 0 };
            }

            return {
                jobs: Array.isArray(response.data.data) ? response.data.data : [],
                total: response.data.total || 0
            };
        } catch (err) {
            console.error('getDashboardList error:', err);
            return { jobs: [], total: 0 };
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
        console.warn('[Urgent Logic] shiftSLAIfUrgent is disabled. Backend handles urgent SLA rescheduling.', {
            urgentJobId,
            assigneeId,
            holidayCount: holidays?.length || 0
        });
    },


    /**
     * เริ่มงาน (Start Job)
     * @param {string} jobId - รหัสงาน
     * @param {string} triggerType - 'manual' | 'view' | 'auto'
     */
    startJob: async (jobId, triggerType = 'manual') => {
        try {
            console.log(`[jobService] startJob: ${jobId}, trigger: ${triggerType}`);

            // Call Backend API
            const response = await httpClient.post(`/jobs/${jobId}/start`, { triggerType });

            if (!response.data.success) {
                // If it returns success: false but with message (like "already started"), 
                // we can return it gracefully without throwing an error if we want
                // For now, let's just return the message
                if (response.data.currentStatus) {
                    return { message: response.data.message, currentStatus: response.data.currentStatus };
                }
                throw new Error(response.data.message || 'Failed to start job');
            }

            return response.data.data;
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

    updateDeliveredQuantities: async (jobId, deliveredItems) => {
        try {
            const response = await httpClient.patch(`/jobs/${jobId}/delivered-quantities`, {
                deliveredItems
            });
            if (!response.data.success) throw new Error(response.data.message);
            return response.data;
        } catch (err) {
            console.error('[jobService] updateDeliveredQuantities error:', err);
            throw err;
        }
    },

    /**
     * ล้างข้อมูล Demo (ลบงานที่สร้างขึ้นใหม่ทั้งหมด ยกเว้น Seed Data)
     * Seed Data จะมี DJ ID ขึ้นต้นด้วย 'TEST-' (ตามที่กำหนดใน migration 010)
     */
    resetDemoData: async () => {
        throw new Error('Demo reset must be executed by a backend/admin endpoint.');
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
     * @param {Object} user - Current user object with roles
     * @returns {Promise<Object>} - Result with success status
     */
    assignJobManually: async (jobId, assigneeId) => {
        try {
            const response = await httpClient.post(`/jobs/${jobId}/assign`, { assigneeId });
            if (!response.data.success) {
                throw new Error(response.data.message || 'มอบหมายงานไม่สำเร็จ');
            }
            return { success: true, data: response.data.data };
        } catch (error) {
            console.error('[jobService] assignJobManually error:', error);
            const message = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาด';
            return { success: false, error: message };
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
    },

    // ==========================================
    // Admin: Hard Delete + Edit Priority
    // ==========================================

    /**
     * Admin hard delete งาน (ลบถาวร)
     * @param {number} jobId
     * @param {string} reason - เหตุผลการลบ (required)
     * @returns {Promise<object>} { success, data: { deletedDjId, totalDeleted, ... } }
     */
    hardDeleteJob: async (jobId, reason) => {
        try {
            const response = await httpClient.delete(`/jobs/${jobId}/hard-delete`, {
                data: { reason, confirmText: 'DELETE' }
            });

            if (!response.data.success) {
                console.warn('[jobService] Hard delete failed:', response.data.message);
                return { success: false, error: response.data.message };
            }

            return { success: true, data: response.data.data };
        } catch (error) {
            console.error('[jobService] hardDeleteJob error:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Admin แก้ไข priority ของงาน (normal ↔ urgent)
     * @param {number} jobId
     * @param {string} priority - 'normal' | 'urgent'
     * @param {string} reason - เหตุผลการแก้ไข (required)
     * @param {string} scope - 'single' | 'chain'
     * @param {object} options - { dueDateMode, manualDueDate, previewOnly }
     * @returns {Promise<object>} { success, data: { oldPriority, newPriority, newDueDate, ... } }
     */
    editJobPriority: async (jobId, priority, reason, scope = 'single', options = {}) => {
        try {
            const {
                dueDateMode = 'suggested',
                manualDueDate = null,
                previewOnly = false
            } = options;

            const response = await httpClient.post(`/jobs/${jobId}/edit-priority`, {
                priority,
                reason,
                scope,
                dueDateMode,
                manualDueDate,
                previewOnly
            });

            if (!response.data.success) {
                console.warn('[jobService] Edit priority failed:', response.data.message);
                return { success: false, error: response.data.message };
            }

            return { success: true, data: response.data.data };
        } catch (error) {
            console.error('[jobService] editJobPriority error:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }
};
