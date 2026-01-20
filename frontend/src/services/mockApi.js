/**
 * @file mockApi.js
 * @description เลเยอร์บริการจำลอง API (Mock API Service Layer)
 * 
 * วัตถุประสงค์หลัก:
 * - จำลองการทำงานของ RESTful API สำหรับระบบ Frontend
 * - รองรับระบบแยกข้อมูลตามบริษัท (Multi-tenant Isolation) โดยใช้ tenantId
 * - จัดการข้อมูลงาน (Jobs), ข้อมูลพื้นฐาน (Master Data), และการจัดการผู้ใช้ (User Management)
 */

import { loadMockData, saveMockData } from './mockStorage';

// ============================================
// Helpers - ฟังก์ชันช่วยเหลือ
// ============================================

/**
 * ดึง ID ของบริษัท (Tenant) ของผู้ใช้ที่กำลังใช้งานอยู่จาก Auth Store
 * @returns {number} tenantId (ค่าเริ่มต้นจะเป็น 1 สำหรับการสาธิต)
 */
const getCurrentTenantId = () => {
    try {
        const authStore = JSON.parse(localStorage.getItem('dj-auth-storage'))?.state;
        return authStore?.user?.tenantId || 1;
    } catch (e) {
        return 1;
    }
};

/** สร้าง ID แบบสุ่มสำหรับข้อมูลใหม่ */
const generateId = () => Math.random().toString(36).substring(2, 15);

/** จำลองระยะเวลาการทำงานของเครือข่าย (Network Delay) */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ดึงรายการงานทั้งหมดที่ผู้ใช้มีสิทธิ์เข้าถึง (อ้างอิงตาม Tenant และการมอบหมายงาน)
 * @returns {Promise<Array>} รายการงานที่ผ่านการกรองแล้ว
 */
export const getJobs = async () => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const allJobs = loadMockData('jobs');
    const user = JSON.parse(localStorage.getItem('dj-auth-storage'))?.state?.user;

    // กรองข้อมูล: แสดงงานของบริษัทตนเอง หรือ งานที่ได้รับมอบหมายมาโดยตรง (ข้ามบริษัท)
    return allJobs.filter(j => {
        const isMyTenant = j.tenantId === tenantId;
        const isAssignedToMe = String(j.assigneeId) === String(user?.id) ||
            String(j.flowSnapshot?.defaultAssignee?.userId) === String(user?.id);
        return isMyTenant || isAssignedToMe;
    });
};

/**
 * ดึงข้อมูลงานตาม ID ที่ระบุ
 * @param {string|number} id - รหัสงาน (Internal ID)
 * @returns {Promise<Object>} ข้อมูลงาน
 */
export const getJobById = async (id) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const jobs = loadMockData('jobs');
    return jobs.find(j => String(j.id) === String(id) && j.tenantId === tenantId);
};

/**
 * สร้างงาน DJ ใหม่ พร้อมรันลำดับ DJ ID และตรวจสอบ Flow การอนุมัติเบื้องต้น
 * @param {Object} jobData - ข้อมูลงานที่จะสร้าง
 * @returns {Promise<Object>} ข้อมูลงานที่สร้างสำเร็จ
 */
export const createJob = async (jobData) => {
    await delay(800);
    const tenantId = getCurrentTenantId();
    const jobs = loadMockData('jobs');

    // สร้างรูปแบบหมายเลข DJ (Format: DJ-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = jobs.filter(j => j.tenantId === tenantId).length + 1;
    const djId = `DJ-${year}-${String(count).padStart(4, '0')}`;

    // ตรรกะสถานะงานเริ่มต้น (Work Flow Logic)
    let status = 'draft';
    let currentLevel = 0;
    let nextApprover = null;

    if (jobData.status !== 'draft' && jobData.flowSnapshot) {
        status = 'pending_approval';
        currentLevel = 1;
        const level1 = jobData.flowSnapshot.levels.find(l => l.level === 1);
        if (level1) {
            nextApprover = level1.approvers?.[0]?.userId || level1.userId;
        }
    }

    const newJob = {
        id: generateId(),
        tenantId: tenantId,
        djId: djId,
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
                detail: 'สร้างงานใหม่เข้าระบบ'
            }
        ]
    };

    jobs.unshift(newJob);
    saveMockData('jobs', jobs);
    return newJob;
};

export const updateJob = async (id, updateData) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const jobs = loadMockData('jobs');
    const index = jobs.findIndex(j => String(j.id) === String(id) && j.tenantId === tenantId);

    if (index === -1) throw new Error('Job not found in your tenant');

    const updatedJob = {
        ...jobs[index],
        ...updateData,
        updatedAt: new Date().toISOString()
    };

    jobs[index] = updatedJob;
    saveMockData('jobs', jobs);
    return updatedJob;
};

/**
 * ============================================================================
 * Master Data API - กรองตาม Tenant
 * ============================================================================
 */

export const getMasterData = async () => {
    await delay(200);
    const tenantId = getCurrentTenantId();

    // กรอง Master Data ทุกอย่างตาม Tenant
    return {
        tenants: loadMockData('tenants').filter(t => t.id === tenantId),
        projects: loadMockData('projects').filter(p => p.tenantId === tenantId),
        jobTypes: loadMockData('jobTypes').filter(jt => jt.tenantId === tenantId),
        buds: loadMockData('buds').filter(b => b.tenantId === tenantId)
    };
};

// --- Job Types ---
export const getJobTypes = async () => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    return loadMockData('jobTypes').filter(t => t.tenantId === tenantId);
};

export const createJobType = async (data) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const jobTypes = loadMockData('jobTypes');
    const newJobType = { id: generateId(), tenantId, ...data, status: 'active' };
    jobTypes.push(newJobType);
    saveMockData('jobTypes', jobTypes);
    return newJobType;
};

// --- Projects ---
export const getProjects = async () => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    return loadMockData('projects').filter(p => p.tenantId === tenantId);
};

export const createProject = async (data) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const projects = loadMockData('projects');
    const newProject = { id: generateId(), tenantId, ...data, status: 'Active' };
    projects.push(newProject);
    saveMockData('projects', projects);
    return newProject;
};

export const updateProject = async (id, updateData) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const projects = loadMockData('projects');
    const index = projects.findIndex(p => String(p.id) === String(id) && p.tenantId === tenantId);
    if (index === -1) throw new Error('Project not found');

    projects[index] = { ...projects[index], ...updateData };
    saveMockData('projects', projects);
    return projects[index];
};

export const deleteProject = async (id) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const projects = loadMockData('projects');
    const newProjects = projects.filter(p => !(String(p.id) === String(id) && p.tenantId === tenantId));

    if (projects.length === newProjects.length) throw new Error('Project not found');

    saveMockData('projects', newProjects);
    return true;
};

// --- BUDs (Business Units) ---
export const getBuds = async () => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    return loadMockData('buds').filter(b => b.tenantId === tenantId);
};

export const createBud = async (data) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const buds = loadMockData('buds');
    const newBud = { id: generateId(), tenantId, ...data, isActive: true };
    buds.push(newBud);
    saveMockData('buds', buds);
    return newBud;
};

export const updateBud = async (id, updateData) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const buds = loadMockData('buds');
    const index = buds.findIndex(b => String(b.id) === String(id) && b.tenantId === tenantId);
    if (index === -1) throw new Error('BUD not found');

    buds[index] = { ...buds[index], ...updateData };
    saveMockData('buds', buds);
    return buds[index];
};

export const deleteBud = async (id) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const buds = loadMockData('buds');
    const newBuds = buds.filter(b => !(String(b.id) === String(id) && b.tenantId === tenantId));

    if (buds.length === newBuds.length) throw new Error('BUD not found');

    saveMockData('buds', newBuds);
    return true;
};

// --- Tenants (ข้อมูลบริษัท) ---
export const getTenants = async () => {
    await delay(300);
    // ในสถานการณ์จริง Admin อาจจะเห็นทุก Tenant แต่ใน Demo ให้เห็นแค่ของตัวเองก่อน หรือทั้งหมดถ้าเป็น Super Admin
    // แต่เพื่อให้เมนู Organization Management ทำงานได้เหมือน Multi-tenant setup เราจะคืนค่าทั้งหมดที่มีใน Mock Data
    // ถือว่า User คนนี้เป็น Admin ที่จัดการได้ทุกบริษัทใน Demo นี้
    return loadMockData('tenants');
};

export const createTenant = async (data) => {
    await delay(500);
    const tenants = loadMockData('tenants');
    // สร้าง Tenant ใช้ ID เป็นตัวเลขเพื่อให้ง่าย (หรือจะใช้ generateId ก็ได้)
    const newId = Math.max(...tenants.map(t => t.id), 0) + 1;
    const newTenant = { id: newId, ...data, isActive: true };
    tenants.push(newTenant);
    saveMockData('tenants', tenants);
    return newTenant;
};

export const updateTenant = async (id, updateData) => {
    await delay(500);
    const tenants = loadMockData('tenants');
    const index = tenants.findIndex(t => String(t.id) === String(id));
    if (index === -1) throw new Error('Tenant not found');

    tenants[index] = { ...tenants[index], ...updateData };
    saveMockData('tenants', tenants);
    return tenants[index];
};

export const deleteTenant = async (id) => {
    await delay(300);
    const tenants = loadMockData('tenants');
    const newTenants = tenants.filter(t => String(t.id) !== String(id));

    if (tenants.length === newTenants.length) throw new Error('Tenant not found');

    saveMockData('tenants', newTenants);
    return true;
};

// --- Departments (แผนกย่อย) ---
/**
 * ดึงรายการแผนกย่อยทั้งหมด กรองตาม Tenant
 * @returns {Promise<Array>} รายการแผนกย่อย
 */
export const getDepartments = async () => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    return loadMockData('departments').filter(d => d.tenantId === tenantId);
};

/**
 * สร้างแผนกย่อยใหม่
 * @param {Object} data - ข้อมูลแผนก { name, code, budId, managerId }
 * @returns {Promise<Object>} แผนกที่สร้างใหม่
 */
export const createDepartment = async (data) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const departments = loadMockData('departments');
    const newId = Math.max(...departments.map(d => d.id), 0) + 1;
    const newDepartment = { id: newId, tenantId, ...data, isActive: true };
    departments.push(newDepartment);
    saveMockData('departments', departments);
    return newDepartment;
};

/**
 * อัปเดตข้อมูลแผนกย่อย
 * @param {number} id - รหัสแผนก
 * @param {Object} updateData - ข้อมูลที่ต้องการแก้ไข
 * @returns {Promise<Object>} แผนกที่อัปเดตแล้ว
 */
export const updateDepartment = async (id, updateData) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const departments = loadMockData('departments');
    const index = departments.findIndex(d => String(d.id) === String(id) && d.tenantId === tenantId);
    if (index === -1) throw new Error('Department not found');

    departments[index] = { ...departments[index], ...updateData };
    saveMockData('departments', departments);
    return departments[index];
};

/**
 * ลบแผนกย่อย
 * @param {number} id - รหัสแผนกที่ต้องการลบ
 * @returns {Promise<boolean>} true ถ้าลบสำเร็จ
 */
export const deleteDepartment = async (id) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const departments = loadMockData('departments');
    const newDepartments = departments.filter(d => !(String(d.id) === String(id) && d.tenantId === tenantId));

    if (departments.length === newDepartments.length) throw new Error('Department not found');

    saveMockData('departments', newDepartments);
    return true;
};

// --- Job Type Items (รายการชิ้นงานย่อย) ---
/**
 * ดึงรายการชิ้นงานย่อยตาม Job Type ID
 * @param {number} jobTypeId - รหัสประเภทงาน
 * @returns {Promise<Array>} รายการชิ้นงานย่อย
 */
export const getJobTypeItems = async (jobTypeId) => {
    await delay(200);
    const items = loadMockData('jobTypeItems');
    if (jobTypeId) {
        return items.filter(item => item.jobTypeId === Number(jobTypeId));
    }
    return items;
};

/**
 * เพิ่มรายการชิ้นงานย่อยใหม่ใน Job Type
 * @param {Object} data - ข้อมูล { jobTypeId, name, defaultSize, isRequired }
 * @returns {Promise<Object>} รายการที่สร้างใหม่
 */
export const createJobTypeItem = async (data) => {
    await delay(400);
    const items = loadMockData('jobTypeItems');
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    const newItem = { id: newId, ...data, isRequired: data.isRequired || false };
    items.push(newItem);
    saveMockData('jobTypeItems', items);
    return newItem;
};

/**
 * ลบรายการชิ้นงานย่อย
 * @param {number} itemId - รหัสรายการ
 * @returns {Promise<boolean>} true ถ้าลบสำเร็จ
 */
export const deleteJobTypeItem = async (itemId) => {
    await delay(300);
    const items = loadMockData('jobTypeItems');
    const newItems = items.filter(i => String(i.id) !== String(itemId));

    if (items.length === newItems.length) throw new Error('Item not found');

    saveMockData('jobTypeItems', newItems);
    return true;
};

// --- Holidays ---
export const getHolidays = async () => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    return loadMockData('holidays').filter(h => h.tenantId === tenantId);
};

/**
 * เพิ่มวันหยุดใหม่
 * @param {Object} holidayData - ข้อมูลวันหยุด
 * @returns {Promise<Object>} วันหยุดที่สร้างใหม่
 */
export const addHoliday = async (holidayData) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const holidays = loadMockData('holidays');
    const newHoliday = {
        id: generateId(),
        tenantId,
        ...holidayData,
        createdAt: new Date().toISOString()
    };
    holidays.push(newHoliday);
    saveMockData('holidays', holidays);
    return newHoliday;
};

/**
 * แก้ไขข้อมูลวันหยุด
 * @param {string} id - รหัสวันหยุด
 * @param {Object} updateData - ข้อมูลที่ต้องการแก้ไข
 * @returns {Promise<Object>} วันหยุดที่แก้ไขแล้ว
 */
export const updateHoliday = async (id, updateData) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const holidays = loadMockData('holidays');
    const index = holidays.findIndex(h => String(h.id) === String(id) && h.tenantId === tenantId);
    if (index === -1) throw new Error('Holiday not found');
    holidays[index] = { ...holidays[index], ...updateData, updatedAt: new Date().toISOString() };
    saveMockData('holidays', holidays);
    return holidays[index];
};

/**
 * ลบวันหยุด
 * @param {string} id - รหัสวันหยุดที่ต้องการลบ
 * @returns {Promise<boolean>} true ถ้าลบสำเร็จ
 */
export const deleteHoliday = async (id) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const holidays = loadMockData('holidays');
    const index = holidays.findIndex(h => String(h.id) === String(id) && h.tenantId === tenantId);
    if (index === -1) throw new Error('Holiday not found');
    holidays.splice(index, 1);
    saveMockData('holidays', holidays);
    return true;
};

/**
 * ============================================================================
 * Approval Flow API
 * ============================================================================
 */

export const getApprovalFlows = async () => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    return loadMockData('approvalFlows').filter(f => f.tenantId === tenantId);
};

export const getApprovalFlowByProject = async (projectIdentifier) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const flows = loadMockData('approvalFlows').filter(f => f.tenantId === tenantId);

    return flows.find(f =>
        f.projectName?.toLowerCase() === String(projectIdentifier).toLowerCase() ||
        String(f.projectId) === String(projectIdentifier)
    ) || null;
};

/**
 * ============================================================================
 * User Management API
 * ============================================================================
 */

export const getUsers = async () => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    return loadMockData('users').filter(u => u.tenantId === tenantId);
};

/**
 * ดึงผู้ใช้ทั้งหมด (ไม่กรอง Tenant) - สำหรับหน้า Login
 * @returns {Promise<Array>} รายชื่อผู้ใช้ทั้งหมด
 */
export const getAllUsersForLogin = async () => {
    await delay(300);
    return loadMockData('users'); // ไม่กรอง tenant เพื่อให้เลือก user ได้ทุกคน
};

export const createUser = async (userData) => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const users = loadMockData('users');

    if (users.some(u => u.email === userData.email && u.tenantId === tenantId)) {
        throw new Error('Email already exists in this organization');
    }

    const newUser = {
        id: generateId(),
        tenantId: tenantId,
        ...userData,
        createdAt: new Date().toISOString(),
        isActive: true
    };

    users.push(newUser);
    saveMockData('users', users);
    return newUser;
};

/**
 * แก้ไขข้อมูลผู้ใช้
 * @param {string} id - รหัสผู้ใช้
 * @param {Object} updateData - ข้อมูลที่ต้องการแก้ไข
 * @returns {Promise<Object>} ผู้ใช้ที่แก้ไขแล้ว
 */
export const updateUser = async (id, updateData) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const users = loadMockData('users');
    const index = users.findIndex(u => String(u.id) === String(id) && u.tenantId === tenantId);
    if (index === -1) throw new Error('User not found');
    users[index] = { ...users[index], ...updateData, updatedAt: new Date().toISOString() };
    saveMockData('users', users);
    return users[index];
};

/**
 * ลบผู้ใช้
 * @param {string} id - รหัสผู้ใช้ที่ต้องการลบ
 * @returns {Promise<boolean>} true ถ้าลบสำเร็จ
 */
export const deleteUser = async (id) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const users = loadMockData('users');
    const index = users.findIndex(u => String(u.id) === String(id) && u.tenantId === tenantId);
    if (index === -1) throw new Error('User not found');
    users.splice(index, 1);
    saveMockData('users', users);
    return true;
};

/**
 * ============================================================================
 * Dashboard & Assignment - กรองตาม Tenant
 * ============================================================================
 */

export const getDashboardStats = async () => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const jobs = loadMockData('jobs').filter(j => j.tenantId === tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newToday = 0;
    let dueToday = 0;
    let overdue = 0;

    jobs.forEach(job => {
        const createdAt = new Date(job.createdAt);
        createdAt.setHours(0, 0, 0, 0);
        if (createdAt.getTime() === today.getTime()) newToday++;
        if (job.isOverdue) overdue++;
        if (job.deadline) {
            const dueDate = new Date(job.deadline);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate.getTime() === today.getTime()) dueToday++;
        }
    });

    return {
        newToday,
        dueToday,
        overdue,
        totalJobs: jobs.length,
        pending: jobs.filter(j => j.status === 'pending_approval').length,
    };
};

export const getJobsByRole = async (user) => {
    await delay(300);
    const tenantId = getCurrentTenantId();
    const allJobs = loadMockData('jobs');

    if (!user || !user.roles) return [];

    // Filter logic: งานของบริษัทตัวเอง หรือ งานที่ Assign มาให้ฉันข้ามบริษัท
    const myAccessJobs = allJobs.filter(j => {
        const isMyTenant = j.tenantId === tenantId;
        const isAssignedToMe = String(j.assigneeId) === String(user.id) ||
            String(j.flowSnapshot?.defaultAssignee?.userId) === String(user.id);
        return isMyTenant || isAssignedToMe;
    });

    // Admin เห็นทั้งหมดที่เข้าถึงได้
    if (user.roles.includes('admin')) return myAccessJobs;

    // Approver เห็นงานที่รออนุมัติของตัวเอง
    if (user.roles.includes('approver')) {
        return myAccessJobs.filter(j => {
            if (j.status !== 'pending_approval') return false;
            const currentLevelData = j.flowSnapshot?.levels?.find(l => l.level === j.currentLevel);
            if (currentLevelData?.approvers) {
                return currentLevelData.approvers.some(a => String(a.userId) === String(user.id));
            }
            return String(currentLevelData?.userId) === String(user.id) || String(j.currentApproverId) === String(user.id);
        });
    }

    // Assignee เห็นงานที่ตัวเองรับผิดชอบ
    if (user.roles.includes('assignee')) {
        return myAccessJobs.filter(j =>
            String(j.assigneeId) === String(user.id) ||
            String(j.flowSnapshot?.defaultAssignee?.userId) === String(user.id)
        );
    }

    // Requester เห็นงานที่ตัวเองสร้าง
    return myAccessJobs.filter(j => String(j.requesterId) === String(user.id));
};

// Export fallback for compatibility
export const approveJob = async (jobId, approverName = 'Approver') => {
    // ... logic เดิมที่ปรับให้รองรับ tenantId ภายใน index ...
    await delay(500);
    const tenantId = getCurrentTenantId();
    const jobs = loadMockData('jobs');
    const index = jobs.findIndex(j => String(j.id) === String(jobId) && j.tenantId === tenantId);
    if (index === -1) throw new Error('Job not found');

    const job = jobs[index];
    // Simple logic update
    const updatedJob = { ...job, status: 'approved', updatedAt: new Date().toISOString() };
    jobs[index] = updatedJob;
    saveMockData('jobs', jobs);
    return updatedJob;
};

/**
 * ปฏิเสธหรือส่งกลับงานให้แก้ไข
 * @param {string} jobId - รหัสงาน
 * @param {string} reason - เหตุผลในการปฏิเสธ
 * @param {string} type - ประเภทการปฏิเสธ ('return' ส่งกลับแก้ไข, 'reject' ปฏิเสธถาวร)
 * @param {string} approverName - ชื่อผู้ปฏิเสธ
 * @returns {Promise<Object>} ข้อมูลงานที่อัปเดตแล้ว
 */
export const rejectJob = async (jobId, reason, type = 'return', approverName = 'Approver') => {
    await delay(500);
    const tenantId = getCurrentTenantId();
    const jobs = loadMockData('jobs');
    const index = jobs.findIndex(j => String(j.id) === String(jobId) && j.tenantId === tenantId);

    if (index === -1) throw new Error('Job not found');

    const job = jobs[index];

    // กำหนดสถานะตามประเภทการปฏิเสธ
    const newStatus = type === 'reject' ? 'rejected' : 'rework';

    const updatedJob = {
        ...job,
        status: newStatus,
        currentLevel: type === 'return' ? 0 : job.currentLevel, // ส่งกลับเริ่มต้นใหม่
        updatedAt: new Date().toISOString(),
        timeline: [
            ...(job.timeline || []),
            {
                action: type === 'reject' ? 'rejected' : 'returned',
                by: approverName,
                timestamp: new Date().toISOString(),
                detail: reason
            }
        ]
    };

    jobs[index] = updatedJob;
    saveMockData('jobs', jobs);
    return updatedJob;
};

export const mockApiService = {
    getJobs,
    getJobById,
    createJob,
    updateJob,
    getDashboardStats,
    getJobsByRole,
    getMasterData,
    getJobTypes,
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    getTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    getBuds,
    createBud,
    updateBud,
    deleteBud,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getJobTypeItems,
    createJobTypeItem,
    deleteJobTypeItem,
    getHolidays,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    getApprovalFlows,
    getApprovalFlowByProject,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    approveJob,
    rejectJob,
    login: async (email) => {
        await delay(300);
        const users = loadMockData('users');
        const user = users.find(u => u.email === email);
        if (!user) throw new Error('User not found');
        return user;
    },
    getUserByRole: async (role) => {
        await delay(300);
        // ไม่กรอง tenant สำหรับ Demo เพื่อให้สลับ role ได้ทุกบทบาท
        return loadMockData('users').find(u => u.roles?.includes(role));
    },
    /**
     * ดึงผู้ใช้ทั้งหมด (ไม่กรอง Tenant) - สำหรับหน้า Login
     * @returns {Promise<Array>} รายชื่อผู้ใช้ทั้งหมด
     */
    getAllUsersForLogin: async () => {
        await delay(300);
        return loadMockData('users'); // ไม่กรอง tenant เพื่อให้เลือก user ได้ทุกคน
    }
};

export default mockApiService;
