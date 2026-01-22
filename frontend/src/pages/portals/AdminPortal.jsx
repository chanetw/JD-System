/**
 * @file AdminPortal.jsx
 * @description หน้าจอหลักสำหรับผู้ดูแลระบบ (Admin Portal)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงภาพรวมของระบบ (Dashboard) สำหรับผู้ดูแลระบบ
 * - ให้ทางลัด (Quick Actions) ไปยังส่วนการจัดการต่าง ๆ เช่น User, Job Types, Media
 * - แสดงรายการงานล่าสุดทั้งระบบเพื่อให้ตรวจสอบสถานะได้ทันที
 * - แสดงการแจ้งเตือนกรณีมีงานที่เกินกำหนด (Overdue Alert)
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    UsersIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    PhotoIcon,
    ExclamationTriangleIcon,
    DocumentChartBarIcon
} from '@heroicons/react/24/outline';

export default function AdminPortal() {
    const navigate = useNavigate();
    /** ข้อมูลผู้ใช้งานปัจจุบันจาก store */
    const { user } = useAuthStore();

    // === สถานะข้อมูล (Data States) ===
    const [allJobs, setAllJobs] = useState([]);      // รายการงานล่าสุด 6 รายการ
    const [isLoading, setIsLoading] = useState(true); // สถานะการโหลดข้อมูล
    const [searchQuery, setSearchQuery] = useState(''); // คำค้นหาในหน้า Dashboard
    const [stats, setStats] = useState({ total: 0, overdue: 0 }); // สถิติภาพรวม

    // Quick Actions สำหรับ Admin
    /** รายการทางลัดการจัดการ (Quick Action Cards) */
    const actions = [
        {
            to: '/admin/users',
            icon: <UsersIcon className="w-7 h-7 text-indigo-600" />,
            bgColor: 'bg-indigo-100 group-hover:bg-indigo-200',
            title: 'จัดการผู้ใช้งาน',
            desc: 'เพิ่มหรือแก้ไขข้อมูลผู้ใช้งานในระบบ'
        },
        {
            to: '/',
            icon: <ChartBarIcon className="w-7 h-7 text-emerald-600" />,
            bgColor: 'bg-emerald-100 group-hover:bg-emerald-200',
            title: 'แดชบอร์ดภาพรวม',
            desc: 'สรุปสถิติการใช้ระบบทั้งหมด'
        },
        {
            to: '/admin/job-types',
            icon: <Cog6ToothIcon className="w-7 h-7 text-amber-600" />,
            bgColor: 'bg-amber-100 group-hover:bg-amber-200',
            title: 'ตั้งค่าระบบงาน',
            desc: 'SLA, วันหยุด และลำดับการอนุมัติ'
        },
        {
            to: '/media-portal',
            icon: <PhotoIcon className="w-7 h-7 text-rose-600" />,
            bgColor: 'bg-rose-100 group-hover:bg-rose-200',
            title: 'ศูนย์จัดการสื่อ',
            desc: 'คลังไฟล์งานและภาพที่ส่งมอบ'
        }
    ];

    /** โหลดข้อมูลงานและสถิติภาพรวมเมื่อเปิดหน้าจอ */
    useEffect(() => {
        const loadData = async () => {
            try {
                const jobs = await api.getJobs();
                // เลือกมาแสดงเพียง 6 รายการล่าสุดในหน้าแรก
                setAllJobs(jobs.slice(0, 6));

                const dashStats = await api.getDashboardStats();
                setStats({
                    total: jobs.length,
                    overdue: dashStats.overdue || 0
                });
            } catch (err) {
                console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user]);

    /** จัดการการค้นหางาน (จะนำไปยังหน้า Job List พร้อม Filter) */
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
                    title="ศูนย์จัดการระบบ (Admin Dashboard)"
                    subtitle="จัดการระบบและตรวจสอบภาพรวมงานทั้งหมด"
                    searchPlaceholder="ค้นหาเลขงานหรือหัวข้อ..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchSubmit={handleSearch}
                />

                <QuickActions actions={actions} />

                {/* Stats Cards */}
                <div className="max-w-6xl mx-auto px-6 mt-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="งานทั้งหมด" value={stats.total} color="bg-blue-500" />
                        <StatCard label="งาน Overdue" value={stats.overdue} color="bg-red-500" />
                        <StatCard label="ผู้ใช้งาน" value="24" color="bg-emerald-500" />
                        <StatCard label="ประเภทงาน" value="6" color="bg-purple-500" />
                    </div>
                </div>

                {/* Alert: งาน Overdue */}
                {stats.overdue > 0 && (
                    <div className="max-w-6xl mx-auto px-6 mt-6">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                            <div>
                                <p className="font-medium text-red-800">มี {stats.overdue} งานเกินกำหนด</p>
                                <p className="text-sm text-red-600">กรุณาตรวจสอบและดำเนินการ</p>
                            </div>
                            <Link to="/jobs?status=overdue" className="ml-auto text-red-600 hover:underline text-sm">ดูรายการ</Link>
                        </div>
                    </div>
                )}

                {/* Content: Jobs + SLA */}
                <div className="max-w-6xl mx-auto px-6 mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <JobsTable
                                title="งานล่าสุดทั้งระบบ"
                                jobs={allJobs}
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

/**
 * StatCard: การ์ดแสดงผลตัวเลขสถิติประกอบไอคอน
 * @param {object} props
 * @param {string} props.label - หัวข้อสถิติ
 * @param {string|number} props.value - ตัวเลขหรือข้อความที่แสดง
 * @param {string} props.color - คลาสสีพื้นหลังของไอคอน
 */
function StatCard({ label, value, color }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white mb-3`}>
                <DocumentChartBarIcon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
        </div>
    );
}
