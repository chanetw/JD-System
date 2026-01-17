/**
 * @file ApproverPortal.jsx
 * @description Portal สำหรับ Approver (Head/Manager)
 * 
 * Quick Actions: รออนุมัติ, ประวัติ, SLA, Media
 * Sections: Jobs Table (รออนุมัติ), SLA
 * ไม่แสดง: Media Grid, Job Types, Tips (ไม่จำเป็นสำหรับ Approver)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getJobs } from '@/services/mockApi';

// Shared Components
import PortalNav from './shared/PortalNav';
import PortalHero from './shared/PortalHero';
import QuickActions from './shared/QuickActions';
import JobsTable from './shared/JobsTable';
import SLAWidget from './shared/SLAWidget';
import PortalFooter from './shared/PortalFooter';

// Icons
import {
    ClockIcon,
    ClipboardDocumentCheckIcon,
    PhotoIcon,
    DocumentCheckIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function ApproverPortal() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [pendingJobs, setPendingJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingCount, setPendingCount] = useState(0);

    // Quick Actions สำหรับ Approver
    const actions = [
        {
            to: '/approvals',
            icon: <ClockIcon className="w-7 h-7 text-amber-600" />,
            bgColor: 'bg-amber-100 group-hover:bg-amber-200',
            title: 'รออนุมัติ',
            desc: 'งานที่รอการอนุมัติ',
            badge: pendingCount > 0 ? `${pendingCount}` : null
        },
        {
            to: '/approvals?tab=history',
            icon: <DocumentCheckIcon className="w-7 h-7 text-emerald-600" />,
            bgColor: 'bg-emerald-100 group-hover:bg-emerald-200',
            title: 'ประวัติการอนุมัติ',
            desc: 'ดูงานที่อนุมัติแล้ว'
        },
        {
            to: '/admin/job-types',
            icon: <ClipboardDocumentCheckIcon className="w-7 h-7 text-indigo-600" />,
            bgColor: 'bg-indigo-100 group-hover:bg-indigo-200',
            title: 'SLA & ประเภทงาน',
            desc: 'ดูเวลาดำเนินการ'
        },
        {
            to: '/media-portal',
            icon: <PhotoIcon className="w-7 h-7 text-rose-600" />,
            bgColor: 'bg-rose-100 group-hover:bg-rose-200',
            title: 'Media Portal',
            desc: 'คลังไฟล์งาน'
        }
    ];

    // โหลดงานรออนุมัติ
    useEffect(() => {
        const loadJobs = async () => {
            try {
                const jobs = await getJobs();
                // งานที่รออนุมัติ
                const pending = jobs.filter(j =>
                    j.status === 'pending_approval' || j.status === 'waiting_approval'
                );
                setPendingJobs(pending.slice(0, 5));
                setPendingCount(pending.length);
            } catch (err) {
                console.error('Error loading jobs:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadJobs();
    }, [user]);

    // ค้นหา
    const handleSearch = (query) => {
        if (query.trim()) {
            navigate(`/approvals?search=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <PortalNav />

            <main className="pt-16 pb-12">
                <PortalHero
                    title="สวัสดี, ผู้อนุมัติ"
                    subtitle="ตรวจสอบและอนุมัติงานที่รอดำเนินการ"
                    searchPlaceholder="ค้นหา DJ ID ที่รออนุมัติ..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchSubmit={handleSearch}
                />

                <QuickActions actions={actions} />

                {/* Alert: งานด่วน */}
                {pendingJobs.some(j => j.isOverdue) && (
                    <div className="max-w-6xl mx-auto px-6 mt-8">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                            <div>
                                <p className="font-medium text-red-800">มีงานเกินกำหนดรออนุมัติ!</p>
                                <p className="text-sm text-red-600">กรุณาตรวจสอบและอนุมัติโดยด่วน</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content: Jobs + SLA */}
                <div className="max-w-6xl mx-auto px-6 mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <JobsTable
                                title="งานรออนุมัติ"
                                jobs={pendingJobs}
                                isLoading={isLoading}
                                viewAllLink="/approvals"
                            />
                        </div>
                        <div>
                            <SLAWidget showContact={true} />
                        </div>
                    </div>
                </div>

            </main>

            <PortalFooter />
        </div>
    );
}
