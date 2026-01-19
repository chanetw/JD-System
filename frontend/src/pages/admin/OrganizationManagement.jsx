/**
 * @file OrganizationManagement.jsx
 * @description Master Data: Organization Structure (Tenants / BUDs / Projects)
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/services/apiService';
import { Card, CardHeader } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { FormInput, FormSelect } from '@/components/common/FormInput';
import {
    PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
    BuildingOfficeIcon, FolderIcon, BuildingLibraryIcon
} from '@heroicons/react/24/outline';

const TABS = [
    { id: 'projects', label: 'Projects', icon: FolderIcon },
    { id: 'buds', label: 'BUDs (Departments)', icon: BuildingOfficeIcon },
    { id: 'tenants', label: 'Tenants (Companies)', icon: BuildingLibraryIcon },
];

export default function OrganizationManagement() {
    const [activeTab, setActiveTab] = useState('projects');

    // Data States
    const [tenants, setTenants] = useState([]);
    const [buds, setBuds] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedItem, setSelectedItem] = useState(null);
    const [formData, setFormData] = useState({});

    // Load Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const masterData = await api.getMasterData();
            setTenants(masterData.tenants || []);
            setBuds(masterData.buds || []);
            setProjects(masterData.projects || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle Modal Open
    const handleOpenModal = (mode, item = null) => {
        setModalMode(mode);
        setSelectedItem(item);

        // Reset Form based on Tab
        if (mode === 'add') {
            if (activeTab === 'projects') {
                setFormData({ name: '', code: '', tenantId: '', budId: '', status: 'Active' });
            } else if (activeTab === 'buds') {
                setFormData({ name: '', code: '', tenantId: '', isActive: true });
            } else if (activeTab === 'tenants') {
                setFormData({ name: '', code: '', subdomain: '', isActive: true });
            }
        } else {
            // Edit Mode - Pre-fill
            setFormData({ ...item });
        }
        setShowModal(true);
    };

    // CRUD Actions
    const handleSave = async () => {
        try {
            if (activeTab === 'projects') {
                if (modalMode === 'add') await api.createProject(formData);
                else await api.updateProject(selectedItem.id, formData);
            } else if (activeTab === 'buds') {
                if (modalMode === 'add') await api.createBud(formData);
                else await api.updateBud(selectedItem.id, formData);
            } else if (activeTab === 'tenants') {
                if (modalMode === 'add') await api.createTenant(formData);
                else await api.updateTenant(selectedItem.id, formData);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            if (activeTab === 'projects') await api.deleteProject(id);
            else if (activeTab === 'buds') await api.deleteBud(id);
            else if (activeTab === 'tenants') await api.deleteTenant(id);
            fetchData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // --- RENDER HELPERS ---

    const renderProjectsTable = () => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Project Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">BUD</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {projects.map((item) => {
                    // Find related BUD
                    const bud = buds.find(b => b.id === (typeof item.bud === 'object' ? item.bud.id : item.budId)) || {};
                    return (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                        <FolderIcon className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-900">{item.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{bud.name || item.bud?.name || '-'}</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.status || 'Unknown'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Actions id={item.id} item={item} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    const renderBudsTable = () => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">BUD Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {buds.map((item) => {
                    const tenant = tenants.find(t => t.id === item.tenantId) || {};
                    return (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{tenant.name || '-'}</td>
                            <td className="px-6 py-4 text-center">
                                <StatusBadge isActive={item.isActive} />
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Actions id={item.id} item={item} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    const renderTenantsTable = () => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subdomain</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {tenants.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.subdomain}</td>
                        <td className="px-6 py-4 text-center">
                            <StatusBadge isActive={item.isActive} />
                        </td>
                        <td className="px-6 py-4 text-center">
                            <Actions id={item.id} item={item} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const Actions = ({ id, item }) => (
        <div className="flex items-center justify-center gap-2">
            <button onClick={() => handleOpenModal('edit', item)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <PencilIcon className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );

    const StatusBadge = ({ isActive }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {isActive ? 'Active' : 'Inactive'}
        </span>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Organization Data</h1>
                    <p className="text-gray-500">Manage Tenants, Departments (BUD), and Projects</p>
                </div>
                <Button onClick={() => handleOpenModal('add')}>
                    <PlusIcon className="w-5 h-5" /> Add {TABS.find(t => t.id === activeTab)?.label.split(' ')[0]}
                </Button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                    ${isActive
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    {/* Render table based on active tab */}
                    {activeTab === 'projects' && renderProjectsTable()}
                    {activeTab === 'buds' && renderBudsTable()}
                    {activeTab === 'tenants' && renderTenantsTable()}
                </div>
            </Card>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {modalMode === 'add' ? 'Add' : 'Edit'} {TABS.find(t => t.id === activeTab)?.label.split(' ')[0]}
                            </h3>
                            <button onClick={() => setShowModal(false)}><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">

                            {/* --- TENANT FORM --- */}
                            {activeTab === 'tenants' && (
                                <>
                                    <FormInput label="Company Name" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormInput label="Code" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                                        <FormInput label="Subdomain" value={formData.subdomain || ''} onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })} />
                                    </div>
                                </>
                            )}

                            {/* --- BUD FORM --- */}
                            {activeTab === 'buds' && (
                                <>
                                    <FormInput label="Department (BUD) Name" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    <FormInput label="Code" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                                    <FormSelect label="Tenant" value={formData.tenantId || ''} onChange={(e) => setFormData({ ...formData, tenantId: parseInt(e.target.value) })}>
                                        <option value="">-- Select Tenant --</option>
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </FormSelect>
                                </>
                            )}

                            {/* --- PROJECT FORM --- */}
                            {activeTab === 'projects' && (
                                <>
                                    <FormInput label="Project Name" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    <FormInput label="Code" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />

                                    {/* Dependent Dropdowns */}
                                    <FormSelect label="Tenant" value={formData.tenantId || ''} onChange={(e) => setFormData({ ...formData, tenantId: parseInt(e.target.value) })}>
                                        <option value="">-- Select Tenant --</option>
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </FormSelect>

                                    <FormSelect label="BUD" value={formData.budId || ''} onChange={(e) => setFormData({ ...formData, budId: parseInt(e.target.value) })}>
                                        <option value="">-- Select BUD --</option>
                                        {buds.
                                            filter(b => !formData.tenantId || b.tenantId === formData.tenantId)
                                            .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </FormSelect>

                                    <FormSelect label="Status" value={formData.status || 'Active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </FormSelect>
                                </>
                            )}

                        </div>
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
