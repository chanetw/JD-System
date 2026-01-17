/**
 * @file PortalRouter.jsx
 * @description Auto redirect ตาม Role ของผู้ใช้
 * 
 * Routes:
 * - /portal → Redirect ไป Portal ที่เหมาะสม
 * - marketing → /portal/marketing
 * - approver → /portal/approver
 * - assignee → /portal/assignee
 * - admin → /portal/admin
 */

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function PortalRouter() {
    const { user } = useAuthStore();
    const role = user?.roles?.[0] || 'marketing';

    // Redirect ตาม role
    switch (role) {
        case 'approver':
            return <Navigate to="/portal/approver" replace />;
        case 'assignee':
            return <Navigate to="/portal/assignee" replace />;
        case 'admin':
            return <Navigate to="/portal/admin" replace />;
        case 'marketing':
        default:
            return <Navigate to="/portal/marketing" replace />;
    }
}
