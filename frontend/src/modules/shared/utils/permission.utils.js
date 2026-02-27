/**
 * @file permission.utils.js
 * @description ฟังก์ชัน Helper สำหรับตรวจสอบสิทธิ์แบบ Multi-Role
 * 
 * รองรับระบบ Multi-Role ที่ User สามารถมีหลาย Roles ได้
 * และแต่ละ Role มี Scope ที่แตกต่างกัน
 * 
 * ตัวอย่างโครงสร้าง User Object:
 * {
 *   id: 5,
 *   email: "john@company.com",
 *   role: "requester",  // ← Legacy field (สำหรับ backward compatibility)
 *   roles: [            // ← ใหม่: array ของ roles พร้อม scopes
 *     {
 *       id: 1,
 *       name: "requester",
 *       isActive: true,
 *       scopes: [
 *         { id: 10, level: "project", scopeId: 1, scopeName: "Project A" }
 *       ]
 *     }
 *   ]
 * }
 */

// ============================================
// Role Constants
// ============================================

export const ROLES = {
    ADMIN: 'Admin',
    REQUESTER: 'Requester',
    APPROVER: 'Approver',
    ASSIGNEE: 'Assignee'
};

export const SCOPE_LEVELS = {
    TENANT: 'tenant',
    BUD: 'bud',
    PROJECT: 'project'
};

// Thai labels for roles (V1 naming: Admin, Requester, Approver, Assignee)
export const ROLE_LABELS = {
    admin: 'ผู้ดูแลระบบ',
    requester: 'ผู้เปิดงาน',
    approver: 'ผู้อนุมัติ',
    assignee: 'ผู้รับงาน',
    // V1 role names (PascalCase - from DB)
    Admin: 'ผู้ดูแลระบบสูงสุด',
    Requester: 'ผู้เปิดงาน',
    Approver: 'ผู้อนุมัติ',
    Assignee: 'ผู้รับงาน',
    // Legacy V2 mapping (backward compatibility)
    SuperAdmin: 'ผู้ดูแลระบบสูงสุด',
    OrgAdmin: 'ผู้เปิดงาน',
    TeamLead: 'ผู้อนุมัติ',
    Member: 'ผู้รับงาน'
};

// Role descriptions
export const ROLE_DESCRIPTIONS = {
    admin: 'จัดการระบบทั้งหมด',
    requester: 'สร้างและติดตามงาน',
    approver: 'อนุมัติงานที่ส่งมา',
    assignee: 'รับและดำเนินการงาน'
};

// Role display mapping (V1 primary, V2 backward compatible)
export const ROLE_V1_DISPLAY = {
    // V1 role names (PascalCase - from DB)
    Admin: 'System Admin',
    Requester: 'Requester',
    Approver: 'Approver',
    Assignee: 'Assignee',
    // V1 role names (lowercase - legacy)
    admin: 'System Admin',
    requester: 'Requester',
    approver: 'Approver',
    assignee: 'Assignee',
    // V2 role names (backward compatibility)
    SuperAdmin: 'System Admin',
    OrgAdmin: 'Requester',
    TeamLead: 'Approver',
    Member: 'Assignee',
    manager: 'Manager',
    user: 'User'
};

// Badge colors for roles (V1 primary, V2 backward compatible)
export const ROLE_V2_BADGE_COLORS = {
    // V1 role names (PascalCase - from DB)
    Admin: 'bg-purple-100 text-purple-800',
    Requester: 'bg-blue-100 text-blue-800',
    Approver: 'bg-green-100 text-green-800',
    Assignee: 'bg-orange-100 text-orange-800',
    // V1 role names (lowercase - legacy)
    admin: 'bg-purple-100 text-purple-800',
    requester: 'bg-blue-100 text-blue-800',
    approver: 'bg-green-100 text-green-800',
    assignee: 'bg-orange-100 text-orange-800',
    // V2 role names (backward compatibility)
    SuperAdmin: 'bg-purple-100 text-purple-800',
    OrgAdmin: 'bg-blue-100 text-blue-800',
    TeamLead: 'bg-green-100 text-green-800',
    Member: 'bg-orange-100 text-orange-800',
    manager: 'bg-green-100 text-green-800',
    user: 'bg-gray-100 text-gray-800'
};

// ============================================
// Basic Role Checks
// ============================================

/**
 * ตรวจสอบว่า user มี role ที่ระบุหรือไม่ (Multi-Role Support)
 * 
 * @param {Object} user - User object
 * @param {string} roleName - ชื่อ role ที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้ามี role นั้น
 * 
 * @example
 * hasRole(user, 'requester') // true/false
 */
export const hasRole = (user, roleName) => {
    if (!user) return false;

    const target = roleName.toLowerCase();

    // ✅ Multi-Role: ตรวจสอบจาก roles array (case-insensitive)
    if (user.roles && Array.isArray(user.roles)) {
        return user.roles.some(r => {
            const name = (typeof r === 'string' ? r : r.name) || '';
            return name.toLowerCase() === target && r.isActive !== false;
        });
    }

    // ✅ Check roleName property (V2 Auth System)
    if (user.roleName) {
        return user.roleName.toLowerCase() === target;
    }

    // ⚠️ Legacy fallback: ตรวจสอบจาก role field เดิม (case-insensitive)
    return user.role?.toLowerCase() === target;
};

/**
 * ตรวจสอบว่า user มี role อย่างน้อย 1 role จาก list ที่ระบุ
 * 
 * @param {Object} user - User object
 * @param {string[]} roleNames - รายชื่อ roles ที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้ามีอย่างน้อย 1 role
 * 
 * @example
 * hasAnyRole(user, ['admin', 'approver']) // true/false
 */
export const hasAnyRole = (user, roleNames) => {
    if (!user || !roleNames || !Array.isArray(roleNames)) return false;
    return roleNames.some(roleName => hasRole(user, roleName));
};

/**
 * ตรวจสอบว่า user มี role ทุก role ที่ระบุ
 * 
 * @param {Object} user - User object
 * @param {string[]} roleNames - รายชื่อ roles ที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้ามีครบทุก role
 * 
 * @example
 * hasAllRoles(user, ['requester', 'approver']) // true/false
 */
export const hasAllRoles = (user, roleNames) => {
    if (!user || !roleNames || !Array.isArray(roleNames)) return false;
    return roleNames.every(roleName => hasRole(user, roleName));
};

/**
 * ดึงรายการ roles ทั้งหมดของ user
 * 
 * @param {Object} user - User object
 * @returns {Array} array ของ role objects หรือ empty array
 * 
 * @example
 * getAllUserRoles(user) // [{name: 'requester', isActive: true, scopes: [...]}]
 */
export const getAllUserRoles = (user) => {
    if (!user) return [];

    // ✅ Multi-Role
    if (user.roles && Array.isArray(user.roles)) {
        return user.roles.filter(r => r.isActive !== false);
    }

    // ⚠️ Legacy fallback: สร้าง array จาก role field เดิม
    if (user.role) {
        return [{
            name: user.role,
            isActive: true,
            scopes: []
        }];
    }

    return [];
};

/**
 * ดึงรายชื่อ role names ของ user (เฉพาะ string)
 * 
 * @param {Object} user - User object
 * @returns {string[]} array ของ role names
 * 
 * @example
 * getUserRoleNames(user) // ['requester', 'approver']
 */
export const getUserRoleNames = (user) => {
    return getAllUserRoles(user).map(r => r.name);
};

// ============================================
// Scope-Based Permission Checks
// ============================================

/**
 * ดึง scopes ของ role ที่ระบุ
 * 
 * @param {Object} user - User object
 * @param {string} roleName - ชื่อ role
 * @returns {Array} array ของ scope objects
 * 
 * @example
 * getRoleScopes(user, 'requester')
 * // [{level: 'project', scopeId: 1, scopeName: 'Project A'}]
 */
export const getRoleScopes = (user, roleName) => {
    if (!user) return [];

    // ✅ Multi-Role
    if (user.roles && Array.isArray(user.roles)) {
        const role = user.roles.find(r =>
            r.name === roleName &&
            r.isActive !== false
        );
        return role?.scopes || [];
    }

    return [];
};

/**
 * ตรวจสอบว่า user มี role และ scope ที่ระบุ
 * 
 * @param {Object} user - User object
 * @param {string} roleName - ชื่อ role
 * @param {string} scopeLevel - ระดับ scope ('tenant', 'bud', 'project')
 * @param {number|string} scopeId - ID ของ scope
 * @returns {boolean} true ถ้ามี role และ scope ตรง
 * 
 * @example
 * hasRoleWithScope(user, 'approver', 'bud', 1) // true/false
 */
export const hasRoleWithScope = (user, roleName, scopeLevel, scopeId) => {
    if (!user) return false;

    const scopes = getRoleScopes(user, roleName);
    if (scopes.length === 0) {
        // ถ้าไม่มี scopes แต่มี role → Legacy mode (full access)
        return hasRole(user, roleName);
    }

    return scopes.some(scope => {
        // Tenant-level → full access
        if (scope.level === SCOPE_LEVELS.TENANT) return true;

        // ตรวจสอบ level และ scopeId ตรงกัน
        return scope.level === scopeLevel &&
            (scope.scopeId == scopeId || scope.scope_id == scopeId);
    });
};

/**
 * ตรวจสอบว่า user มี tenant-level scope สำหรับ role
 * 
 * @param {Object} user - User object
 * @param {string} roleName - ชื่อ role
 * @returns {boolean} true ถ้ามี tenant-level scope
 */
export const hasTenantLevelScope = (user, roleName) => {
    const scopes = getRoleScopes(user, roleName);
    return scopes.some(s => s.level === SCOPE_LEVELS.TENANT);
};

// ============================================
// Business Logic Permission Checks
// ============================================

/**
 * ตรวจสอบว่า user สามารถสร้างงาน (Job) ในโครงการนี้ได้หรือไม่
 * 
 * Logic:
 * 1. ถ้า user มี role 'requester' และ scope เป็น tenant-level → ได้
 * 2. ถ้า user มี role 'requester' และ scope เป็น bud-level ที่ project อยู่ใน bud → ได้
 * 3. ถ้า user มี role 'requester' และ scope เป็น project-level ตรงกับ project → ได้
 * 4. ถ้า user มี role 'admin' → ได้
 * 
 * @param {Object} user - User object
 * @param {number|string} projectId - ID ของโครงการ
 * @param {number|string} [projectBudId] - ID ของ BUD ที่โครงการอยู่ (optional)
 * @returns {boolean} true ถ้าสามารถสร้างงานได้
 * 
 * @example
 * canCreateJobInProject(user, 5, 1) // projectId=5, budId=1
 */
export const canCreateJobInProject = (user, projectId, projectBudId = null) => {
    if (!user) return false;

    // Admin สามารถทำได้ทุกอย่าง
    if (hasRole(user, ROLES.ADMIN)) return true;

    // ต้องมี role 'requester'
    if (!hasRole(user, ROLES.REQUESTER)) return false;

    const scopes = getRoleScopes(user, ROLES.REQUESTER);

    // ถ้าไม่มี scopes (legacy) → full access
    if (scopes.length === 0) return true;

    return scopes.some(scope => {
        // Tenant-level → full access
        if (scope.level === SCOPE_LEVELS.TENANT) return true;

        // BUD-level → ตรวจสอบ budId
        if (scope.level === SCOPE_LEVELS.BUD && projectBudId) {
            return scope.scopeId == projectBudId || scope.scope_id == projectBudId;
        }

        // Project-level → ตรวจสอบ projectId
        if (scope.level === SCOPE_LEVELS.PROJECT) {
            return scope.scopeId == projectId || scope.scope_id == projectId;
        }

        return false;
    });
};

/**
 * ตรวจสอบว่า user สามารถอนุมัติงานใน BUD นี้ได้หรือไม่
 * 
 * @param {Object} user - User object
 * @param {number|string} budId - ID ของ BUD
 * @returns {boolean} true ถ้าสามารถอนุมัติได้
 * 
 * @example
 * canApproveInBud(user, 1) // budId=1
 */
export const canApproveInBud = (user, budId) => {
    if (!user) return false;

    // Admin สามารถทำได้ทุกอย่าง
    if (hasRole(user, ROLES.ADMIN)) return true;

    // ต้องมี role 'approver'
    if (!hasRole(user, ROLES.APPROVER)) return false;

    const scopes = getRoleScopes(user, ROLES.APPROVER);

    // ถ้าไม่มี scopes (legacy) → full access
    if (scopes.length === 0) return true;

    return scopes.some(scope => {
        // Tenant-level → full access
        if (scope.level === SCOPE_LEVELS.TENANT) return true;

        // BUD-level → ตรวจสอบ budId
        if (scope.level === SCOPE_LEVELS.BUD) {
            return scope.scopeId == budId || scope.scope_id == budId;
        }

        return false;
    });
};

/**
 * ตรวจสอบว่า user สามารถอนุมัติงานในโครงการนี้ได้หรือไม่
 * 
 * @param {Object} user - User object
 * @param {number|string} projectId - ID ของโครงการ
 * @param {number|string} [projectBudId] - ID ของ BUD ที่โครงการอยู่
 * @returns {boolean} true ถ้าสามารถอนุมัติได้
 */
export const canApproveInProject = (user, projectId, projectBudId = null) => {
    if (!user) return false;

    // Admin สามารถทำได้ทุกอย่าง
    if (hasRole(user, ROLES.ADMIN)) return true;

    // ต้องมี role 'approver'
    if (!hasRole(user, ROLES.APPROVER)) return false;

    const scopes = getRoleScopes(user, ROLES.APPROVER);

    // ถ้าไม่มี scopes (legacy) → full access
    if (scopes.length === 0) return true;

    return scopes.some(scope => {
        // Tenant-level → full access
        if (scope.level === SCOPE_LEVELS.TENANT) return true;

        // BUD-level → ตรวจสอบ budId
        if (scope.level === SCOPE_LEVELS.BUD && projectBudId) {
            return scope.scopeId == projectBudId || scope.scope_id == projectBudId;
        }

        // Project-level → ตรวจสอบ projectId
        if (scope.level === SCOPE_LEVELS.PROJECT) {
            return scope.scopeId == projectId || scope.scope_id == projectId;
        }

        return false;
    });
};

/**
 * ตรวจสอบว่า user สามารถรับงานจาก BUD นี้ได้หรือไม่
 * 
 * @param {Object} user - User object
 * @param {number|string} budId - ID ของ BUD
 * @returns {boolean} true ถ้าสามารถรับงานได้
 */
export const canBeAssignedInBud = (user, budId, projectId = null) => {
    if (!user) return false;

    // Admin สามารถทำได้ทุกอย่าง
    if (hasRole(user, ROLES.ADMIN)) return true;

    // ต้องมี role 'assignee'
    if (!hasRole(user, ROLES.ASSIGNEE)) return false;

    const scopes = getRoleScopes(user, ROLES.ASSIGNEE);

    // ถ้าไม่มี scopes (legacy) → full access
    if (scopes.length === 0) return true;

    return scopes.some(scope => {
        // Tenant-level → full access
        if (scope.level === SCOPE_LEVELS.TENANT) return true;

        // BUD-level → ตรวจสอบ budId
        if (scope.level === SCOPE_LEVELS.BUD) {
            return scope.scopeId == budId || scope.scope_id == budId;
        }

        // Project-level → ตรวจสอบ projectId
        if (scope.level === SCOPE_LEVELS.PROJECT && projectId) {
            return scope.scopeId == projectId || scope.scope_id == projectId;
        }

        return false;
    });
};

// ============================================
// UI Helper Functions
// ============================================

/**
 * ดึง label ภาษาไทยของ role
 * 
 * @param {string} roleName - ชื่อ role
 * @returns {string} label ภาษาไทย
 * 
 * @example
 * getRoleLabel('requester') // 'ผู้เปิดงาน'
 */
export const getRoleLabel = (roleName) => {
    return ROLE_LABELS[roleName] || roleName;
};

/**
 * ดึง description ของ role
 * 
 * @param {string} roleName - ชื่อ role
 * @returns {string} description
 */
export const getRoleDescription = (roleName) => {
    return ROLE_DESCRIPTIONS[roleName] || '';
};

/**
 * ดึง role หลักของ user (สำหรับ display)
 * 
 * Priority: admin > approver > requester > assignee
 * 
 * @param {Object} user - User object
 * @returns {string|null} role name หลัก
 */
export const getPrimaryRole = (user) => {
    if (!user) return null;

    const roles = getUserRoleNames(user);

    // Priority order
    const priority = [ROLES.ADMIN, ROLES.APPROVER, ROLES.REQUESTER, ROLES.ASSIGNEE];

    for (const role of priority) {
        if (roles.some(r => r?.toLowerCase() === role.toLowerCase())) return role;
    }

    return roles[0] || user.role || null;
};

/**
 * ตรวจสอบว่า user เป็น admin หรือไม่
 * 
 * @param {Object} user - User object
 * @returns {boolean} true ถ้าเป็น admin
 */
export const isAdmin = (user) => hasRole(user, ROLES.ADMIN);

/**
 * ตรวจสอบว่า user เป็น requester หรือไม่
 * 
 * @param {Object} user - User object
 * @returns {boolean} true ถ้าเป็น requester
 */
export const isRequester = (user) => hasRole(user, ROLES.REQUESTER);

/**
 * ตรวจสอบว่า user เป็น approver หรือไม่
 * 
 * @param {Object} user - User object
 * @returns {boolean} true ถ้าเป็น approver
 */
export const isApprover = (user) => hasRole(user, ROLES.APPROVER);

/**
 * ตรวจสอบว่า user เป็น assignee หรือไม่
 * 
 * @param {Object} user - User object
 * @returns {boolean} true ถ้าเป็น assignee
 */
export const isAssignee = (user) => hasRole(user, ROLES.ASSIGNEE);

// ============================================
// Scope Summary for UI
// ============================================

/**
 * ดึง summary ของ scopes สำหรับแสดงใน UI
 * 
 * @param {Object} user - User object
 * @param {string} roleName - ชื่อ role
 * @returns {string} summary text
 * 
 * @example
 * getScopeSummary(user, 'requester') 
 * // 'Project A, Project B' หรือ 'ทั้งบริษัท'
 */
export const getScopeSummary = (user, roleName) => {
    const scopes = getRoleScopes(user, roleName);

    if (scopes.length === 0) return 'ทุกโครงการ (legacy)';

    // Check for tenant-level
    const hasTenant = scopes.some(s => s.level === SCOPE_LEVELS.TENANT);
    if (hasTenant) return 'ทั้งบริษัท';

    // List scope names
    const scopeNames = scopes
        .map(s => s.scopeName || s.scope_name || `ID: ${s.scopeId || s.scope_id}`)
        .filter(Boolean);

    if (scopeNames.length === 0) return 'ไม่ระบุ';
    if (scopeNames.length > 3) {
        return `${scopeNames.slice(0, 3).join(', ')} และอีก ${scopeNames.length - 3} รายการ`;
    }

    return scopeNames.join(', ');
};

/**
 * ดึง projects ที่ user สามารถสร้างงานได้
 * 
 * @param {Object} user - User object
 * @param {Array} allProjects - รายการโครงการทั้งหมด [{id, name, budId, ...}]
 * @returns {Array} รายการโครงการที่สร้างงานได้
 */
export const getAccessibleProjects = (user, allProjects = []) => {
    if (!user || !Array.isArray(allProjects)) return [];

    // Admin → all projects
    if (hasRole(user, ROLES.ADMIN)) return allProjects;

    // ไม่มี requester role → ไม่มี projects
    if (!hasRole(user, ROLES.REQUESTER)) return [];

    const scopes = getRoleScopes(user, ROLES.REQUESTER);

    // Legacy mode (no scopes) → all projects
    if (scopes.length === 0) return allProjects;

    return allProjects.filter(project => {
        return scopes.some(scope => {
            if (scope.level === SCOPE_LEVELS.TENANT) return true;
            if (scope.level === SCOPE_LEVELS.BUD) {
                return (scope.scopeId || scope.scope_id) == project.budId;
            }
            if (scope.level === SCOPE_LEVELS.PROJECT) {
                return (scope.scopeId || scope.scope_id) == project.id;
            }
            return false;
        });
    });
};

// ============================================
// Job Role Detection & Theme
// ============================================

/**
 * ตรวจสอบ role ของ user ต่อ job ที่ดูอยู่
 * ลำดับความสำคัญ: Admin > Approver > Assignee > Requester
 *
 * @param {Object} user - User object
 * @param {Object} job - Job object
 * @returns {string} - 'admin' | 'approver' | 'assignee' | 'requester' | 'viewer'
 */
export const getJobRole = (user, job) => {
    if (!user || !job) return 'viewer';

    // Priority 1: Admin มีสิทธิ์สูงสุด
    if (hasRole(user, ROLES.ADMIN) || hasRole(user, 'Admin') || hasRole(user, 'SuperAdmin')) {
        return 'admin';
    }

    // Priority 2: Assignee (ผู้รับมอบหมายจริง) - ตรวจสอบก่อน role อื่น
    if (job.assigneeId === user.id || job.assignee?.id === user.id) {
        return 'assignee';
    }

    // Priority 3: Requester (ผู้สร้างงาน) - ตรวจสอบก่อน role อื่น
    if (job.requesterId === user.id || job.requester?.id === user.id) {
        return 'requester';
    }

    // Priority 4: Approver (ผู้อนุมัติ) - ตรวจสอบทีหลัง
    if (hasRole(user, ROLES.APPROVER) || hasRole(user, 'Approver') || hasRole(user, 'TeamLead')) {
        return 'approver';
    }

    return 'viewer';
};

/**
 * Theme config สำหรับแต่ละ role (ใช้ Tailwind complete class names)
 * สีอิงจาก ROLE_V2_BADGE_COLORS ที่มีอยู่แล้ว
 */
export const JOB_ROLE_THEMES = {
    admin: {
        label: 'System Admin',
        badgeClass: 'bg-purple-100 text-purple-800',
        borderClass: 'border-gray-400',
        accentBg: 'bg-purple-50',
        accentText: 'text-purple-700',
        headerBorder: 'border-l-purple-500',
        dotColor: 'bg-purple-500'
    },
    approver: {
        label: 'Approver',
        badgeClass: 'bg-green-100 text-green-800',
        borderClass: 'border-gray-400',
        accentBg: 'bg-green-50',
        accentText: 'text-green-700',
        headerBorder: 'border-l-green-500',
        dotColor: 'bg-green-500'
    },
    assignee: {
        label: 'Assignee',
        badgeClass: 'bg-orange-100 text-orange-800',
        borderClass: 'border-gray-400',
        accentBg: 'bg-orange-50',
        accentText: 'text-orange-700',
        headerBorder: 'border-l-orange-500',
        dotColor: 'bg-orange-500'
    },
    requester: {
        label: 'Requester',
        badgeClass: 'bg-blue-100 text-blue-800',
        borderClass: 'border-gray-400',
        accentBg: 'bg-blue-50',
        accentText: 'text-blue-700',
        headerBorder: 'border-l-rose-500',
        dotColor: 'bg-blue-500'
    },
    viewer: {
        label: 'Viewer',
        badgeClass: 'bg-gray-100 text-gray-800',
        borderClass: 'border-gray-400',
        accentBg: 'bg-gray-50',
        accentText: 'text-gray-700',
        headerBorder: 'border-l-gray-400',
        dotColor: 'bg-gray-400'
    }
};
