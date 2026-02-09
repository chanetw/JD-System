/**
 * @file UserPortal.jsx
 * @description หน้า User Portal (Self-Service) - V1 MVP ตาม Original 100%
 * 
 * ฟีเจอร์:
 * - Hero + Search Bar
 * - Quick Actions (4 การ์ด)
 * - งานล่าสุด (โหลดจาก API)
 * - SLA Info + Contact
 * - Media โครงการ (Grid + Tabs)
 * - เลือกประเภทงาน (6 การ์ด)
 * - เคล็ดลับ (Dark Background)
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Badge from '@shared/components/Badge';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useAuthStore } from '@core/stores/authStore';
import { api } from '@shared/services/apiService';

// Icons
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    PhotoIcon,
    QuestionMarkCircleIcon,
    PhoneIcon,
    EnvelopeIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    ChevronRightIcon,
    VideoCameraIcon,
    PrinterIcon,
    ShareIcon,
    ComputerDesktopIcon,
    CalendarDaysIcon,
    DocumentIcon,
    ArchiveBoxIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

import PendingApprovalSection from '../components/PendingApprovalSection';

export default function UserPortal() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [recentJobs, setRecentJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeProject, setActiveProject] = useState(0);

    // โหลดงานล่าสุด (My Requests)
    useEffect(() => {
        const loadJobs = async () => {
            try {
                // Focus on "My Requests" for this section
                const jobs = await api.getJobs({ role: 'requester' });
                setRecentJobs(jobs.slice(0, 5));
            } catch (err) {
                console.error('Error loading jobs:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadJobs();
    }, [user]);

    // ค้นหา
    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/jobs?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    // Mock Projects
    const projects = [
        { name: 'Sena Park Grand', files: 85 },
        { name: 'Sena Villa Ratchapruek', files: 62 },
        { name: 'Sena Ecotown', files: 98 },
    ];

    // Mock Media Files
    const mediaFiles = [
        { name: 'Banner_FB_Q1_Final.jpg', type: 'JPG', size: '2.4 MB', djId: 'DJ-2024-0148', color: 'orange' },
        { name: 'Walkthrough_30sec.mp4', type: 'MP4', size: '156 MB', djId: 'DJ-2024-0142', color: 'purple', duration: '00:30' },
        { name: 'Brochure_2024.pdf', type: 'PDF', size: '8.7 MB', djId: 'DJ-2024-0145', color: 'red' },
        { name: 'LINE_Richmenu.png', type: 'PNG', size: '1.8 MB', djId: 'DJ-2024-0151', color: 'cyan' },
        { name: 'FB_Carousel_Set1.png', type: 'PNG', size: '3.1 MB', djId: 'DJ-2024-0149', color: 'pink' },
    ];

    // Job Types
    const jobTypes = [
        { id: 'online', name: 'Online Artwork', icon: PhotoIcon, color: 'rose' },
        { id: 'print', name: 'Print Artwork', icon: PrinterIcon, color: 'purple' },
        { id: 'video', name: 'Video Production', icon: VideoCameraIcon, color: 'blue' },
        { id: 'social', name: 'Social Media', icon: ShareIcon, color: 'cyan' },
        { id: 'banner', name: 'Website Banner', icon: ComputerDesktopIcon, color: 'amber' },
        { id: 'event', name: 'Event Material', icon: CalendarDaysIcon, color: 'emerald' },
    ];

    // ฟังก์ชันหา relative time
    const getRelativeTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'เมื่อสักครู่';
        if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`;
        if (diffDays === 1) return 'เมื่อวาน';
        return `${diffDays} วันที่แล้ว`;
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            {/* ============================================
          Top Navigation
          ============================================ */}
            <nav className="bg-white shadow-sm border-b border-slate-200 fixed top-0 left-0 right-0 z-10 h-16">
                <div className="max-w-6xl mx-auto px-6 h-full">
                    <div className="flex items-center justify-between h-full">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center text-white">
                                <span className="font-bold text-lg">DJ</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-slate-800 leading-tight">DJ Request Portal</h1>
                                <p className="text-xs text-slate-500">Design Job Self-Service</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link to="/jobs" className="text-slate-600 hover:text-rose-600 text-sm font-medium">My Jobs</Link>
                            <Link to="/media-portal" className="text-slate-600 hover:text-rose-600 text-sm font-medium">Media Portal</Link>
                            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                                <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-700 text-sm font-medium">
                                    {user?.displayName?.[0] || 'ส'}
                                </div>
                                <span className="text-sm text-slate-700 hidden sm:inline">
                                    {user?.displayName || 'สมชาย'} {user?.roles?.[0] || 'Requester'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ============================================
          Main Content
          ============================================ */}
            <main className="pt-16 pb-12">

                {/* Hero Section */}
                <div className="bg-gradient-to-r from-rose-600 to-rose-800 py-16">
                    <div className="max-w-6xl mx-auto px-6 text-center">
                        <h2 className="text-3xl font-bold text-white mb-4">ต้องการงาน Design อะไรวันนี้?</h2>
                        <p className="text-rose-100 mb-8">ค้นหางานเดิมหรือสร้าง Design Job ใหม่</p>

                        <div className="max-w-2xl mx-auto relative">
                            <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ค้นหา DJ ID หรือชื่องาน..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleSearch}
                                className="w-full pl-14 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-rose-300 shadow-lg bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Pending Approvals Section (Dynamic) */}
                <PendingApprovalSection />

                {/* Quick Actions Cards */}
                <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickActionCard
                            to="/create"
                            icon={<PlusIcon className="w-7 h-7 text-rose-600" />}
                            bgColor="bg-rose-100 group-hover:bg-rose-200"
                            title="สร้าง DJ ใหม่"
                            desc="เปิดงาน Design Job"
                        />
                        <QuickActionCard
                            to="/jobs"
                            icon={<ClipboardDocumentListIcon className="w-7 h-7 text-indigo-600" />}
                            bgColor="bg-indigo-100 group-hover:bg-indigo-200"
                            title="งานของฉัน"
                            desc="ดูสถานะงานทั้งหมด"
                        />
                        <QuickActionCard
                            to="/admin/job-types"
                            icon={<ClockIcon className="w-7 h-7 text-amber-600" />}
                            bgColor="bg-amber-100 group-hover:bg-amber-200"
                            title="SLA & ประเภทงาน"
                            desc="ดูเวลาดำเนินการ"
                        />
                        <QuickActionCard
                            to="/media-portal"
                            icon={<PhotoIcon className="w-7 h-7 text-emerald-600" />}
                            bgColor="bg-emerald-100 group-hover:bg-emerald-200"
                            title="Media Portal"
                            desc="คลังไฟล์งาน Design"
                        />
                    </div>
                </div>

                {/* Content Columns */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left: Recent Jobs */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-800 text-lg">งานล่าสุดของฉัน</h3>
                                <Link to="/jobs" className="text-rose-600 hover:underline text-sm">ดูทั้งหมด</Link>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">DJ ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ชื่องาน</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">อัปเดตล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                                                    <div className="animate-spin w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full mx-auto"></div>
                                                </td>
                                            </tr>
                                        ) : recentJobs.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                                                    ไม่มีงาน
                                                </td>
                                            </tr>
                                        ) : (
                                            recentJobs.map((job) => (
                                                <tr
                                                    key={job.id}
                                                    onClick={() => navigate(`/jobs/${job.id}`)}
                                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                                >
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm font-medium text-rose-600">{job.djId || `DJ-${job.id}`}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm text-slate-800">{job.subject}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge status={job.status} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm text-slate-600">{getRelativeTime(job.updatedAt || job.createdAt)}</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right: Info & Contact */}
                        <div className="space-y-6">
                            {/* SLA Info */}
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg mb-4">ระยะเวลาดำเนินการ (SLA)</h3>
                                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-slate-200">
                                    <SLAItem icon={PhotoIcon} iconColor="bg-rose-100 text-rose-600" title="Online Artwork" days="7 วันทำการ" />
                                    <SLAItem icon={PrinterIcon} iconColor="bg-purple-100 text-purple-600" title="Print Artwork" days="10 วันทำการ" />
                                    <SLAItem icon={VideoCameraIcon} iconColor="bg-blue-100 text-blue-600" title="Video Production" days="15 วันทำการ" />
                                    <SLAItem icon={ShareIcon} iconColor="bg-cyan-100 text-cyan-600" title="Social Media Content" days="3 วันทำการ" />
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-6">
                                <h4 className="font-semibold text-rose-800 mb-3 flex items-center gap-2">
                                    <QuestionMarkCircleIcon className="w-5 h-5" /> ต้องการความช่วยเหลือ?
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2 text-rose-700">
                                        <PhoneIcon className="w-4 h-4" />
                                        <span>Creative Team: 2345</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-rose-700">
                                        <EnvelopeIcon className="w-4 h-4" />
                                        <span>creative@sena.co.th</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-rose-700">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>จ-ศ, 8:30 - 17:30</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================
              Media โครงการของฉัน
              ============================================ */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-800 text-lg">Media โครงการของฉัน</h3>
                            <p className="text-sm text-slate-500">ไฟล์งานล่าสุดจากโครงการที่คุณดูแล</p>
                        </div>
                        <Link to="/media-portal" className="text-rose-600 hover:underline text-sm flex items-center gap-1">
                            ดูทั้งหมด
                            <ChevronRightIcon className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Project Tabs */}
                    <div className="flex gap-2 mb-4">
                        {projects.map((project, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveProject(idx)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeProject === idx
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                {project.name}
                            </button>
                        ))}
                    </div>

                    {/* Media Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {mediaFiles.map((file, idx) => (
                            <MediaCard key={idx} file={file} />
                        ))}
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-4 flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <ArchiveBoxIcon className="w-4 h-4" />
                            รวม 245 ไฟล์
                        </span>
                        <span className="flex items-center gap-1">
                            <DocumentIcon className="w-4 h-4" />
                            งานส่งมอบแล้ว 189 ชิ้น
                        </span>
                        <span className="flex items-center gap-1">
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            ดาวน์โหลด 1,247 ครั้ง
                        </span>
                    </div>
                </div>

                {/* ============================================
              เลือกประเภทงาน
              ============================================ */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <h3 className="font-semibold text-slate-800 text-lg mb-4">เลือกประเภทงาน</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {jobTypes.map((type) => (
                            <Link
                                key={type.id}
                                to={`/create?type=${type.id}`}
                                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition text-center group border border-slate-100"
                            >
                                <div className={`w-12 h-12 bg-${type.color}-100 rounded-xl mx-auto mb-2 flex items-center justify-center group-hover:bg-${type.color}-200 transition`}>
                                    <type.icon className={`w-6 h-6 text-${type.color}-600`} />
                                </div>
                                <p className="text-sm font-medium text-slate-700">{type.name}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ============================================
              เคล็ดลับการเปิดงาน DJ
              ============================================ */}
                <div className="max-w-6xl mx-auto px-6 mt-12 pb-8">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg">
                        <h3 className="text-xl font-bold mb-6">เคล็ดลับการเปิดงาน DJ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <TipItem num="1" title="Brief ให้ชัดเจน" desc="ระบุ Objective, Target Audience และ Key Message ให้ครบถ้วน" />
                            <TipItem num="2" title="แนบ Reference" desc="ใส่ตัวอย่างงานที่ต้องการ หรือ Link ภาพอ้างอิงเพื่อให้ทีมเข้าใจ" />
                            <TipItem num="3" title="วางแผนล่วงหน้า" desc="เปิดงานก่อน Deadline จริงอย่างน้อย 2-3 วันสำหรับการแก้ไข" />
                        </div>
                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-6">
                <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">DJ System v2.0 | SENA Development PCL</p>
                    <Link to="/" className="text-sm text-rose-600 hover:underline flex items-center gap-1">
                        <ArrowRightIcon className="w-4 h-4" />
                        Staff Dashboard
                    </Link>
                </div>
            </footer>
        </div>
    );
}

// ============================================
// Helper Components
// ============================================

function QuickActionCard({ to, icon, bgColor, title, desc }) {
    return (
        <Link to={to} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition text-center group border border-slate-100">
            <div className={`w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center transition ${bgColor}`}>
                {icon}
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500">{desc}</p>
        </Link>
    );
}

function SLAItem({ icon: Icon, iconColor, title, days }) {
    return (
        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-800">{title}</p>
                <p className="text-xs text-slate-500">{days}</p>
            </div>
        </div>
    );
}

function MediaCard({ file }) {
    const colorMap = {
        orange: 'from-orange-200 to-rose-300',
        purple: 'from-purple-200 to-purple-400',
        red: 'from-red-200 to-red-400',
        cyan: 'from-cyan-200 to-cyan-400',
        pink: 'from-pink-200 to-pink-400',
    };

    const badgeColorMap = {
        orange: 'bg-orange-500',
        purple: 'bg-purple-500',
        red: 'bg-red-500',
        cyan: 'bg-cyan-500',
        pink: 'bg-pink-500',
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
            <div className="relative h-32 bg-slate-100">
                <div className={`w-full h-full bg-gradient-to-br ${colorMap[file.color] || colorMap.cyan} flex items-center justify-center`}>
                    {file.type === 'MP4' ? (
                        <VideoCameraIcon className="w-10 h-10 text-white/80" />
                    ) : file.type === 'PDF' ? (
                        <DocumentIcon className="w-10 h-10 text-white/80" />
                    ) : (
                        <PhotoIcon className="w-10 h-10 text-white/80" />
                    )}
                </div>
                <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 ${badgeColorMap[file.color] || 'bg-cyan-500'} text-white text-xs rounded font-medium`}>
                        {file.type}
                    </span>
                </div>
                {file.duration && (
                    <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded">{file.duration}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button className="p-2 bg-white rounded-full hover:bg-slate-100" title="ดูตัวอย่าง">
                        <EyeIcon className="w-4 h-4 text-slate-700" />
                    </button>
                    <button className="p-2 bg-rose-500 rounded-full hover:bg-rose-600" title="ดาวน์โหลด">
                        <ArrowDownTrayIcon className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
            <div className="p-3">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{file.djId} | {file.size}</p>
            </div>
        </div>
    );
}

function TipItem({ num, title, desc }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                {num}
            </div>
            <div>
                <h4 className="font-semibold mb-1 text-white">{title}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
