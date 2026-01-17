/**
 * @file UserPortal.jsx
 * @description หน้า User Portal (Self-Service)
 * 
 * Senior Programmer Notes:
 * - หน้า Landing สำหรับ Users ทั่วไป (Requesters)
 * - Layout แยกต่างหากจาก Admin Dashboard (Top Nav, No Sidebar)
 * - เน้น Quick Actions และ Search
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/common/Button';

// Icons
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ListBulletIcon,
    ClockIcon,
    PhotoIcon,
    QuestionMarkCircleIcon,
    UserIcon,
    PhoneIcon,
    EnvelopeIcon
} from '@heroicons/react/24/outline';

export default function UserPortal() {
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
                                    ส
                                </div>
                                <span className="text-sm text-slate-700 hidden sm:inline">สมชาย Marketing</span>
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
                                className="w-full pl-14 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-rose-300 shadow-lg text-slate-800"
                            />
                        </div>
                    </div>
                </div>

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
                            icon={<ListBulletIcon className="w-7 h-7 text-indigo-600" />}
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
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">อัปเดต</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <JobRow id="DJ-2024-0156" title="Banner Facebook Q1 Campaign" status="In Progress" statusColor="bg-blue-100 text-blue-700" time="2 ชม. ที่แล้ว" />
                                        <JobRow id="DJ-2024-0157" title="IG Story เปิดตัวโปรโมชั่น" status="Pending Approval" statusColor="bg-amber-100 text-amber-700" time="เมื่อวาน" />
                                        <JobRow id="DJ-2024-0158" title="VDO Walkthrough 30sec" status="Completed" statusColor="bg-emerald-100 text-emerald-700" time="3 วันที่แล้ว" />
                                        <JobRow id="DJ-2024-0155" title="Facebook Carousel Ads" status="Rework" statusColor="bg-yellow-100 text-yellow-700" time="1 ชม. ที่แล้ว" />
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right: Info & Contact */}
                        <div className="space-y-8">
                            {/* SLA Info */}
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg mb-4">ระยะเวลาดำเนินการ (SLA)</h3>
                                <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 border border-slate-200">
                                    <SLAItem iconColor="bg-rose-100 text-rose-600" title="Online Artwork" days="7 Days" />
                                    <SLAItem iconColor="bg-purple-100 text-purple-600" title="Print Artwork" days="10 Days" />
                                    <SLAItem iconColor="bg-blue-100 text-blue-600" title="Video Production" days="15 Days" />
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

                {/* Tips Section */}
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
                        <UserIcon className="w-4 h-4" />
                        Staff Dashboard
                    </Link>
                </div>
            </footer>
        </div>
    );
}

// Helpers
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

function JobRow({ id, title, status, statusColor, time }) {
    return (
        <tr className="hover:bg-slate-50 cursor-pointer transition-colors">
            <td className="px-4 py-3">
                <span className="text-sm font-medium text-rose-600">{id}</span>
            </td>
            <td className="px-4 py-3">
                <p className="text-sm text-slate-800">{title}</p>
            </td>
            <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>{status}</span>
            </td>
            <td className="px-4 py-3">
                <span className="text-sm text-slate-600">{time}</span>
            </td>
        </tr>
    );
}

function SLAItem({ iconColor, title, days }) {
    return (
        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                <ClockIcon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-800">{title}</p>
                <p className="text-xs text-slate-500">{days} working days</p>
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
