/**
 * @file AssigneePortal.jsx
 * @description หน้าจอหลักสำหรับนักออกแบบ (Assignee Portal/Graphic Designer)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงงานที่ได้รับมอบหมายและสถานะความคืบหน้า (My Jobs)
 * - ให้ทางลัดไปยังกลุ่มงานประเภทต่าง ๆ เช่น งานใหม่, งานที่กำลังทำ, งานที่ส่งมอบแล้ว
 * - แจ้งเตือนกรณีมีงานที่เกินกำหนดส่ง (Overdue Alert)
 * - สรุปสถิติงานในความรับผิดชอบเบื้องต้น
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/apiService';

// Shared Components
import PortalNav from './shared/PortalNav';
import PortalHero from './shared/PortalHero';
import QuickActions from './shared/QuickActions';
import JobsTable from './shared/JobsTable';
import SLAWidget from './shared/SLAWidget';
import PortalFooter from './shared/PortalFooter';

// Icons
import {
    InboxArrowDownIcon,
    WrenchScrewdriverIcon,
    CheckCircleIcon,
    PhotoIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function AssigneePortal() {
    const navigate = useNavigate();
    /** ข้อมูลผู้ใช้งานปัจจุบันจาก store */
    const { user } = useAuthStore();

    // === สถานะข้อมูล (Data States) ===
    const [myJobs, setMyJobs] = useState([]);      // รายการงานที่ได้รับมอบหมาย (5 รายการล่าสุด)
    const [isLoading, setIsLoading] = useState(true); // สถานะการโหลดข้อมูล
    const [searchQuery, setSearchQuery] = useState(''); // คำค้นหา
    const [stats, setStats] = useState({ newJobs: 0, inProgress: 0, delivered: 0 }); // สถิติจำแนกตามสถานะ

    // Quick Actions สำหรับ Assignee
    /** รายการทางลัดการทำงาน (Quick Action Cards) */
    const actions = [
        {
            to: '/jobs?status=assigned',
            icon: <InboxArrowDownIcon className="w-7 h-7 text-blue-600" />,
            bgColor: 'bg-blue-100 group-hover:bg-blue-200',
            title: 'งานใหม่',
            desc: 'งานที่รอการเริ่มดำเนินการ',
            badge: stats.newJobs > 0 ? `${stats.newJobs}` : null
        },
        {
            to: '/jobs?status=in_progress',
            icon: <WrenchScrewdriverIcon className="w-7 h-7 text-amber-600" />,
            bgColor: 'bg-amber-100 group-hover:bg-amber-200',
            title: 'กำลังทำ',
            desc: 'งานที่อยู่ระหว่างการออกแบบ',
            badge: stats.inProgress > 0 ? `${stats.inProgress}` : null
        },
        {
            to: '/jobs?status=delivered',
            icon: <CheckCircleIcon className="w-7 h-7 text-emerald-600" />,
            bgColor: 'bg-emerald-100 group-hover:bg-emerald-200',
            title: 'ส่งมอบแล้ว',
            desc: 'งานที่ส่งตรวจหรือเสร็จสิ้น'
        },
        {
            to: '/media-portal',
            icon: <PhotoIcon className="w-7 h-7 text-rose-600" />,
            bgColor: 'bg-rose-100 group-hover:bg-rose-200',
            title: 'ศูนย์จัดการสื่อ',
            desc: 'คลังไฟล์งานต้นฉบับและที่ส่งมอบ'
        }
    ];

    /** โหลดงานที่นักออกแบบคนนี้รับผิดชอบ */
    useEffect(() => {
        const loadJobs = async () => {
            try {
                const jobs = await api.getJobs();
                // คัดกรองงานที่มอบหมายให้ผู้ใช้ปัจจุบัน (หรือชื่อ "กานต์" ในกรณี Mock)
                const assigned = jobs.filter(j =>
                    j.assigneeName === 'กานต์' || j.assigneeId === user?.id
                );
                // แสดง 5 รายการล่าสุดบนหน้าแรก
                setMyJobs(assigned.slice(0, 5));

                // คำนวณสถิติจำแนกตามประเภทงานเพื่อแสดงตัวเลขบน Badge
                setStats({
                    newJobs: assigned.filter(j => j.status === 'assigned' || j.status === 'approved').length,
                    inProgress: assigned.filter(j => j.status === 'in_progress').length,
                    delivered: assigned.filter(j => j.status === 'delivered' || j.status === 'completed').length
                });
            } catch (err) {
                console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลงาน:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadJobs();
    }, [user]);

    /** จัดการการค้นหางาน (นำไปยังหน้ารายการงานพร้อมระบุคำค้นหา) */
    const handleSearch = (query) => {
        if (query.trim()) {
            navigate(`/jobs?search=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <PortalNav />

            <main className="pt-16 pb-12">
                <PortalHero
                    title="สวัสดี, นักออกแบบ"
                    subtitle="จัดการงานที่ได้รับมอบหมาย"
                    searchPlaceholder="ค้นหางานของคุณ..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchSubmit={handleSearch}
                />

                <QuickActions actions={actions} />

                {/* Alert: งานเกินกำหนด */}
                {myJobs.some(j => j.isOverdue) && (
                    <div className="max-w-6xl mx-auto px-6 mt-8">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                            <div>
                                <p className="font-medium text-red-800">มีงานเกินกำหนด!</p>
                                <p className="text-sm text-red-600">กรุณาดำเนินการโดยด่วน</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content: Jobs + SLA */}
                <div className="max-w-6xl mx-auto px-6 mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <JobsTable
                                title="งานของฉัน"
                                jobs={myJobs}
                                isLoading={isLoading}
                                viewAllLink="/jobs"
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
