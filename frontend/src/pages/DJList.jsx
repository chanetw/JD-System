/**
 * @file DJList.jsx
 * @description หน้ารายการงาน DJ ทั้งหมด (DJ Job List)
 * 
 * Features:
 * - โหลดข้อมูลจาก Mock API
 * - Filter ตาม Project, BUD, Job Type, Status, Assignee, Priority
 * - Search ตาม DJ ID และ Subject
 * - Sort ตาม Created Date และ Deadline
 * - Pagination (10 รายการต่อหน้า)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { getJobs, getMasterData } from '@/services/mockApi';
import { formatDateToThai } from '@/utils/dateUtils';

// Icons
import {
    PlusIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function DJList() {
    // ============================================
    // State Management
    // ============================================
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [masterData, setMasterData] = useState({ projects: [], jobTypes: [], buds: [] });
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [filters, setFilters] = useState({
        project: '',
        bud: '',
        jobType: '',
        status: '',
        assignee: '',
        priority: '',
        onlyScheduled: false
    });

    // Search & Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('createdDate');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // ============================================
    // Data Loading
    // ============================================
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [jobsData, masterDataResult] = await Promise.all([
                getJobs(),
                getMasterData()
            ]);
            setJobs(jobsData);
            setFilteredJobs(jobsData);
            setMasterData(masterDataResult);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // Filter & Search Logic
    // ============================================
    useEffect(() => {
        applyFiltersAndSearch();
    }, [jobs, filters, searchQuery, sortBy]);

    const applyFiltersAndSearch = () => {
        let result = [...jobs];

        // Apply Filters
        if (filters.project) {
            result = result.filter(j => j.project === filters.project);
        }
        if (filters.bud) {
            result = result.filter(j => j.bud === filters.bud);
        }
        if (filters.jobType) {
            result = result.filter(j => j.jobType === filters.jobType);
        }
        if (filters.status) {
            result = result.filter(j => j.status === filters.status);
        }
        if (filters.assignee) {
            result = result.filter(j => j.assignee === filters.assignee);
        }
        if (filters.priority) {
            result = result.filter(j => j.priority === filters.priority);
        }
        if (filters.onlyScheduled) {
            result = result.filter(j => j.status === 'scheduled');
        }

        // Apply Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(j =>
                j.id?.toLowerCase().includes(query) ||
                j.subject?.toLowerCase().includes(query)
            );
        }

        // Apply Sort
        result.sort((a, b) => {
            if (sortBy === 'createdDate') {
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
            if (sortBy === 'deadline') {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            }
            return 0;
        });

        setFilteredJobs(result);
        setCurrentPage(1); // Reset to first page
    };

    // ============================================
    // Event Handlers
    // ============================================
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            project: '',
            bud: '',
            jobType: '',
            status: '',
            assignee: '',
            priority: '',
            onlyScheduled: false
        });
        setSearchQuery('');
    };

    // ============================================
    // Pagination Logic
    // ============================================
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentJobs = filteredJobs.slice(startIndex, endIndex);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // ============================================
    // Helper: Calculate SLA Badge
    // ============================================
    const calculateSLA = (job) => {
        if (job.status === 'scheduled') {
            return <span className="text-xs text-violet-600">Auto {job.scheduledTime || '08:00'}</span>;
        }

        if (!job.deadline) return <span className="text-xs text-gray-400">-</span>;

        const now = new Date();
        const deadline = new Date(job.deadline);
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return <Badge status="overdue" count={Math.abs(diffDays)} />;
        } else if (diffDays === 0) {
            return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Due Today</span>;
        } else if (diffDays === 1) {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Due Tomorrow</span>;
        }
        return <span className="text-xs text-gray-500">{diffDays} วัน</span>;
    };

    // ============================================
    // Get Unique Values for Filters
    // ============================================
    const uniqueProjects = [...new Set(jobs.map(j => j.project))].filter(Boolean);
    const uniqueBuds = [...new Set(jobs.map(j => j.bud))].filter(Boolean);
    const uniqueAssignees = [...new Set(jobs.map(j => j.assignee))].filter(Boolean);

    // ============================================
    // Render
    // ============================================
    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">DJ List</h1>
                    <p className="text-gray-500">รายการงาน Design Job ทั้งหมด</p>
                </div>
                <Link to="/create">
                    <Button>
                        <PlusIcon className="w-5 h-5" />
                        Create DJ
                    </Button>
                </Link>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา DJ ID หรือ Subject..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <FilterSelect
                        label="Project"
                        value={filters.project}
                        onChange={(val) => handleFilterChange('project', val)}
                        options={uniqueProjects}
                    />
                    <FilterSelect
                        label="BUD"
                        value={filters.bud}
                        onChange={(val) => handleFilterChange('bud', val)}
                        options={uniqueBuds}
                    />
                    <FilterSelect
                        label="Job Type"
                        value={filters.jobType}
                        onChange={(val) => handleFilterChange('jobType', val)}
                        options={masterData.jobTypes.map(jt => jt.name)}
                    />
                    <FilterSelect
                        label="Status"
                        value={filters.status}
                        onChange={(val) => handleFilterChange('status', val)}
                        options={['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'rejected', 'scheduled']}
                    />
                    <FilterSelect
                        label="Assignee"
                        value={filters.assignee}
                        onChange={(val) => handleFilterChange('assignee', val)}
                        options={uniqueAssignees}
                    />
                    <FilterSelect
                        label="Priority"
                        value={filters.priority}
                        onChange={(val) => handleFilterChange('priority', val)}
                        options={['Normal', 'Urgent', 'High']}
                    />
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={filters.onlyScheduled}
                            onChange={(e) => handleFilterChange('onlyScheduled', e.target.checked)}
                            className="rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                        />
                        Only Scheduled (auto-submit)
                    </label>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="text-sm" onClick={handleClearFilters}>Clear</Button>
                        <Button className="text-sm" onClick={applyFiltersAndSearch}>Apply Filter</Button>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        แสดง <strong>{filteredJobs.length}</strong> รายการ
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">เรียงตาม:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                        >
                            <option value="createdDate">Created Date (ล่าสุด)</option>
                            <option value="deadline">Deadline (ใกล้สุด)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
                        </div>
                    ) : currentJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-gray-500">ไม่พบข้อมูล</p>
                            <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยน filter หรือ search query</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>DJ ID</Th>
                                    <Th>Project</Th>
                                    <Th>Job Type</Th>
                                    <Th>Subject</Th>
                                    <Th>Status</Th>
                                    <Th>Submit Date</Th>
                                    <Th>Deadline</Th>
                                    <Th>SLA</Th>
                                    <Th>Assignee</Th>
                                    <Th>Action</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentJobs.map((job) => (
                                    <JobRow
                                        key={job.id}
                                        id={job.id}
                                        project={job.project}
                                        type={job.jobType}
                                        subject={job.subject}
                                        status={job.status}
                                        submitDate={job.createdAt ? formatDateToThai(new Date(job.createdAt)) : '-'}
                                        deadline={job.deadline ? formatDateToThai(new Date(job.deadline)) : '-'}
                                        sla={calculateSLA(job)}
                                        assignee={job.assignee || '-'}
                                        rowClass={job.status === 'scheduled' ? 'bg-violet-50/30' : 'hover:bg-gray-50'}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && filteredJobs.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            แสดง {startIndex + 1}-{Math.min(endIndex, filteredJobs.length)} จาก {filteredJobs.length} รายการ
                        </p>
                        <div className="flex gap-1">
                            <Button
                                variant="secondary"
                                className="px-3"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                &laquo;
                            </Button>
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                // Show first, last, current, and adjacent pages
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <Button
                                            key={page}
                                            variant={page === currentPage ? 'primary' : 'secondary'}
                                            className="px-3"
                                            onClick={() => goToPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return <span key={page} className="px-2 text-gray-400">...</span>;
                                }
                                return null;
                            })}
                            <Button
                                variant="secondary"
                                className="px-3"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                &raquo;
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// Helper Components
// ============================================

/**
 * @component FilterSelect
 * @description Dropdown สำหรับ filter
 */
function FilterSelect({ label, value, onChange, options }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
                <option value="">ทั้งหมด</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}

/**
 * @component Th
 * @description Table header cell
 */
function Th({ children }) {
    return (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{children}</th>
    );
}

/**
 * @component JobRow
 * @description แถวข้อมูลงาน DJ
 */
function JobRow({ id, project, type, subject, status, submitDate, deadline, sla, assignee, rowClass = 'hover:bg-gray-50' }) {
    return (
        <tr className={rowClass}>
            <td className="px-4 py-3">
                <Link to={`/jobs/${id}`} className="text-rose-600 font-medium hover:underline">
                    {id}
                </Link>
            </td>
            <td className="px-4 py-3 text-sm">{project}</td>
            <td className="px-4 py-3 text-sm">{type}</td>
            <td className="px-4 py-3 text-sm max-w-xs truncate">{subject}</td>
            <td className="px-4 py-3"><Badge status={status} /></td>
            <td className="px-4 py-3 text-sm text-gray-500">{submitDate}</td>
            <td className="px-4 py-3 text-sm">{deadline}</td>
            <td className="px-4 py-3">{sla}</td>
            <td className="px-4 py-3 text-sm">{assignee}</td>
            <td className="px-4 py-3">
                <Link to={`/jobs/${id}`} className="text-sm text-rose-600 hover:underline">
                    View
                </Link>
            </td>
        </tr>
    );
}


