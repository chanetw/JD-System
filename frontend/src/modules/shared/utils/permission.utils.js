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
    ADMIN: 'admin',
    REQUESTER: 'requester',
    APPROVER: 'approver',
    ASSIGNEE: 'assignee'
};

export const SCOPE_LEVELS = {
    TENANT: 'tenant',
    BUD: 'bud',
    PROJECT: 'project'
};

// Thai labels for roles
export const ROLE_LABELS = {
    admin: 'ผู้ดูแลระบบ',
    requester: 'ผู้เปิดงาน',
    approver: 'ผู้อนุมัติ',
    assignee: 'ผู้รับงาน'
};

// Role descriptions
export const ROLE_DESCRIPTIONS = {
    admin: 'จัดการระบบทั้งหมด',
    requester: 'สร้างและติดตามงาน',
    approver: 'อนุมัติงานที่ส่งมา',
    assignee: 'รับและดำเนินการงาน'
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
    
    // ✅ Multi-Role: ตรวจสอบจาก roles array
    if (user.roles && Array.isArray(user.roles)) {
        return user.roles.some(r => 
            r.name === roleName && 
            r.isActive !== false
        );
    }
    
    // ⚠️ Legacy fallback: ตรวจสอบจาก role field เดิม
    return user.role === roleName;
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
export const canBeAssignedInBud = (user, budId) => {
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
        if (roles.includes(role)) return role;
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
