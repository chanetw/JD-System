/**
 * @file RoleSwitcher.jsx
 * @description Component สำหรับสลับ role เพื่อทดสอบ workflow
 * 
 * Features:
 * - สลับระหว่าง Requester, Approver, Designer, Admin
 * - บันทึก role ลง localStorage
 * - อัพเดท user context
 */

import React from 'react';
import { useAuth } from '@/store/AuthContext';
import ResponsiveSelect from '@shared/components/ResponsiveSelect';

export default function RoleSwitcher() {
    const { user, setUser } = useAuth();

    const roles = [
        { value: 'Requester', label: 'ผู้เปิดงาน', icon: '📝' },
        { value: 'Approver', label: 'Approver/Manager', icon: '✅' },
        { value: 'Designer', label: 'Designer/Assignee', icon: '🎨' },
        { value: 'Admin', label: 'Admin', icon: '⚙️' }
    ];

    const handleRoleChange = (newRole) => {
        const updatedUser = {
            ...user,
            currentRole: newRole,
            // อัพเดท permissions ตาม role
            roles: [newRole]
        };

        setUser(updatedUser);
        localStorage.setItem('currentRole', newRole);

        // Reload page เพื่อให้ filters ทำงานใหม่
        window.location.reload();
    };

    const currentRole = user?.currentRole || user?.roles?.[0] || 'Requester';

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Role:</span>
            <ResponsiveSelect
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                options={roles.map(role => ({ value: role.value, label: `${role.icon} ${role.label}` }))}
            />
        </div>
    );
}
