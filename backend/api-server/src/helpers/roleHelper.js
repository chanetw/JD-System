/**
 * Case-insensitive role checking helpers
 * ใช้เป็นศูนย์กลางสำหรับ Backend ทั้งระบบ
 */

/**
 * Check if roles array contains a specific role (case-insensitive)
 * @param {string[]} roles - Array of role strings
 * @param {string} roleName - Role to check for
 * @returns {boolean}
 */
export function hasRole(roles, roleName) {
  if (!roles || !Array.isArray(roles)) return false;
  return roles.some(r => r?.toLowerCase() === roleName.toLowerCase());
}

/**
 * Check if user has admin-level permissions (Admin or Requester)
 * @param {string[]} roles - Array of role strings
 * @returns {boolean}
 */
export function hasAdminRole(roles) {
  return hasRole(roles, 'admin') || hasRole(roles, 'requester');
}

/**
 * Compare single role string (case-insensitive)
 * @param {string} role - User's role
 * @param {string} targetRole - Role to compare against
 * @returns {boolean}
 */
export function isRole(role, targetRole) {
  if (!role || !targetRole) return false;
  return role.toLowerCase() === targetRole.toLowerCase();
}

/**
 * Check if role matches any of the allowed roles (case-insensitive)
 * @param {string} role - User's role
 * @param {string[]} allowedRoles - Array of allowed role strings
 * @returns {boolean}
 */
export function isAnyRole(role, allowedRoles) {
  if (!role || !allowedRoles || !Array.isArray(allowedRoles)) return false;
  return allowedRoles.some(r => isRole(role, r));
}
