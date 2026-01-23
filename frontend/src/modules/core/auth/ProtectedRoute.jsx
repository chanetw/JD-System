/**
 * @file ProtectedRoute.jsx
 * @description Component สำหรับป้องกัน Route ที่ต้อง Login ก่อนเข้าใช้งาน
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@core/stores/authStore';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirect ไปหน้า Login พร้อมเก็บ state ว่าเดิมจะไปไหน (เพื่อให้ redirect กลับมาได้)
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
