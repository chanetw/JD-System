/**
 * @file ScopeConfigPanel.jsx
 * @description Component สำหรับจัดการ Scope ของแต่ละ Role
 * 
 * Features:
 * - แสดง Scope configuration แยกตาม role ที่เลือก
 * - Collapsible panels สำหรับแต่ละ role
 * - รองรับ scope levels: Tenant, BUD, Project
 * - เลือกได้หลาย projects/buds per role
 */

import React, { useState, useEffect } from 'react';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    BuildingOfficeIcon,
    FolderIcon,
    DocumentIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import { ROLES, ROLE_LABELS } from '@shared/utils/permission.utils';

// Scope level labels
const SCOPE_LEVEL_LABELS = {
    tenant: 'ระดับบริษัท (ทุกโครงการ)',
    bud: 'ระดับสายงาน (BUD)',
    project: 'ระดับโครงการ'
};

// Scope level icons
const SCOPE_LEVEL_ICONS = {
    tenant: GlobeAltIcon,
    bud: BuildingOfficeIcon,
    project: FolderIcon
};

/**
 * ScopeConfigPanel - Container สำหรับ scope configurations ทั้งหมด
 */
export default function ScopeConfigPanel({
    selectedRoles = [],
    roleConfigs = {},
    onConfigChange,
    availableScopes = { projects: [], buds: [], tenants: [] },
    loading = false
}) {
    const [expandedPanels, setExpandedPanels] = useState({});

    useEffect(() => {
        const newExpanded = { ...expandedPanels };
        selectedRoles.forEach(role => {
            if (role !== ROLES.ADMIN && !(role in newExpanded)) {
                newExpanded[role] = true;
            }
        });
        setExpandedPanels(newExpanded);
    }, [selectedRoles]);

    const togglePanel = (roleName) => {
        setExpandedPanels(prev => ({
            ...prev,
            [roleName]: !prev[roleName]
        }));
    };

    const updateRoleConfig = (roleName, newConfig) => {
        const updated = {
            ...roleConfigs,
            [roleName]: {
                ...roleConfigs[roleName],
                ...newConfig
            }
        };
        onConfigChange?.(updated);
    };

    const rolesNeedingScope = selectedRoles.filter(r => r !== ROLES.ADMIN);

    if (rolesNeedingScope.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3 mt-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <DocumentIcon className="h-4 w-4" />
                กำหนดขอบเขต (Scope) สำหรับแต่ละบทบาท
            </h4>

            {rolesNeedingScope.map((roleName) => (
                <RoleScopeConfig
                    key={roleName}
                    roleName={roleName}
                    config={roleConfigs[roleName] || { level: 'project', scopes: [] }}
                    onChange={(newConfig) => updateRoleConfig(roleName, newConfig)}
                    availableScopes={availableScopes}
                    expanded={expandedPanels[roleName] !== false}
                    onToggle={() => togglePanel(roleName)}
                    loading={loading}
                />
            ))}
        </div>
    );
}

/**
 * RoleScopeConfig - Config panel สำหรับ role เดียว
 */
function RoleScopeConfig({
    roleName,
    config,
    onChange,
    availableScopes,
    expanded,
    onToggle,
    loading
}) {
    const currentLevel = config?.level || 'project';
    const currentScopes = config?.scopes || [];

    const handleLevelChange = (newLevel) => {
        onChange({
            level: newLevel,
            scopes: []
        });
    };

    const handleScopeToggle = (scopeId, scopeName) => {
        if (currentLevel === 'tenant') {
            onChange({
                level: 'tenant',
                scopes: [{ scopeId, scopeName }]
            });
        } else {
            const exists = currentScopes.some(s => s.scopeId == scopeId);
            let newScopes;
            if (exists) {
                newScopes = currentScopes.filter(s => s.scopeId != scopeId);
            } else {
                newScopes = [...currentScopes, { scopeId, scopeName }];
            }

            onChange({
                ...config,
                scopes: newScopes
            });
        }
    };

    const getAvailableItems = () => {
        switch (currentLevel) {
            case 'tenant':
                return availableScopes.tenants || [];
            case 'bud':
                return availableScopes.buds || [];
            case 'project':
                return availableScopes.projects || [];
            default:
                return [];
        }
    };

    const getScopeLabel = () => {
        switch (roleName) {
            case ROLES.REQUESTER:
                return 'สามารถสร้างงานได้ใน:';
            case ROLES.APPROVER:
                return 'สามารถอนุมัติงานใน:';
            case ROLES.ASSIGNEE:
                return 'สามารถรับงานจาก:';
            default:
                return 'ขอบเขต:';
        }
    };

    const getAllowedLevels = () => ['tenant', 'bud', 'project'];

    const allowedLevels = getAllowedLevels();
    const items = getAvailableItems();

    const roleColors = {
        requester: 'border-blue-200 bg-blue-50',
        approver: 'border-green-200 bg-green-50',
        assignee: 'border-orange-200 bg-orange-50'
    };

    const headerColors = {
        requester: 'bg-blue-100 text-blue-800',
        approver: 'bg-green-100 text-green-800',
        assignee: 'bg-orange-100 text-orange-800'
    };

    return (
        <div className={`border rounded-lg overflow-hidden ${roleColors[roleName] || 'border-gray-200'}`}>
            <button
                type="button"
                onClick={onToggle}
                className={`w-full flex items-center justify-between px-4 py-2.5 ${headerColors[roleName] || 'bg-gray-100 text-gray-800'}`}
            >
                <span className="font-medium text-sm">
                    {ROLE_LABELS[roleName]} - ขอบเขต
                </span>
                <span className="flex items-center gap-2">
                    {currentScopes.length > 0 && (
                        <span className="text-xs bg-white/50 px-2 py-0.5 rounded">
                            {currentLevel === 'tenant' ? 'ทุกโครงการ' : `${currentScopes.length} รายการ`}
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                    )}
                </span>
            </button>

            {expanded && (
                <div className="p-4 bg-white space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ระดับขอบเขต:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {allowedLevels.map((level) => {
                                const Icon = SCOPE_LEVEL_ICONS[level];
                                const isSelected = currentLevel === level;
                                
                                return (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => handleLevelChange(level)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${isSelected ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {SCOPE_LEVEL_LABELS[level]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {getScopeLabel()}
                        </label>

                        {loading ? (
                            <div className="text-sm text-gray-500 py-4 text-center">
                                กำลังโหลด...
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center">
                                ไม่พบข้อมูล {currentLevel === 'tenant' ? 'บริษัท' : currentLevel === 'bud' ? 'สายงาน' : 'โครงการ'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                {items.map((item) => {
                                    const isChecked = currentScopes.some(s => s.scopeId == item.id);
                                    
                                    return (
                                        <label
                                            key={item.id}
                                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all duration-150 ${isChecked ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleScopeToggle(item.id, item.name)}
                                                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700 truncate">
                                                {item.name}
                                                {item.code && <span className="text-gray-400 ml-1">({item.code})</span>}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {currentScopes.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                                เลือกแล้ว: {currentScopes.length} รายการ
                            </div>
                        )}
                    </div>

                    {currentLevel === 'tenant' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                            ✅ สามารถทำงานได้ทุกโครงการในบริษัท
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * ScopePreview - แสดง preview ของ scopes ที่เลือก
 */
export function ScopePreview({ roleConfigs = {} }) {
    const entries = Object.entries(roleConfigs).filter(([_, config]) => config?.scopes?.length > 0);

    if (entries.length === 0) {
        return (
            <div className="text-sm text-gray-500 italic">
                ยังไม่ได้กำหนดขอบเขต
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {entries.map(([roleName, config]) => (
                <div key={roleName} className="text-sm">
                    <span className="font-medium text-gray-700">
                        {ROLE_LABELS[roleName]}:
                    </span>{' '}
                    <span className="text-gray-600">
                        {config.level === 'tenant' 
                            ? 'ทุกโครงการ' 
                            : config.scopes.map(s => s.scopeName || `ID:${s.scopeId}`).join(', ')
                        }
                    </span>
                </div>
            ))}
        </div>
    );
}
