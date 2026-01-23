/**
 * @file DJList.jsx
 * @description หน้ารายการงาน DJ ทั้งหมด (DJ Job List)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงรายการงาน Design Job (DJ) ทั้งหมดในระบบ พร้อมระบบคัดกรองข้อมูล (Filters)
 * - ค้นหางานด้วยเลขที่ DJ ID หรือหัวข้องาน (Subject)
 * - สนับสนุนการจัดเรียงข้อมูล (Sorting) ตามวันที่สร้างและวันกำหนดส่ง (Deadline)
 * - มีระบบจัดการหน้าข้อมูล (Pagination) เพื่อประสิทธิภาพในการแสดงผล
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import { api } from '@shared/services/apiService';
import { formatDateToThai } from '@shared/utils/dateUtils';

// Icons
import {
    PlusIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function DJList() {
    // === สถานะข้อมูล (Data Management States) ===
    const [jobs, setJobs] = useState([]);          // ข้อมูลงานต้นฉบับทั้งหมดจาก API
    const [filteredJobs, setFilteredJobs] = useState([]); // ข้อมูลงานที่ผ่านการคัดกรองแล้ว
    const [masterData, setMasterData] = useState({ projects: [], jobTypes: [], buds: [] }); // ข้อมูลอ้างอิงสำหรับ Filter
    const [isLoading, setIsLoading] = useState(true); // สถานะการโหลดข้อมูล

    // === สถานะการคัดกรอง (Filter States) ===
    const [filters, setFilters] = useState({
        project: '',
        bud: '',
        jobType: '',
        status: '',
        assignee: '',
        priority: '',
        onlyScheduled: false // แสดงเฉพาะงานที่ตั้งเวลาส่งล่วงหน้า (auto-submit)
    });

    // === สถานะการค้นหาและจัดเรียง (Search & Sort States) ===
    const [searchQuery, setSearchQuery] = useState(''); // ข้อความที่ใช้ค้นหา
    const [sortBy, setSortBy] = useState('createdDate'); // รูปแบบการจัดเรียง (วันที่สร้าง หรือ Deadline)

    // === สถานะการจัดการหน้า (Pagination States) ===
    const [currentPage, setCurrentPage] = useState(1); // หน้าปัจจุบันที่แสดงผล
    const itemsPerPage = 10;                         // จำนวนรายการต่อหนึ่งหน้า

    // ============================================
    // Data Loading
    // ============================================
    useEffect(() => {
        loadData();
    }, []);

    /** โหลดข้อมูลงานและข้อมูลอ้างอิงจาก API */
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [jobsData, masterDataResult] = await Promise.all([
                api.getJobs(),
                api.getMasterData()
            ]);
            console.log(`[DJList] Loaded ${jobsData.length} jobs. First job:`, jobsData[0]);
            setJobs(jobsData);
            setFilteredJobs(jobsData);
            setMasterData(masterDataResult);
        } catch (error) {
            console.error('ไม่สามารถโหลดข้อมูลรายการงานได้:', error);
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

    /** ประมวลผลการคัดกรอง การค้นหา และการจัดเรียงข้อมูล */
    const applyFiltersAndSearch = () => {
        let result = [...jobs];

        // 1. นำ Filters มาใช้งาน
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

        // 2. นำ Search Query มาใช้งาน (ค้นจากเลขที่ DJ หรือหัวข้องาน)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(j =>
                (j.djId || j.id?.toString())?.toLowerCase().includes(query) ||
                j.subject?.toLowerCase().includes(query)
            );
        }

        // 3. จัดเรียงข้อมูล (Sort)
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
        setCurrentPage(1); // เมื่อเริ่มคัดกรองใหม่ ให้กลับไปที่หน้า 1 เสมอ
    };

    // ============================================
    // Event Handlers
    // ============================================
    /** เปลี่ยนค่าใน Filter */
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    /** ล้างค่าการคัดกรองทั้งหมด */
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
    /** คำนวณสถานะ SLA เพื่อแสดงผลไอคอนหรือข้อความแจ้งเตือน */
    const calculateSLA = (job) => {
        if (job.status === 'scheduled') {
            return <span className="text-xs text-violet-600">ตั้งเวลาส่ง {job.scheduledTime || '08:00'} น.</span>;
        }

        if (!job.deadline) return <span className="text-xs text-gray-400">-</span>;

        const now = new Date();
        const deadline = new Date(job.deadline);
        const diffTime = deadline - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return <Badge status="overdue" count={Math.abs(diffDays)} />;
        } else if (diffDays === 0) {
            return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">ครบกำหนดวันนี้</span>;
        } else if (diffDays === 1) {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">พรุ่งนี้</span>;
        }
        return <span className="text-xs text-gray-500">อีก {diffDays} วัน</span>;
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
            {/* ส่วนหัวของหน้าจอ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">รายการงาน DJ (DJ List)</h1>
                    <p className="text-gray-500">ค้นหาและติดตามสถานะงาน Design Job ทั้งหมด</p>
                </div>
                <Link to="/create">
                    <Button>
                        <PlusIcon className="w-5 h-5" />
                        สร้างงานใหม่ (Create DJ)
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

            {/* ส่วนคัดกรองข้อมูล (Filters Section) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <FilterSelect
                        label="โครงการ (Project)"
                        value={filters.project}
                        onChange={(val) => handleFilterChange('project', val)}
                        options={uniqueProjects}
                    />
                    <FilterSelect
                        label="หน่วยงาน (BUD)"
                        value={filters.bud}
                        onChange={(val) => handleFilterChange('bud', val)}
                        options={uniqueBuds}
                    />
                    <FilterSelect
                        label="ประเภทงาน (Job Type)"
                        value={filters.jobType}
                        onChange={(val) => handleFilterChange('jobType', val)}
                        options={masterData.jobTypes.map(jt => jt.name)}
                    />
                    <FilterSelect
                        label="สถานะ (Status)"
                        value={filters.status}
                        onChange={(val) => handleFilterChange('status', val)}
                        options={['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'rejected', 'scheduled']}
                    />
                    <FilterSelect
                        label="ผู้ออกแบบ (Assignee)"
                        value={filters.assignee}
                        onChange={(val) => handleFilterChange('assignee', val)}
                        options={uniqueAssignees}
                    />
                    <FilterSelect
                        label="ความสำคัญ (Priority)"
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
                        เฉพาะงานที่ตั้งเวลาส่งล่วงหน้า (Scheduled)
                    </label>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="text-sm" onClick={handleClearFilters}>ล้างค่า (Clear)</Button>
                        <Button className="text-sm" onClick={applyFiltersAndSearch}>ใช้งานการคัดกรอง (Apply)</Button>
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
                                    <Th>เลขที่ DJ</Th>
                                    <Th>โครงการ</Th>
                                    <Th>ประเภทงาน</Th>
                                    <Th>หัวข้อ</Th>
                                    <Th>สถานะ</Th>
                                    <Th>วันที่ส่งมา</Th>
                                    <Th>กำหนดส่ง</Th>
                                    <Th>สถานะ SLA</Th>
                                    <Th>ผู้ออกแบบ</Th>
                                    <Th>การจัดการ</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentJobs.map((job) => (
                                    <JobRow
                                        key={job.id}
                                        id={job.djId || `DJ-${job.id}`}
                                        pkId={job.id}
                                        project={job.project}
                                        type={job.jobType}
                                        subject={job.subject}
                                        status={job.status}
                                        submitDate={job.createdAt ? formatDateToThai(new Date(job.createdAt)) : '-'}
                                        deadline={job.deadline ? formatDateToThai(new Date(job.deadline)) : '-'}
                                        sla={calculateSLA(job)}
                                        assignee={job.assigneeName || '-'}
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
 * JobRow Component: แสดงแถวข้อมูลงาน DJ ในตาราง
 */
function JobRow({ id, pkId, project, type, subject, status, submitDate, deadline, sla, assignee, rowClass = 'hover:bg-gray-50' }) {
    // แยก ID จริงสำหรับการ Link (กรณีแสดงผลเป็น DJ-XXXX แต่ ID จริงคือเลข)
    // const actualId = id.toString().replace('DJ-', ''); 
    // ^ OLD logic: unreliable if id format changes. Now using pkId directly.
    console.log(`[JobRow] Rendering row for ${id}. pkId: ${pkId}, Link to: /jobs/${pkId}`);

    return (
        <tr className={rowClass}>
            <td className="px-4 py-3">
                <Link to={`/jobs/${pkId}`} className="text-rose-600 font-medium hover:underline">
                    {id}
                </Link>
            </td>
            <td className="px-4 py-3 text-sm">{project}</td>
            <td className="px-4 py-3 text-sm">{type}</td>
            <td className="px-4 py-3 text-sm max-w-xs truncate" title={subject}>{subject}</td>
            <td className="px-4 py-3"><Badge status={status} /></td>
            <td className="px-4 py-3 text-sm text-gray-500">{submitDate}</td>
            <td className="px-4 py-3 text-sm font-medium text-gray-700">{deadline}</td>
            <td className="px-4 py-3 text-center">{sla}</td>
            <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase">
                        {assignee?.[0] || '-'}
                    </div>
                    <span>{assignee}</span>
                </div>
            </td>
            <td className="px-4 py-3 text-center">
                <Link to={`/jobs/${pkId}`} className="text-sm text-rose-600 font-medium hover:text-rose-700">
                    ดูรายละเอียด
                </Link>
            </td>
        </tr>
    );
}


