/**
 * @file MarketingPortal.jsx
 * @description Portal สำหรับ Marketing (Requester)
 * 
 * Quick Actions: สร้าง DJ, งานของฉัน, SLA, Media Portal
 * Sections: Jobs Table, SLA, Contact, Media Grid, Job Types, Tips
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    PlusIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    PhotoIcon,
    ChevronRightIcon,
    VideoCameraIcon,
    PrinterIcon,
    ShareIcon,
    ComputerDesktopIcon,
    CalendarDaysIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    DocumentIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/outline';

export default function MarketingPortal() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [recentJobs, setRecentJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeProject, setActiveProject] = useState(0);

    // Quick Actions สำหรับ Marketing
    const actions = [
        {
            to: '/create',
            icon: <PlusIcon className="w-7 h-7 text-rose-600" />,
            bgColor: 'bg-rose-100 group-hover:bg-rose-200',
            title: 'สร้าง DJ ใหม่',
            desc: 'เปิดงาน Design Job'
        },
        {
            to: '/jobs',
            icon: <ClipboardDocumentListIcon className="w-7 h-7 text-indigo-600" />,
            bgColor: 'bg-indigo-100 group-hover:bg-indigo-200',
            title: 'งานของฉัน',
            desc: 'ดูสถานะงานทั้งหมด'
        },
        {
            to: '/admin/job-types',
            icon: <ClockIcon className="w-7 h-7 text-amber-600" />,
            bgColor: 'bg-amber-100 group-hover:bg-amber-200',
            title: 'SLA & ประเภทงาน',
            desc: 'ดูเวลาดำเนินการ'
        },
        {
            to: '/media-portal',
            icon: <PhotoIcon className="w-7 h-7 text-emerald-600" />,
            bgColor: 'bg-emerald-100 group-hover:bg-emerald-200',
            title: 'Media Portal',
            desc: 'คลังไฟล์งาน Design'
        }
    ];

    // โหลดงานล่าสุด
    useEffect(() => {
        const loadJobs = async () => {
            try {
                const jobs = await getJobs();
                // Filter งานที่ตัวเองสร้าง
                const filtered = jobs.filter(j =>
                    j.requesterName === 'สมหญิง' || j.requesterId === user?.id
                );
                setRecentJobs(filtered.slice(0, 4));
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
            navigate(`/jobs?search=${encodeURIComponent(query)}`);
        }
    };

    // Mock Projects
    const projects = [
        { name: 'Sena Park Grand', files: 85 },
        { name: 'Sena Villa', files: 62 },
        { name: 'Sena Ecotown', files: 98 },
    ];

    // Mock Media Files
    const mediaFiles = [
        { name: 'Banner_FB_Q1.jpg', type: 'JPG', size: '2.4 MB', djId: 'DJ-0148', color: 'orange' },
        { name: 'Walkthrough.mp4', type: 'MP4', size: '156 MB', djId: 'DJ-0142', color: 'purple', duration: '00:30' },
        { name: 'Brochure.pdf', type: 'PDF', size: '8.7 MB', djId: 'DJ-0145', color: 'red' },
        { name: 'Richmenu.png', type: 'PNG', size: '1.8 MB', djId: 'DJ-0151', color: 'cyan' },
        { name: 'Carousel.png', type: 'PNG', size: '3.1 MB', djId: 'DJ-0149', color: 'pink' },
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

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <PortalNav />

            <main className="pt-16 pb-12">
                <PortalHero
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchSubmit={handleSearch}
                />

                <QuickActions actions={actions} />

                {/* Content: Jobs + SLA */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <JobsTable
                                title="งานล่าสุดของฉัน"
                                jobs={recentJobs}
                                isLoading={isLoading}
                            />
                        </div>
                        <div>
                            <SLAWidget showContact={true} />
                        </div>
                    </div>
                </div>

                {/* Media Grid */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-800 text-lg">Media โครงการของฉัน</h3>
                            <p className="text-sm text-slate-500">ไฟล์งานล่าสุดจากโครงการที่คุณดูแล</p>
                        </div>
                        <Link to="/media-portal" className="text-rose-600 hover:underline text-sm flex items-center gap-1">
                            ดูทั้งหมด <ChevronRightIcon className="w-4 h-4" />
                        </Link>
                    </div>

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

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {mediaFiles.map((file, idx) => (
                            <MediaCard key={idx} file={file} />
                        ))}
                    </div>

                    <div className="mt-4 flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><ArchiveBoxIcon className="w-4 h-4" />รวม 245 ไฟล์</span>
                        <span className="flex items-center gap-1"><DocumentIcon className="w-4 h-4" />ส่งมอบ 189 ชิ้น</span>
                        <span className="flex items-center gap-1"><ArrowDownTrayIcon className="w-4 h-4" />ดาวน์โหลด 1,247 ครั้ง</span>
                    </div>
                </div>

                {/* Job Types */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <h3 className="font-semibold text-slate-800 text-lg mb-4">เลือกประเภทงาน</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {jobTypes.map((type) => (
                            <Link
                                key={type.id}
                                to={`/create?type=${type.id}`}
                                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition text-center group border border-slate-100"
                            >
                                <div className={`w-12 h-12 bg-${type.color}-100 rounded-xl mx-auto mb-2 flex items-center justify-center`}>
                                    <type.icon className={`w-6 h-6 text-${type.color}-600`} />
                                </div>
                                <p className="text-sm font-medium text-slate-700">{type.name}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Tips */}
                <div className="max-w-6xl mx-auto px-6 mt-12 pb-8">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg">
                        <h3 className="text-xl font-bold mb-6">เคล็ดลับการเปิดงาน DJ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <TipItem num="1" title="Brief ชัดเจน" desc="ระบุ Objective, Target และ Key Message" />
                            <TipItem num="2" title="แนบ Reference" desc="ใส่ตัวอย่างงานหรือ Link อ้างอิง" />
                            <TipItem num="3" title="วางแผนล่วงหน้า" desc="เปิดงานก่อน Deadline 2-3 วัน" />
                        </div>
                    </div>
                </div>
            </main>

            <PortalFooter />
        </div>
    );
}

// Helper Components
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
            <div className="relative h-28 bg-slate-100">
                <div className={`w-full h-full bg-gradient-to-br ${colorMap[file.color]} flex items-center justify-center`}>
                    {file.type === 'MP4' ? <VideoCameraIcon className="w-8 h-8 text-white/80" /> :
                        file.type === 'PDF' ? <DocumentIcon className="w-8 h-8 text-white/80" /> :
                            <PhotoIcon className="w-8 h-8 text-white/80" />}
                </div>
                <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 ${badgeColorMap[file.color]} text-white text-xs rounded font-medium`}>{file.type}</span>
                </div>
                {file.duration && (
                    <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded">{file.duration}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button className="p-2 bg-white rounded-full hover:bg-slate-100"><EyeIcon className="w-4 h-4 text-slate-700" /></button>
                    <button className="p-2 bg-rose-500 rounded-full hover:bg-rose-600"><ArrowDownTrayIcon className="w-4 h-4 text-white" /></button>
                </div>
            </div>
            <div className="p-2">
                <p className="text-xs font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{file.djId} | {file.size}</p>
            </div>
        </div>
    );
}

function TipItem({ num, title, desc }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">{num}</div>
            <div>
                <h4 className="font-semibold mb-1">{title}</h4>
                <p className="text-sm text-slate-300">{desc}</p>
            </div>
        </div>
    );
}
