/**
 * @file MarketingPortal.jsx
 * @description หน้าจอหลักสำหรับฝ่ายการตลาด (Marketing/Requester Portal)
 * 
 * วัตถุประสงค์หลัก:
 * - ให้ช่องทางการเข้าถึงการสร้างงานออกแบบใหม่ (Create DJ) ได้อย่างรวดเร็ว
 * - แสดงรายการงานล่าสุดที่ผู้ใช้เป็นเจ้าของ เพื่อติดตามสถานะ
 * - ให้ข้อมูลความรู้และเคล็ดลับ (Tips) ในการสั่งงานออกแบบให้มีประสิทธิภาพ
 * - เชื่อมโยงไปยังคลังสื่อ (Media Portal) สำหรับโครงการที่ดูแลอยู่
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
    /** ข้อมูลผู้ใช้งานปัจจุบันจาก store */
    const { user } = useAuthStore();

    // === สถานะข้อมูล (Data States) ===
    const [recentJobs, setRecentJobs] = useState([]);    // รายการงาน 4 รายการล่าสุดที่เป็นเจ้าของ
    const [isLoading, setIsLoading] = useState(true);   // สถานะการโหลดข้อมูล
    const [searchQuery, setSearchQuery] = useState(''); // คำค้นหา
    const [activeProject, setActiveProject] = useState(0); // ลำดับโครงการที่กำลังเลือกในส่วน Media

    // Quick Actions สำหรับ Marketing
    /** รายการทางลัดการทำงาน (Quick Action Cards) */
    const actions = [
        {
            to: '/create',
            icon: <PlusIcon className="w-7 h-7 text-rose-600" />,
            bgColor: 'bg-rose-100 group-hover:bg-rose-200',
            title: 'สร้าง DJ ใหม่',
            desc: 'เปิดใบสั่งงานออกแบบใหม่'
        },
        {
            to: '/jobs',
            icon: <ClipboardDocumentListIcon className="w-7 h-7 text-indigo-600" />,
            bgColor: 'bg-indigo-100 group-hover:bg-indigo-200',
            title: 'งานของฉัน',
            desc: 'ตรวจสอบและติดตามสถานะงานทั้งหมด'
        },
        {
            to: '/admin/job-types',
            icon: <ClockIcon className="w-7 h-7 text-amber-600" />,
            bgColor: 'bg-amber-100 group-hover:bg-amber-200',
            title: 'SLA & ประเภทงาน',
            desc: 'ดูเป้าหมายเวลาการทำงานตามประเภท'
        },
        {
            to: '/media-portal',
            icon: <PhotoIcon className="w-7 h-7 text-emerald-600" />,
            bgColor: 'bg-emerald-100 group-hover:bg-emerald-200',
            title: 'ศูนย์จัดการสื่อ',
            desc: 'คลังไฟล์งานออกแบบที่เสร็จสิ้นแล้ว'
        }
    ];

    /** โหลดรายการงานล่าสุดที่ผู้ใช้คนนี้เป็นผู้สั่งงาน (Requester) */
    useEffect(() => {
        const loadJobs = async () => {
            try {
                const jobs = await api.getJobs();
                // Filter: แสดงเฉพาะงานที่ผู้ใช้งานปัจจุบันเป็นคนสร้าง (หรือ "สมหญิง" ในกรณี Mock)
                const filtered = jobs.filter(j =>
                    j.requesterName === 'สมหญิง' || j.requesterId === user?.id
                );
                // แสดงเพียง 4 รายการล่าสุดบนหน้า Portal
                setRecentJobs(filtered.slice(0, 4));
            } catch (err) {
                console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', err);
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

                {/* ส่วนเลือกประเภทงาน (Job Types Highlights) */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <h3 className="font-semibold text-slate-800 text-lg mb-4">เลือกประเภทงานเพื่อเริ่มต้น</h3>
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

                {/* ส่วนคำแนะนำ (Tips Section) */}
                <div className="max-w-6xl mx-auto px-6 mt-12 pb-8">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg">
                        <h3 className="text-xl font-bold mb-6">เคล็ดลับการเปิดงาน DJ ให้ได้งานตรงใจ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <TipItem num="1" title="Brief ชัดเจน" desc="ระบุวัตถุประสงค์ (Objective), กลุ่มเป้าหมาย และข้อความที่ต้องการเน้น" />
                            <TipItem num="2" title="แนบตัวอย่าง (Reference)" desc="ใส่ตัวอย่างงานประกอบหรือลิงก์อ้างอิง เพื่อให้ดีไซน์เนอร์เห็นภาพ" />
                            <TipItem num="3" title="วางแผนล่วงหน้า" desc="ควรเปิดงานก่อนกำหนดส่ง (Deadline) อย่างน้อย 2-3 วันทำการ" />
                        </div>
                    </div>
                </div>
            </main>

            <PortalFooter />
        </div>
    );
}

/**
 * MediaCard: การ์ดแสดงผลไฟล์สื่อในโครงการ
 * @param {object} props
 * @param {object} props.file - ข้อมูลไฟล์สื่อ
 */
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-rose-300 transition-colors">
            <div className="relative h-28 bg-slate-100">
                <div className={`w-full h-full bg-gradient-to-br ${colorMap[file.color]} flex items-center justify-center`}>
                    {file.type === 'MP4' ? <VideoCameraIcon className="w-8 h-8 text-white/80" /> :
                        file.type === 'PDF' ? <DocumentIcon className="w-8 h-8 text-white/80" /> :
                            <PhotoIcon className="w-8 h-8 text-white/80" />}
                </div>
                <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 ${badgeColorMap[file.color]} text-white text-xs rounded font-medium shadow-sm`}>{file.type}</span>
                </div>
                {file.duration && (
                    <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded">{file.duration}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button className="p-2 bg-white rounded-full hover:bg-slate-100" title="ดูภาพขยาย"><EyeIcon className="w-4 h-4 text-slate-700" /></button>
                    <button className="p-2 bg-rose-500 rounded-full hover:bg-rose-600" title="ดาวน์โหลดไฟล์"><ArrowDownTrayIcon className="w-4 h-4 text-white" /></button>
                </div>
            </div>
            <div className="p-2">
                <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>{file.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{file.djId} • {file.size}</p>
            </div>
        </div>
    );
}

/**
 * TipItem: คอมโพเน็นต์แสดงรายการเคล็ดลับ
 * @param {object} props
 * @param {string} props.num - ลำดับที่
 * @param {string} props.title - หัวข้อเคล็ดลับ
 * @param {string} props.desc - คำอธิบายรายละเอียด
 */
function TipItem({ num, title, desc }) {
    return (
        <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold shadow-sm">{num}</div>
            <div>
                <h4 className="font-semibold text-white mb-1">{title}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
