
/**
 * @file RoleProtectedRoute.jsx
 * @description Component สำหรับป้องกัน Route ตาม Role ของผู้ใช้งาน
 */

import { Navigate } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { hasAnyRole } from '@shared/utils/permission.utils';

export default function RoleProtectedRoute({ children, allowedRoles }) {
    const { user, isAuthenticated } = useAuthStoreV2();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // ถ้าไม่ได้ระบุ Role ที่อนุญาต ให้ผ่านได้ตราบใดที่ Login แล้ว
    if (!allowedRoles || allowedRoles.length === 0) {
        return children;
    }

    const hasRole = hasAnyRole(user, allowedRoles);

    if (!hasRole) {
        // ถ้าไม่มีสิทธิ์ ให้ส่งกลับไปหน้า Dashboard (หรือหน้าที่เหมาะสม)
        console.warn(`[RoleGuard] Access denied for user ${user?.email}. Roles: ${JSON.stringify(user?.roles || user?.roleName || [])}. Required: ${allowedRoles.join(', ')}`);
        return <Navigate to="/" replace />;
    }

    return children;
}
