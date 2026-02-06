/**
 * @file NotificationSettings.jsx
 * @description หน้าตั้งค่า Notification แบบ Configurable
 * 
 * Features:
 * - ตั้งค่าแยกตาม Job Type
 * - เลือกผู้รับ (Requester, Approvers, Assignee)
 * - เพิ่ม Custom Recipients (Email + User)
 * - เลือก Events ที่ต้องการส่ง
 */

import React, { useState, useEffect } from 'react';
import { api } from '@shared/services/apiService';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Card, CardHeader, CardBody } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Modal from '@shared/components/Modal';
import {
    BellIcon,
    BellAlertIcon,
    EnvelopeIcon,
    UserIcon,
    UserGroupIcon,
    PlusIcon,
    TrashIcon,
    CheckIcon,
    XMarkIcon,
    Cog6ToothIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

// Event types with labels
const EVENT_TYPES = [
    { id: 'job_created', label: 'สร้างงานใหม่', icon: '📝', description: 'เมื่อมีการสร้างงานใหม่' },
    { id: 'job_approved', label: 'อนุมัติงาน', icon: '✅', description: 'เมื่องานได้รับการอนุมัติ' },
    { id: 'job_rejected', label: 'ปฏิเสธงาน', icon: '❌', description: 'เมื่องานถูกปฏิเสธหรือส่งกลับแก้ไข' },
    { id: 'job_assigned', label: 'มอบหมายงาน', icon: '👤', description: 'เมื่อมีการมอบหมายงานให้ผู้รับงาน' },
    { id: 'job_completed', label: 'งานเสร็จสิ้น', icon: '🎉', description: 'เมื่องานเสร็จสมบูรณ์' },
    { id: 'job_cancelled', label: 'ยกเลิกงาน', icon: '🚫', description: 'เมื่องานถูกยกเลิก' },
    { id: 'urgent_impact', label: 'งานด่วนกระทบ', icon: '⚡', description: 'เมื่องานด่วนกระทบกำหนดส่งงานอื่น' },
    { id: 'deadline_approaching', label: 'ใกล้ถึงกำหนด', icon: '⏰', description: 'แจ้งเตือนก่อนถึงกำหนดส่ง 1 วัน' }
];

export default function NotificationSettings() {
    // States
    const [jobTypes, setJobTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedJobType, setSelectedJobType] = useState(null);
    const [settings, setSettings] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal states
    const [showAddEmailModal, setShowAddEmailModal] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [jobTypesData, usersData] = await Promise.all([
                api.getJobTypes(),
                api.getUsers()
            ]);
            const filteredJobTypes = (jobTypesData || []).filter(t => t.name !== 'Project Group (Parent)');
            setJobTypes(filteredJobTypes);
            setUsers(usersData.filter(u => u.isActive));

            // Auto-select first job type
            if (filteredJobTypes.length > 0) {
                selectJobType(filteredJobTypes[0]);
            }
        } catch (err) {
            console.error('Load data error:', err);
            setError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    // Select job type and load its settings
    const selectJobType = async (jobType) => {
        setSelectedJobType(jobType);
        setError('');
        setSuccess('');

        try {
            const settingsData = await api.getNotificationSettings(jobType.id);
            setSettings(settingsData || getDefaultSettings());
        } catch (err) {
            // If no settings exist, use defaults
            setSettings(getDefaultSettings());
        }
    };

    // Get default settings
    const getDefaultSettings = () => ({
        notifyRequester: true,
        notifyApprovers: true,
        notifyAssignee: true,
        customEmails: [],
        customUserIds: [],
        events: ['job_created', 'job_approved', 'job_completed'],
        inAppEnabled: true,
        emailEnabled: true,
        isActive: true
    });

    // Toggle recipient
    const toggleRecipient = (field) => {
        setSettings(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    // Toggle event
    const toggleEvent = (eventId) => {
        setSettings(prev => {
            const events = prev.events || [];
            if (events.includes(eventId)) {
                return { ...prev, events: events.filter(e => e !== eventId) };
            } else {
                return { ...prev, events: [...events, eventId] };
            }
        });
    };

    // Add custom email
    const handleAddEmail = () => {
        if (!newEmail.trim()) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            setError('รูปแบบอีเมลไม่ถูกต้อง');
            return;
        }

        if (settings.customEmails?.includes(newEmail)) {
            setError('อีเมลนี้มีอยู่แล้ว');
            return;
        }

        setSettings(prev => ({
            ...prev,
            customEmails: [...(prev.customEmails || []), newEmail]
        }));
        setNewEmail('');
        setShowAddEmailModal(false);
        setError('');
    };

    // Remove custom email
    const removeEmail = (email) => {
        setSettings(prev => ({
            ...prev,
            customEmails: prev.customEmails.filter(e => e !== email)
        }));
    };

    // Add custom user
    const handleAddUser = () => {
        if (!selectedUserId) return;

        const userId = parseInt(selectedUserId);
        if (settings.customUserIds?.includes(userId)) {
            setError('ผู้ใช้นี้มีอยู่แล้ว');
            return;
        }

        setSettings(prev => ({
            ...prev,
            customUserIds: [...(prev.customUserIds || []), userId]
        }));
        setSelectedUserId('');
        setShowAddUserModal(false);
        setError('');
    };

    // Remove custom user
    const removeUser = (userId) => {
        setSettings(prev => ({
            ...prev,
            customUserIds: prev.customUserIds.filter(id => id !== userId)
        }));
    };

    // Get user by ID
    const getUserById = (userId) => users.find(u => u.id === userId);

    // Save settings
    const handleSave = async () => {
        if (!selectedJobType) return;

        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            await api.saveNotificationSettings(selectedJobType.id, settings);
            setSuccess('บันทึกการตั้งค่าสำเร็จ!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setError('ไม่สามารถบันทึกการตั้งค่าได้');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" color="rose" label="" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                        <BellAlertIcon className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าการแจ้งเตือน</h1>
                        <p className="text-gray-500">กำหนดผู้รับและเหตุการณ์ที่ต้องการแจ้งเตือนแยกตามประเภทงาน</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Job Types List */}
                <div className="lg:col-span-1">
                    <Card className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">ประเภทงาน</h3>
                        <div className="space-y-2">
                            {jobTypes.map((jt) => (
                                <button
                                    key={jt.id}
                                    onClick={() => selectJobType(jt)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${selectedJobType?.id === jt.id
                                            ? 'bg-rose-50 border-2 border-rose-500 text-rose-700'
                                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{jt.icon || '📋'}</span>
                                        <span className="font-medium">{jt.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Settings Panel */}
                <div className="lg:col-span-3 space-y-6">
                    {selectedJobType ? (
                        <>
                            {/* Selected Job Type Header */}
                            <Card className="p-4 bg-gradient-to-r from-rose-50 to-pink-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{selectedJobType.icon || '📋'}</span>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">{selectedJobType.name}</h2>
                                            <p className="text-sm text-gray-500">SLA: {selectedJobType.sla || selectedJobType.sla_days} วัน</p>
                                        </div>
                                    </div>
                                    <Badge variant={settings.isActive ? 'success' : 'gray'}>
                                        {settings.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </Card>

                            {/* Notification Channels */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Cog6ToothIcon className="w-5 h-5" />
                                    ช่องทางการแจ้งเตือน
                                </h3>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.inAppEnabled}
                                            onChange={() => toggleRecipient('inAppEnabled')}
                                            className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                        />
                                        <div className="flex items-center gap-2">
                                            <BellIcon className="w-5 h-5 text-gray-500" />
                                            <span>In-App Notification</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailEnabled}
                                            onChange={() => toggleRecipient('emailEnabled')}
                                            className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                        />
                                        <div className="flex items-center gap-2">
                                            <EnvelopeIcon className="w-5 h-5 text-gray-500" />
                                            <span>Email Notification</span>
                                        </div>
                                    </label>
                                </div>
                            </Card>

                            {/* Default Recipients */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <UserGroupIcon className="w-5 h-5" />
                                    ผู้รับการแจ้งเตือนเริ่มต้น
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifyRequester}
                                            onChange={() => toggleRecipient('notifyRequester')}
                                            className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">📣 Requester</div>
                                            <div className="text-xs text-gray-500">ผู้เปิดงาน</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifyApprovers}
                                            onChange={() => toggleRecipient('notifyApprovers')}
                                            className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">✅ Approvers</div>
                                            <div className="text-xs text-gray-500">ผู้อนุมัติ (CC Team)</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifyAssignee}
                                            onChange={() => toggleRecipient('notifyAssignee')}
                                            className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">🎨 Assignee</div>
                                            <div className="text-xs text-gray-500">ผู้รับงาน (Graphic)</div>
                                        </div>
                                    </label>
                                </div>
                            </Card>

                            {/* Custom Recipients */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <PlusIcon className="w-5 h-5" />
                                    ผู้รับเพิ่มเติม (Custom)
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Custom Emails */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-sm font-medium text-gray-700">อีเมลเพิ่มเติม</label>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowAddEmailModal(true)}
                                            >
                                                <PlusIcon className="w-4 h-4 mr-1" />
                                                เพิ่ม
                                            </Button>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {settings.customEmails?.length > 0 ? (
                                                settings.customEmails.map((email, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm">{email}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => removeEmail(email)}
                                                            className="p-1 text-gray-400 hover:text-red-500"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">ไม่มีอีเมลเพิ่มเติม</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Custom Users */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-sm font-medium text-gray-700">ผู้ใช้เพิ่มเติม</label>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowAddUserModal(true)}
                                            >
                                                <PlusIcon className="w-4 h-4 mr-1" />
                                                เพิ่ม
                                            </Button>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {settings.customUserIds?.length > 0 ? (
                                                settings.customUserIds.map((userId) => {
                                                    const u = getUserById(userId);
                                                    return u ? (
                                                        <div key={userId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <UserIcon className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm">{u.displayName || `${u.firstName} ${u.lastName}`}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => removeUser(userId)}
                                                                className="p-1 text-gray-400 hover:text-red-500"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : null;
                                                })
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">ไม่มีผู้ใช้เพิ่มเติม</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Events */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <BellAlertIcon className="w-5 h-5" />
                                    เหตุการณ์ที่ต้องการแจ้งเตือน
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {EVENT_TYPES.map((event) => (
                                        <label
                                            key={event.id}
                                            className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-colors ${settings.events?.includes(event.id)
                                                    ? 'bg-rose-50 border-2 border-rose-200'
                                                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={settings.events?.includes(event.id)}
                                                onChange={() => toggleEvent(event.id)}
                                                className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span>{event.icon}</span>
                                                    <span className="font-medium text-gray-900">{event.label}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </Card>

                            {/* Messages */}
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 flex items-center gap-2">
                                    <CheckIcon className="w-5 h-5" />
                                    {success}
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-rose-600 hover:bg-rose-700"
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            กำลังบันทึก...
                                        </>
                                    ) : (
                                        <>
                                            <CheckIcon className="w-5 h-5 mr-1" />
                                            บันทึกการตั้งค่า
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <Card className="p-12 text-center">
                            <InformationCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">เลือกประเภทงานเพื่อตั้งค่าการแจ้งเตือน</p>
                        </Card>
                    )}
                </div>
            </div>

            {/* Add Email Modal */}
            {showAddEmailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddEmailModal(false)} />
                    <div className="relative bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-4">เพิ่มอีเมลผู้รับ</h3>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="email@company.com"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowAddEmailModal(false)}>
                                ยกเลิก
                            </Button>
                            <Button onClick={handleAddEmail} className="bg-rose-600 hover:bg-rose-700">
                                เพิ่ม
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {showAddUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddUserModal(false)} />
                    <div className="relative bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-4">เพิ่มผู้ใช้</h3>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
                        >
                            <option value="">เลือกผู้ใช้</option>
                            {users
                                .filter(u => !settings.customUserIds?.includes(u.id))
                                .map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.displayName || `${u.firstName} ${u.lastName}`} ({u.email})
                                    </option>
                                ))
                            }
                        </select>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
                                ยกเลิก
                            </Button>
                            <Button onClick={handleAddUser} disabled={!selectedUserId} className="bg-rose-600 hover:bg-rose-700">
                                เพิ่ม
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
