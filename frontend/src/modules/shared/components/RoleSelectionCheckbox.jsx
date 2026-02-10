/**
 * @file RoleSelectionCheckbox.jsx
 * @description Component สำหรับเลือก Roles แบบ Checkbox (Multi-Role Support)
 * 
 * Features:
 * - Checkbox หลายตัวสำหรับเลือก roles
 * - แสดง label ภาษาไทยและ description
 * - ไอคอนและสีแตกต่างกันตาม role
 * - รองรับ disabled state
 */

import React from 'react';
import {
    ShieldCheckIcon,
    DocumentTextIcon,
    CheckBadgeIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@shared/utils/permission.utils';

// Role icons mapping
const ROLE_ICONS = {
    Admin: ShieldCheckIcon,
    Requester: DocumentTextIcon,
    Approver: CheckBadgeIcon,
    Assignee: WrenchScrewdriverIcon
};

// Role colors mapping
const ROLE_COLORS = {
    Admin: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        icon: 'text-purple-500',
        checked: 'bg-purple-100 border-purple-500'
    },
    Requester: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: 'text-blue-500',
        checked: 'bg-blue-100 border-blue-500'
    },
    Approver: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: 'text-green-500',
        checked: 'bg-green-100 border-green-500'
    },
    Assignee: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        icon: 'text-orange-500',
        checked: 'bg-orange-100 border-orange-500'
    }
};

// Default available roles
const DEFAULT_ROLES = [
    ROLES.ADMIN,
    ROLES.REQUESTER,
    ROLES.APPROVER,
    ROLES.ASSIGNEE
];

/**
 * RoleSelectionCheckbox Component
 * 
 * @param {Object} props
 * @param {string[]} props.availableRoles - รายชื่อ roles ที่แสดงให้เลือก
 * @param {string[]} props.selectedRoles - รายชื่อ roles ที่เลือกอยู่
 * @param {function} props.onChange - callback เมื่อเปลี่ยน selection (roles: string[])
 * @param {string[]} props.disabledRoles - รายชื่อ roles ที่ disabled
 * @param {boolean} props.showDescriptions - แสดง descriptions หรือไม่
 * @param {boolean} props.compact - แสดงแบบ compact หรือไม่
 * @param {string} props.className - custom className
 */
export default function RoleSelectionCheckbox({
    availableRoles = DEFAULT_ROLES,
    selectedRoles = [],
    onChange,
    disabledRoles = [],
    showDescriptions = true,
    compact = false,
    className = ''
}) {
    // Handle checkbox toggle
    const handleToggle = (roleName) => {
        if (disabledRoles.includes(roleName)) return;

        const newSelection = selectedRoles.includes(roleName)
            ? selectedRoles.filter(r => r !== roleName)
            : [...selectedRoles, roleName];

        onChange?.(newSelection);
    };

    // Check if role is selected
    const isSelected = (roleName) => selectedRoles.includes(roleName);

    // Check if role is disabled
    const isDisabled = (roleName) => disabledRoles.includes(roleName);

    return (
        <div className={`space-y-2 ${className}`}>
            {availableRoles.map((roleName) => {
                const Icon = ROLE_ICONS[roleName] || DocumentTextIcon;
                const colors = ROLE_COLORS[roleName] || ROLE_COLORS.Requester;
                const selected = isSelected(roleName);
                const disabled = isDisabled(roleName);

                return (
                    <label
                        key={roleName}
                        className={`
                            flex items-start gap-3 p-3 rounded-lg border cursor-pointer
                            transition-all duration-200
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            ${selected
                                ? `${colors.checked} shadow-sm`
                                : `${colors.bg} ${colors.border} hover:shadow-sm`
                            }
                            ${compact ? 'p-2' : 'p-3'}
                        `}
                    >
                        {/* Checkbox */}
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleToggle(roleName)}
                            disabled={disabled}
                            className={`
                                mt-0.5 h-4 w-4 rounded border-gray-300
                                focus:ring-2 focus:ring-offset-0
                                ${colors.text}
                            `}
                        />

                        {/* Icon */}
                        <Icon className={`h-5 w-5 flex-shrink-0 ${colors.icon}`} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className={`font-medium ${colors.text}`}>
                                {ROLE_LABELS[roleName] || roleName}
                            </div>
                            {showDescriptions && !compact && (
                                <div className="text-sm text-gray-500 mt-0.5">
                                    {ROLE_DESCRIPTIONS[roleName] || ''}
                                </div>
                            )}
                        </div>

                        {/* Selected indicator */}
                        {selected && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                                เลือกแล้ว
                            </span>
                        )}
                    </label>
                );
            })}

            {/* Empty state */}
            {availableRoles.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                    ไม่มี roles ให้เลือก
                </div>
            )}
        </div>
    );
}

/**
 * RoleSelectionCompact - เวอร์ชันย่อ สำหรับแสดงใน inline
 */
export function RoleSelectionCompact({ selectedRoles = [], onChange, ...props }) {
    return (
        <RoleSelectionCheckbox
            selectedRoles={selectedRoles}
            onChange={onChange}
            showDescriptions={false}
            compact={true}
            {...props}
        />
    );
}

/**
 * RoleRadioSelect - เลือกได้ตัวเดียว (Single Role)
 */
export function RoleRadioSelect({
    availableRoles = DEFAULT_ROLES,
    selectedRole = '',
    onChange,
    disabledRoles = [],
    showDescriptions = true,
    className = ''
}) {
    const handleSelect = (roleName) => {
        if (disabledRoles.includes(roleName)) return;
        onChange?.(roleName);
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {availableRoles.map((roleName) => {
                const Icon = ROLE_ICONS[roleName] || DocumentTextIcon;
                const colors = ROLE_COLORS[roleName] || ROLE_COLORS.Requester;
                const selected = selectedRole === roleName;
                const disabled = disabledRoles.includes(roleName);

                return (
                    <label
                        key={roleName}
                        className={`
                            flex items-start gap-3 p-3 rounded-lg border cursor-pointer
                            transition-all duration-200
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            ${selected
                                ? `${colors.checked} shadow-sm`
                                : `${colors.bg} ${colors.border} hover:shadow-sm`
                            }
                        `}
                    >
                        {/* Radio */}
                        <input
                            type="radio"
                            name="role-selection"
                            checked={selected}
                            onChange={() => handleSelect(roleName)}
                            disabled={disabled}
                            className={`
                                mt-0.5 h-4 w-4 border-gray-300
                                focus:ring-2 focus:ring-offset-0
                                ${colors.text}
                            `}
                        />

                        {/* Icon */}
                        <Icon className={`h-5 w-5 flex-shrink-0 ${colors.icon}`} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className={`font-medium ${colors.text}`}>
                                {ROLE_LABELS[roleName] || roleName}
                            </div>
                            {showDescriptions && (
                                <div className="text-sm text-gray-500 mt-0.5">
                                    {ROLE_DESCRIPTIONS[roleName] || ''}
                                </div>
                            )}
                        </div>
                    </label>
                );
            })}
        </div>
    );
}
