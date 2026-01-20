/**
 * @file ApproverPortal.jsx
 * @description หน้าจอหลักสำหรับผู้อนุมัติ (Approver Portal)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงรายการงานที่รอการตรวจสอบและอนุมัติ (Pending Approvals)
 * - ให้ทางลัดไปยังประวัติการอนุมัติและคลังสื่อ
 * - สรุปสถิติการอนุมัติงานและสถานะ SLA ของงานที่รออยู่
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
import ApprovalStatsWidget from './shared/ApprovalStatsWidget';
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
    /** ข้อมูลผู้ใช้งานปัจจุบันจาก store */
    const { user } = useAuthStore();

    // === สถานะข้อมูล (Data States) ===
    const [pendingJobs, setPendingJobs] = useState([]);    // รายการงานที่รออนุมัติ (5 รายการล่าสุด)
    const [isLoading, setIsLoading] = useState(true);     // สถานะการโหลดข้อมูล
    const [searchQuery, setSearchQuery] = useState('');   // คำค้นหา
    const [pendingCount, setPendingCount] = useState(0);   // จำนวนงานที่รออนุมัติทั้งหมด

    // Quick Actions สำหรับ Approver
    /** รายการทางลัดการทำงาน (Quick Action Cards) */
    const actions = [
        {
            to: '/approvals',
            icon: <ClockIcon className="w-7 h-7 text-amber-600" />,
            bgColor: 'bg-amber-100 group-hover:bg-amber-200',
            title: 'รออนุมัติ',
            desc: 'งานที่รอยืนยันจากคุณ',
            badge: pendingCount > 0 ? `${pendingCount}` : null
        },
        {
            to: '/approvals?tab=history',
            icon: <DocumentCheckIcon className="w-7 h-7 text-emerald-600" />,
            bgColor: 'bg-emerald-100 group-hover:bg-emerald-200',
            title: 'ประวัติการอนุมัติ',
            desc: 'ดูรายการงานที่อนุมัติไปแล้ว'
        },
        {
            to: '/admin/job-types',
            icon: <ClipboardDocumentCheckIcon className="w-7 h-7 text-indigo-600" />,
            bgColor: 'bg-indigo-100 group-hover:bg-indigo-200',
            title: 'SLA & ประเภทงาน',
            desc: 'ข้อมูลเป้าหมายเวลาตามประเภทงาน'
        },
        {
            to: '/media-portal',
            icon: <PhotoIcon className="w-7 h-7 text-rose-600" />,
            bgColor: 'bg-rose-100 group-hover:bg-rose-200',
            title: 'ศูนย์จัดการสื่อ',
            desc: 'คลังไฟล์งานออกแบบที่เสร็จสิ้น'
        }
    ];

    /** โหลดรายการงานที่รอการอนุมัติ */
    useEffect(() => {
        const loadJobs = async () => {
            try {
                const jobs = await getJobs();
                // คัดกรองเฉพาะงานที่มีสถานะรอการอนุมัติ
                const pending = jobs.filter(j =>
                    j.status === 'pending_approval' || j.status === 'waiting_approval'
                );
                // แสดง 5 รายการล่าสุดบนหน้าแรกของ Portal
                setPendingJobs(pending.slice(0, 5));
                setPendingCount(pending.length);
            } catch (err) {
                console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadJobs();
    }, [user]);

    /** จัดการการค้นหางาน (นำไปยังหน้าคิวอนุมัติพร้อมระบุเลข DJ ID) */
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
                            <ApprovalStatsWidget />
                        </div>
                    </div>
                </div>

            </main>

            <PortalFooter />
        </div>
    );
}
