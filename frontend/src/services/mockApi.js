/**
 * @file mockApi.js
 * @description Mock API Service Layer
 * จำลองการทำงานของ REST API (Backend)
 * 
 * Senior Programmer Notes:
 * - ใช้ mockStorage.js ในการอ่าน/เขียนข้อมูล
 * - จำลอง Delay เสมือน Network Latency (500-1000ms)
 * - Return Promise เพื่อให้ Frontend ใช้ async/await ได้เหมือนจริง
 */

import { loadMockData, saveMockData } from './mockStorage';

// Helper: Custom ID Generator (instead of uuid)
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Helper จำลอง Network Delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ============================================================================
 * Jobs API (DJ Jobs)
 * ============================================================================
 */

export const getJobs = async () => {
    await delay(500);
    return loadMockData('jobs');
};

export const getJobById = async (id) => {
    await delay(300);
    const jobs = loadMockData('jobs');
    // แปลง ID เป็น string เพื่อเปรียบเทียบ (รองรับทั้ง string และ number)
    return jobs.find(j => String(j.id) === String(id));
};

export const createJob = async (jobData) => {
    await delay(800);
    const jobs = loadMockData('jobs');

    // Generate ID (DJ-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = jobs.length + 1;
    const newId = `DJ-${year}-${String(count).padStart(4, '0')}`;

    // Determine Status & Flow Logic
    let status = 'draft';
    let currentLevel = 0;
    let nextApprover = null;

    // ถ้ามีการไม่ได้ส่งเป็น Draft และมี Flow attached
    if (jobData.status !== 'draft' && jobData.flowSnapshot) {
        status = 'pending_approval';
        currentLevel = 1;

        // Find Level 1 Approver
        const level1 = jobData.flowSnapshot.levels.find(l => l.level === 1);
        if (level1) {
            nextApprover = level1.userId; // Mock logic (should handle role mapping)
        }
    }

    // สร้าง Job Object ใหม่
    const newJob = {
        id: newId,
        ...jobData,
        status: status,
        currentLevel: currentLevel,
        currentApproverId: nextApprover,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [
            {
                action: 'created',
                by: jobData.requesterName || 'System',
                timestamp: new Date().toISOString(),
                detail: 'Created new job'
            }
        ]
    };

    // บันทึกลง Storage
    jobs.unshift(newJob); // เพิ่มต้น array
    saveMockData('jobs', jobs);

    return newJob;
};



export const updateJob = async (id, updateData) => {
    await delay(500);
    const jobs = loadMockData('jobs');
    // แปลง ID เป็น string เพื่อเปรียบเทียบ (รองรับทั้ง string และ number)
    const index = jobs.findIndex(j => String(j.id) === String(id));

    if (index === -1) throw new Error('Job not found');

    const updatedJob = {
        ...jobs[index],
        ...updateData,
        updatedAt: new Date().toISOString()
    };

    jobs[index] = updatedJob;
    saveMockData('jobs', jobs);

    return updatedJob;
};

export const approveJob = async (jobId, approverName = 'Approver') => {
    await delay(500);
    const jobs = loadMockData('jobs');
    const index = jobs.findIndex(j => j.id === jobId);
    if (index === -1) throw new Error('Job not found');

    const job = jobs[index];
    let updates = {};

    // Check Flow
    if (job.status === 'pending_approval' && job.flowSnapshot) {
        const currentLevel = job.currentLevel;
        const totalLevels = job.flowSnapshot.levels.length;

        if (currentLevel < totalLevels) {
            // Move to Next Level
            const nextLevel = currentLevel + 1;
            const nextApprover = job.flowSnapshot.levels.find(l => l.level === nextLevel);
            updates = {
                currentLevel: nextLevel,
                currentApproverId: nextApprover ? nextApprover.userId : null,
                status: 'pending_approval'
            };
        } else {
            // Finished Approval -> Assign
            updates = {
                status: 'approved',
                currentLevel: currentLevel + 1, // Past last level
                currentApproverId: job.flowSnapshot.defaultAssignee?.userId || null,
                assignedTo: job.flowSnapshot.defaultAssignee?.userId // Add explicit field
            };
        }
    } else {
        // Fallback or Manual Approve without Flow
        updates = { status: 'approved' };
    }

    // Update Timeline
    const newTimeline = [
        ...job.timeline || [],
        {
            action: 'approved',
            by: approverName,
            timestamp: new Date().toISOString(),
            detail: `Approved Level ${job.currentLevel || 0}`
        }
    ];

    const updatedJob = { ...job, ...updates, timeline: newTimeline, updatedAt: new Date().toISOString() };
    jobs[index] = updatedJob;
    saveMockData('jobs', jobs);
    return updatedJob;
};

export const rejectJob = async (jobId, reason, type = 'return', approverName = 'Approver') => {
    await delay(500);
    const jobs = loadMockData('jobs');
    const index = jobs.findIndex(j => j.id === jobId);
    if (index === -1) throw new Error('Job not found');

    const job = jobs[index];
    // type: 'return' (กลับไปแก้) หรือ 'reject' (ไม่อนุมัติ/ยกเลิก)
    const newStatus = type === 'return' ? 'returned' : 'rejected';

    const updatedJob = {
        ...job,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        timeline: [
            ...job.timeline || [],
            {
                action: type,
                by: approverName,
                timestamp: new Date().toISOString(),
                detail: `Reason: ${reason}`
            }
        ]
    };

    jobs[index] = updatedJob;
    saveMockData('jobs', jobs);
    return updatedJob;
};

/**
 * ============================================================================
 * Master Data API (Dropdowns)
 * ============================================================================
 */

/**
 * ============================================================================
 * Master Data API (Dropdowns & CRUD)
 * ============================================================================
 */

export const getMasterData = async () => {
    await delay(200);
    return {
        tenants: loadMockData('tenants'),
        projects: loadMockData('projects'),
        jobTypes: loadMockData('jobTypes'),
        buds: loadMockData('buds')
    };
};

// --- Job Types CRUD ---
export const getJobTypes = async () => {
    await delay(300);
    return loadMockData('jobTypes');
};

export const createJobType = async (data) => {
    await delay(500);
    const jobTypes = loadMockData('jobTypes');
    const newJobType = { id: generateId(), ...data, status: 'active' };
    jobTypes.push(newJobType);
    saveMockData('jobTypes', jobTypes);
    return newJobType;
};

export const updateJobType = async (id, data) => {
    await delay(500);
    const jobTypes = loadMockData('jobTypes');
    const index = jobTypes.findIndex(t => t.id === id);
    if (index !== -1) {
        jobTypes[index] = { ...jobTypes[index], ...data };
        saveMockData('jobTypes', jobTypes);
        return jobTypes[index];
    }
    throw new Error('Job Type not found');
};

export const deleteJobType = async (id) => {
    await delay(500);
    let jobTypes = loadMockData('jobTypes');
    jobTypes = jobTypes.filter(t => t.id !== id);
    saveMockData('jobTypes', jobTypes);
    return true;
};

// --- Projects CRUD ---
export const getProjects = async () => {
    await delay(300);
    return loadMockData('projects');
};

export const createProject = async (data) => {
    await delay(500);
    const projects = loadMockData('projects');
    // Auto specific BUD based on logic or selection (Simulate)
    const newProject = { id: generateId(), ...data, status: 'Active' };
    projects.push(newProject);
    saveMockData('projects', projects);
    return newProject;
};

export const updateProject = async (id, data) => {
    await delay(500);
    const projects = loadMockData('projects');
    const index = projects.findIndex(p => p.id === id);
    if (index !== -1) {
        projects[index] = { ...projects[index], ...data };
        saveMockData('projects', projects);
        return projects[index];
    }
    throw new Error('Project not found');
};

export const deleteProject = async (id) => {
    await delay(500);
    let projects = loadMockData('projects');
    projects = projects.filter(p => p.id !== id);
    saveMockData('projects', projects);
    return true;
};

// --- Tenants CRUD ---
export const getTenants = async () => {
    await delay(300);
    return loadMockData('tenants');
};

export const createTenant = async (data) => {
    await delay(500);
    const tenants = loadMockData('tenants');
    const newTenant = { id: generateId(), ...data, isActive: true };
    tenants.push(newTenant);
    saveMockData('tenants', tenants);
    return newTenant;
};

export const updateTenant = async (id, data) => {
    await delay(500);
    const tenants = loadMockData('tenants');
    const index = tenants.findIndex(t => t.id === id);
    if (index !== -1) {
        tenants[index] = { ...tenants[index], ...data };
        saveMockData('tenants', tenants);
        return tenants[index];
    }
    throw new Error('Tenant not found');
};

export const deleteTenant = async (id) => {
    await delay(500);
    let tenants = loadMockData('tenants');
    tenants = tenants.filter(t => t.id !== id);
    saveMockData('tenants', tenants);
    return true;
};

// --- BUDs CRUD ---
export const getBuds = async () => {
    await delay(300);
    return loadMockData('buds');
};

export const createBud = async (data) => {
    await delay(500);
    const buds = loadMockData('buds');
    const newBud = { id: generateId(), ...data, isActive: true };
    buds.push(newBud);
    saveMockData('buds', buds);
    return newBud;
};

export const updateBud = async (id, data) => {
    await delay(500);
    const buds = loadMockData('buds');
    const index = buds.findIndex(b => b.id === id);
    if (index !== -1) {
        buds[index] = { ...buds[index], ...data };
        saveMockData('buds', buds);
        return buds[index];
    }
    throw new Error('BUD not found');
};

export const deleteBud = async (id) => {
    await delay(500);
    let buds = loadMockData('buds');
    buds = buds.filter(b => b.id !== id);
    saveMockData('buds', buds);
    return true;
};

// --- Holidays CRUD ---
export const getHolidays = async () => {
    await delay(300);
    return loadMockData('holidays');
};

export const addHoliday = async (data) => {
    await delay(500);
    const holidays = loadMockData('holidays');
    const newHoliday = {
        id: generateId(),
        ...data,
        createdAt: new Date().toISOString()
    };
    holidays.push(newHoliday);
    saveMockData('holidays', holidays);
    return newHoliday;
};

export const updateHoliday = async (id, data) => {
    await delay(500);
    const holidays = loadMockData('holidays');
    const index = holidays.findIndex(h => h.id === id);
    if (index !== -1) {
        holidays[index] = { ...holidays[index], ...data };
        saveMockData('holidays', holidays);
        return holidays[index];
    }
    throw new Error('Holiday not found');
};

export const deleteHoliday = async (id) => {
    await delay(500);
    let holidays = loadMockData('holidays');
    holidays = holidays.filter(h => h.id !== id);
    saveMockData('holidays', holidays);
    return true;
};

/**
 * ============================================================================
 * Approval Flow API (CRUD)
 * ============================================================================
 */

// ดึง Approval Flows ทั้งหมด
export const getApprovalFlows = async () => {
    await delay(300);
    return loadMockData('approvalFlows');
};

// ดึง Approval Flow ตาม Project ID
// ดึง Approval Flow ตาม Project ID หรือ Name
export const getApprovalFlowByProject = async (projectIdentifier) => {
    await delay(300);
    const flows = loadMockData('approvalFlows');

    // ค้นหา Flow ที่ Project Name ตรงกัน (Case Insensitive) หรือ Project ID ตรงกัน
    const flow = flows.find(f =>
        f.projectName?.toLowerCase() === projectIdentifier?.toLowerCase() ||
        f.projectId === projectIdentifier
    );

    return flow || null;
};

// สร้าง Approval Flow ใหม่
export const createApprovalFlow = async (data) => {
    await delay(500);
    const flows = loadMockData('approvalFlows');
    const newFlow = {
        id: generateId(),
        ...data,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    flows.push(newFlow);
    saveMockData('approvalFlows', flows);
    return newFlow;
};

// อัปเดต Approval Flow
export const updateApprovalFlow = async (id, data) => {
    await delay(500);
    const flows = loadMockData('approvalFlows');
    const index = flows.findIndex(f => f.id === id);
    if (index !== -1) {
        flows[index] = { ...flows[index], ...data, updatedAt: new Date().toISOString() };
        saveMockData('approvalFlows', flows);
        return flows[index];
    }
    throw new Error('Approval Flow not found');
};

// ลบ Approval Flow
export const deleteApprovalFlow = async (id) => {
    await delay(500);
    let flows = loadMockData('approvalFlows');
    flows = flows.filter(f => f.id !== id);
    saveMockData('approvalFlows', flows);
    return true;
};





/**
 * ============================================================================
 * User Management API (CRUD)
 * ============================================================================
 */

export const getUsers = async () => {
    await delay(300);
    return loadMockData('users');
};

export const createUser = async (userData) => {
    await delay(500);
    const users = loadMockData('users');

    // Check for duplicate email
    if (users.some(u => u.email === userData.email)) {
        throw new Error('Email already exists');
    }

    const newUser = {
        id: generateId(),
        ...userData,
        createdAt: new Date().toISOString(),
        isActive: true
    };

    users.push(newUser);
    saveMockData('users', users);
    return newUser;
};

export const updateUser = async (id, updateData) => {
    await delay(500);
    const users = loadMockData('users');
    const index = users.findIndex(u => u.id === id);

    if (index === -1) throw new Error('User not found');

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== users[index].email) {
        if (users.some(u => u.id !== id && u.email === updateData.email)) {
            throw new Error('Email already exists');
        }
    }

    const updatedUser = {
        ...users[index],
        ...updateData,
        updatedAt: new Date().toISOString()
    };

    users[index] = updatedUser;
    saveMockData('users', users);
    return updatedUser;
};

export const deleteUser = async (id) => {
    await delay(500);
    let users = loadMockData('users');
    users = users.filter(u => u.id !== id);
    saveMockData('users', users);
    return true;
};

/**
 * ============================================================================
 * User API (สำหรับ Auth)
 * ============================================================================
 */

export const getUserByRole = async (role) => {
    await delay(300);
    const users = loadMockData('users');
    // ค้นหา user ที่มี role ที่ต้องการ
    const user = users.find(u => u.roles?.includes(role));
    return user || null;
};

export const login = async (email) => {
    await delay(300);
    const users = loadMockData('users');
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('User not found');
    return user;
};


/**
 * ============================================================================
 * Dashboard & Assignment API
 * ============================================================================
 */

export const getDashboardStats = async () => {
    await delay(300);
    const jobs = loadMockData('jobs');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    // คำนวณสถิติ
    let newToday = 0;
    let dueTomorrow = 0;
    let dueToday = 0;
    let overdue = 0;

    jobs.forEach(job => {
        // New Today - สร้างวันนี้
        const createdAt = new Date(job.createdAt);
        createdAt.setHours(0, 0, 0, 0);
        if (createdAt.getTime() === today.getTime()) {
            newToday++;
        }

        // Overdue - ใช้ field isOverdue จาก job data โดยตรง
        if (job.isOverdue) {
            overdue++;
        }

        // Due calculations - ใช้ deadline
        if (job.deadline && !job.isOverdue) {
            const dueDate = new Date(job.deadline);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate.getTime() === today.getTime()) {
                dueToday++;
            } else if (dueDate.getTime() === tomorrow.getTime()) {
                dueTomorrow++;
            }
        }
    });

    return {
        newToday,
        dueTomorrow,
        dueToday,
        overdue,
        // Legacy fields for compatibility
        totalJobs: jobs.length,
        pending: jobs.filter(j => j.status === 'pending_approval' || j.status === 'draft').length,
        approved: jobs.filter(j => j.status === 'approved').length,
        rejected: jobs.filter(j => j.status === 'rejected' || j.status === 'returned').length
    };
};

// ดึงงานตาม Role ของ User
// - Approver: เห็นงานที่รออนุมัติ (pending_approval)
// - User/Marketing: เห็นงานที่ตัวเองสร้าง
// - Admin: เห็นทั้งหมด
export const getJobsByRole = async (user) => {
    await delay(300);
    const jobs = loadMockData('jobs');

    if (!user || !user.roles) return [];

    // Admin เห็นทั้งหมด
    if (user.roles.includes('Admin')) {
        return jobs;
    }

    // Approver เห็นงานที่รออนุมัติ
    if (user.roles.includes('Approver')) {
        return jobs.filter(j =>
            j.status === 'pending_approval' &&
            (j.currentApproverId === user.id || !j.currentApproverId)
        );
    }

    // User/Marketing เห็นงานที่ตัวเองสร้าง
    return jobs.filter(j => j.requesterId === user.id || j.requesterName === user.displayName);
};

export const assignJob = async (jobId, assigneeData) => {
    await delay(500);
    const jobs = loadMockData('jobs');
    const index = jobs.findIndex(j => j.id === jobId);
    if (index === -1) throw new Error('Job not found');

    const job = jobs[index];
    const updatedJob = {
        ...job,
        assignee: assigneeData,
        updatedAt: new Date().toISOString()
    };

    jobs[index] = updatedJob;
    saveMockData('jobs', jobs);
    return updatedJob;
};

/**
 * ============================================================================
 * Export as Service Object
 * ============================================================================
 */
export const mockApiService = {
    getJobs,
    getJobById,
    createJob,
    updateJob,
    getDashboardStats,
    getJobsByRole,

    // Master Data
    getMasterData,
    getJobTypes,
    createJobType,
    updateJobType,
    deleteJobType,
    getProjects,
    createProject,
    updateProject,
    deleteProject,

    // Tenants & BUDs
    getTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    getBuds,
    createBud,
    updateBud,
    deleteBud,

    getHolidays,
    addHoliday,
    updateHoliday,
    deleteHoliday,

    // Approval Flows
    getApprovalFlows,
    getApprovalFlowByProject,
    createApprovalFlow,
    updateApprovalFlow,
    deleteApprovalFlow,

    // Job Approval Actions
    approveJob,
    rejectJob,
    assignJob,

    // User Management
    getUsers,
    createUser,
    updateUser,
    deleteUser,

    // Auth
    getUserByRole,
    login
};

export default mockApiService;
