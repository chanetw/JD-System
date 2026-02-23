
/**
 * @file RoleProtectedRoute.jsx
 * @description Component สำหรับป้องกัน Route ตาม Role ของผู้ใช้งาน
 */

import { Navigate } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';

export default function RoleProtectedRoute({ children, allowedRoles }) {
    const { user, isAuthenticated } = useAuthStoreV2();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // ถ้าไม่ได้ระบุ Role ที่อนุญาต ให้ผ่านได้ตราบใดที่ Login แล้ว
    if (!allowedRoles || allowedRoles.length === 0) {
        return children;
    }

    // ตรวจสอบว่า User มี Role อย่างน้อยหนึ่งอย่างที่อยู่ในรายการที่อนุญาตหรือไม่
    // รองรับทั้ง user.roleName (string) และ user.roles (array)
    const userRole = user?.roleName;
    const userRoles = user?.roles || [];

    const allowedLower = allowedRoles.map(r => r.toLowerCase());
    const hasRole = allowedLower.includes(userRole?.toLowerCase()) ||
        userRoles.some(role => {
            const name = (typeof role === 'string' ? role : role?.name) || '';
            return allowedLower.includes(name.toLowerCase());
        });

    if (!hasRole) {
        // ถ้าไม่มีสิทธิ์ ให้ส่งกลับไปหน้า Dashboard (หรือหน้าที่เหมาะสม)
        console.warn(`[RoleGuard] Access denied for user ${user?.email}. Role: ${userRole}. Required: ${allowedRoles.join(', ')}`);
        return <Navigate to="/" replace />;
    }

    return children;
}
