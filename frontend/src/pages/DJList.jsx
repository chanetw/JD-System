/**
 * @file DJList.jsx
 * @description หน้ารายการงาน DJ ทั้งหมด (DJ Job List)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';

// Icons
import {
    PlusIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline'; // สมมติว่าใช้ Heroicons

export default function DJList() {
    return (
        <div className="space-y-6">
            {/* ============================================
          Page Title
          ============================================ */}
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

            {/* ============================================
          Filters Section
          ============================================ */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <FilterSelect label="Project" options={['Sena Park Grand', 'Sena Villa']} />
                    <FilterSelect label="BUD" options={['BUD 1', 'BUD 2']} />
                    <FilterSelect label="Job Type" options={['Online Artwork', 'Print Artwork']} />
                    <FilterSelect label="Status" options={['Draft', 'In Progress', 'Approved']} />
                    <FilterSelect label="Assignee" options={['กานต์', 'มานี']} />
                    <FilterSelect label="Priority" options={['Normal', 'Urgent']} />
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" className="rounded border-gray-300 text-rose-500 focus:ring-rose-500" />
                        Only Scheduled (auto-submit)
                    </label>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="text-sm">Clear</Button>
                        <Button className="text-sm">Apply Filter</Button>
                    </div>
                </div>
            </div>

            {/* ============================================
          Results Table
          ============================================ */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-600">แสดง <strong>12</strong> รายการ</p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">เรียงตาม:</span>
                        <select className="text-sm border border-gray-300 rounded-lg px-2 py-1">
                            <option>Created Date (ล่าสุด)</option>
                            <option>Deadline (ใกล้สุด)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
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
                            {/* Mock Data Rows */}
                            <JobRow
                                id="DJ-2024-0156"
                                project="Sena Park Grand"
                                type="Online Artwork"
                                subject="Banner Facebook Q1"
                                status="in_progress"
                                submitDate="27 ธ.ค. 67"
                                deadline="3 ม.ค. 68"
                                sla={<Badge status="overdue" count={2} />}
                                assignee="กานต์"
                            />
                            <JobRow
                                id="DJ-2024-0157"
                                project="Sena Villa"
                                type="Social Media"
                                subject="IG Story Promotion"
                                status="in_progress" // HTML says 'in progress' but logic might use 'in_progress'
                                submitDate="2 ม.ค. 68"
                                deadline="5 ม.ค. 68"
                                sla={<span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Due Today</span>}
                                assignee="มานี"
                            />
                            <JobRow
                                id="DJ-2024-0162"
                                project="Sena Ecotown"
                                type="Print Artwork"
                                subject="Brochure Launch"
                                status="scheduled"
                                submitDate="6 ม.ค. 08:00"
                                deadline="-"
                                sla={<span className="text-xs text-violet-600">Auto 08:00</span>}
                                assignee="-"
                                rowClass="bg-violet-50/30"
                            />
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">แสดง 1-3 จาก 12 รายการ</p>
                    <div className="flex gap-1">
                        <Button variant="secondary" className="px-3" disabled>&laquo;</Button>
                        <Button variant="primary" className="px-3">1</Button>
                        <Button variant="secondary" className="px-3">2</Button>
                        <Button variant="secondary" className="px-3">&raquo;</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function FilterSelect({ label, options }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">ทั้งหมด</option>
                {options.map(opt => <option key={opt}>{opt}</option>)}
            </select>
        </div>
    );
}

function Th({ children }) {
    return (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{children}</th>
    );
}

function JobRow({ id, project, type, subject, status, submitDate, deadline, sla, assignee, rowClass = 'hover:bg-gray-50' }) {
    return (
        <tr className={rowClass}>
            <td className="px-4 py-3"><Link to={`/jobs/${id}`} className="text-rose-600 font-medium hover:underline">{id}</Link></td>
            <td className="px-4 py-3 text-sm">{project}</td>
            <td className="px-4 py-3 text-sm">{type}</td>
            <td className="px-4 py-3 text-sm max-w-xs truncate">{subject}</td>
            <td className="px-4 py-3"><Badge status={status} /></td>
            <td className="px-4 py-3 text-sm text-gray-500">{submitDate}</td>
            <td className="px-4 py-3 text-sm">{deadline}</td>
            <td className="px-4 py-3">{sla}</td>
            <td className="px-4 py-3 text-sm">{assignee}</td>
            <td className="px-4 py-3">
                <Link to={`/jobs/${id}`} className="text-sm text-rose-600 hover:underline">View</Link>
            </td>
        </tr>
    );
}


