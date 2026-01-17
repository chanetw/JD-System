/**
 * @file AdminJobTypeSLA.jsx
 * @description หน้าจัดการประเภทงานและ SLA (Admin: Job Type & SLA) - Logic Integrated
 * 
 * Senior Programmer Notes:
 * - เชื่อมต่อกับ mockApi สำหรับ CRUD (Create, Read, Update, Delete)
 * - มี Loading State และ Interaction จริง
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/services/apiService';
import { Card, CardHeader } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { FormInput, FormSelect, FormTextarea } from '@/components/common/FormInput';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    BriefcaseIcon,
    CheckCircleIcon,
    ClockIcon,
    DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

// Custom Icons from Design
const JOB_ICONS = {
    social: {
        label: "Social Media",
        color: "blue",
        bg: "bg-blue-100",
        text: "text-blue-600",
        border: "border-blue-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
    },
    banner: {
        label: "Banner Web",
        color: "purple",
        bg: "bg-purple-100",
        text: "text-purple-600",
        border: "border-purple-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    },
    print: {
        label: "Print Ad",
        color: "orange",
        bg: "bg-orange-100",
        text: "text-orange-600",
        border: "border-orange-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
    },
    edm: {
        label: "EDM",
        color: "teal",
        bg: "bg-teal-100",
        text: "text-teal-600",
        border: "border-teal-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    },
    video: {
        label: "Video Clip",
        color: "red",
        bg: "bg-red-100",
        text: "text-red-600",
        border: "border-red-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
    },
    key_visual: {
        label: "Key Visual",
        color: "pink",
        bg: "bg-pink-100",
        text: "text-pink-600",
        border: "border-pink-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    }
};

const AVAILABLE_ATTACHMENTS = ['Logo', 'Product Image', 'Size Spec', 'Print Spec', 'Script', 'Storyboard', 'Music Ref', 'Mood & Tone', 'Reference'];

export default function AdminJobTypeSLA() {
    const [jobTypes, setJobTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sla: 3,
        attachments: [],
        icon: 'social',
        status: 'active'
    });

    // ============================================
    // Load Data
    // ============================================
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await api.getJobTypes();
            setJobTypes(data || []);
        } catch (error) {
            console.error("Failed to fetch job types", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ============================================
    // Actions
    // ============================================
    const handleOpenModal = (mode, item = null) => {
        setModalMode(mode);
        if (mode === 'edit' && item) {
            setSelectedId(item.id);
            setFormData({
                name: item.name,
                description: item.description || '',
                sla: item.sla,
                attachments: item.attachments || [],
                icon: item.icon || 'social', // Map old icons if necessary later, or assume updated data
                status: item.status || 'active'
            });
        } else {
            // Reset for Add
            setSelectedId(null);
            setFormData({
                name: '',
                description: '',
                sla: 3,
                attachments: ['Logo', 'Product Image'],
                icon: 'social',
                status: 'active'
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (modalMode === 'add') {
                await api.createJobType(formData);
            } else {
                await api.updateJobType(selectedId, formData);
            }
            setShowModal(false);
            fetchData(); // Reload
        } catch (error) {
            alert('Error saving: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this Job Type?')) {
            try {
                await api.deleteJobType(id);
                fetchData();
            } catch (error) {
                alert('Error deleting: ' + error.message);
            }
        }
    };

    // Form Handlers
    const handleAttachmentChange = (item) => {
        setFormData(prev => {
            if (prev.attachments.includes(item)) {
                return { ...prev, attachments: prev.attachments.filter(a => a !== item) };
            } else {
                return { ...prev, attachments: [...prev.attachments, item] };
            }
        });
    };

    // Stats Calculation
    const activeCount = jobTypes.filter(j => j.status === 'active').length;
    const avgSLA = jobTypes.length ? (jobTypes.reduce((acc, curr) => acc + Number(curr.sla), 0) / jobTypes.length).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Job Type & SLA Management</h1>
                    <p className="text-gray-500">จัดการประเภทงานและระยะเวลา SLA</p>
                </div>
                <Button onClick={() => handleOpenModal('add')}>
                    <PlusIcon className="w-5 h-5" /> Add Job Type
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AdminStatCard label="Total Job Types" value={jobTypes.length} icon={<BriefcaseIcon className="w-5 h-5 text-rose-600" />} color="rose" />
                <AdminStatCard label="Active" value={activeCount} icon={<CheckCircleIcon className="w-5 h-5 text-green-600" />} color="green" />
                <AdminStatCard label="Avg SLA (Days)" value={avgSLA} icon={<ClockIcon className="w-5 h-5 text-blue-600" />} color="blue" />
                <AdminStatCard label="Total DJs This Month" value="156" icon={<DocumentDuplicateIcon className="w-5 h-5 text-purple-600" />} color="purple" />
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <CardHeader title="Job Types Configuration" />
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <Th>Job Type</Th>
                                <Th>Description</Th>
                                <Th className="text-center">SLA (Days)</Th>
                                <Th>Required Attachments</Th>
                                <Th className="text-center">Status</Th>
                                <Th className="text-center">Actions</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : jobTypes.map((item) => {
                                const iconConfig = JOB_ICONS[item.icon] || JOB_ICONS.social;
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 ${iconConfig.bg} rounded-lg flex items-center justify-center ${iconConfig.text}`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        {iconConfig.path}
                                                    </svg>
                                                </div>
                                                <span className="font-medium text-gray-900">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-3 py-1 bg-green-100 text-green-700 font-medium rounded-full text-sm">{item.sla} วัน</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {item.attachments?.map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{tag}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge status={item.status === 'active' ? 'normal' : 'waiting'} label={item.status} className={item.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleOpenModal('edit', item)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">{modalMode === 'add' ? 'Add New Job Type' : 'Edit Job Type'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <FormInput
                                label="Job Type Name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <FormTextarea
                                label="Description"
                                rows="2"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput
                                    label="SLA (Working Days)"
                                    type="number"
                                    required
                                    value={formData.sla}
                                    onChange={(e) => setFormData({ ...formData, sla: e.target.value })}
                                />
                                <FormSelect
                                    label="Status"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </FormSelect>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Required Attachments</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {AVAILABLE_ATTACHMENTS.map(item => (
                                        <label key={item} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                                checked={formData.attachments.includes(item)}
                                                onChange={() => handleAttachmentChange(item)}
                                            />
                                            <span className="text-sm text-gray-700">{item}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                                <div className="flex gap-2">
                                    {Object.keys(JOB_ICONS).map(iconName => {
                                        const iconConfig = JOB_ICONS[iconName];
                                        const isSelected = formData.icon === iconName;
                                        return (
                                            <div
                                                key={iconName}
                                                onClick={() => setFormData({ ...formData, icon: iconName })}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 cursor-pointer transition-all ${isSelected ? `${iconConfig.bg} ${iconConfig.border} ${iconConfig.text}` : 'bg-gray-50 border-transparent hover:border-gray-300 text-gray-400'}`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {iconConfig.path}
                                                </svg>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave}>Save Job Type</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helpers
function AdminStatCard({ label, value, icon, color }) {
    const colors = {
        rose: "bg-rose-100",
        green: "bg-green-100",
        blue: "bg-blue-100",
        purple: "bg-purple-100"
    };
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 ${colors[color]} rounded-lg flex items-center justify-center`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
            </div>
        </div>
    );
}

function Th({ children, className = "text-left" }) {
    return <th className={`px-6 py-3 text-xs font-semibold text-gray-600 uppercase ${className}`}>{children}</th>;
}
