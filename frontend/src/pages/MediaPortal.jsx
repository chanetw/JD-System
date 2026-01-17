/**
 * @file MediaPortal.jsx
 * @description หน้า Media Portal (Media Portal)
 * 
 * Senior Programmer Notes:
 * - แสดงไฟล์งานที่เสร็จสมบูรณ์แยกตาม Project
 * - มี Filter สำหรับค้นหาไฟล์
 * - แสดง Stats และ Recent Files
 */

import React from 'react';
import { Card } from '@/components/common/Card';
import Button from '@/components/common/Button';
import { FormSelect } from '@/components/common/FormInput';

// Icons
import {
    MagnifyingGlassIcon,
    Squares2X2Icon,
    ListBulletIcon,
    PhotoIcon,
    DocumentIcon,
    VideoCameraIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    FolderIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

export default function MediaPortal() {
    return (
        <div className="space-y-6">
            {/* ============================================
          Page Title & Filters
          ============================================ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Media Portal</h1>
                    <p className="text-gray-500">คลังเก็บไฟล์งานที่เสร็จสมบูรณ์ พร้อมค้นหาและดาวน์โหลด</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button className="px-3 py-1.5 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700">
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
                        <button className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================================
          Stats Cards
          ============================================ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<FolderIcon className="w-5 h-5 text-rose-600" />} color="bg-rose-100" value="1,247" label="ไฟล์ทั้งหมด" />
                <StatCard icon={<Squares2X2Icon className="w-5 h-5 text-blue-600" />} color="bg-blue-100" value="28" label="โครงการ" />
                <StatCard icon={<CheckCircleIcon className="w-5 h-5 text-green-600" />} color="bg-green-100" value="856" label="งานส่งมอบแล้ว" />
                <StatCard icon={<DocumentArrowDownIcon className="w-5 h-5 text-purple-600" />} color="bg-purple-100" value="3,421" label="ดาวน์โหลด" />
            </div>

            {/* ============================================
          Filter Bar
          ============================================ */}
            <Card className="p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 mb-1">โครงการ</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                            <option value="">ทุกโครงการ</option>
                            <option value="park-grand">Sena Park Grand</option>
                            <option value="villa-ratchapruek">Sena Villa Ratchapruek</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 mb-1">ประเภทงาน</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                            <option value="">ทุกประเภท</option>
                            <option value="online">Online Artwork</option>
                            <option value="print">Print Artwork</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 mb-1">ประเภทไฟล์</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                            <option value="">ทุกประเภท</option>
                            <option value="image">รูปภาพ (JPG, PNG)</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 mb-1">ช่วงเวลา</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                            <option value="">ทั้งหมด</option>
                            <option value="7d">7 วันล่าสุด</option>
                            <option value="30d">30 วันล่าสุด</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="primary">ค้นหา</Button>
                        <Button variant="secondary">ล้างตัวกรอง</Button>
                    </div>
                </div>
            </Card>

            {/* ============================================
          Featured Projects
          ============================================ */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">โครงการล่าสุด</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <ProjectCard name="Sena Park Grand" code="SPG" textCode="SPG" count="245" color="from-rose-400 to-rose-600" tags={['Online', 'Print', '+3']} />
                    <ProjectCard name="Sena Villa Ratchapruek" code="SVR" textCode="SVR" count="189" color="from-blue-400 to-blue-600" tags={['Social', 'Video']} />
                    <ProjectCard name="Sena Ecotown" code="SET" textCode="SET" count="167" color="from-green-400 to-green-600" tags={['Event', 'Print']} />
                    <ProjectCard name="Sena Villa Pinklao" code="SVP" textCode="SVP" count="134" color="from-purple-400 to-purple-600" tags={['Online', 'Social']} />
                </div>
            </div>

            {/* ============================================
          Recent Files
          ============================================ */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">ไฟล์ล่าสุดที่ส่งมอบ</h2>
                    <Button variant="link" className="text-rose-600 hover:text-rose-700">ดูทั้งหมด</Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    <FileCard
                        name="Banner_FB_Q1_Final.jpg"
                        djId="DJ-2024-0148" size="2.4 MB" date="3 ม.ค. 68"
                        type="JPG" color="from-orange-200 to-rose-300"
                        badgeColor="bg-orange-500"
                        icon={<PhotoIcon className="w-12 h-12 text-white/80" />}
                    />
                    <FileCard
                        name="Brochure_Ecotown_2024.pdf"
                        djId="DJ-2024-0145" size="8.7 MB" date="2 ม.ค. 68"
                        type="PDF" color="from-red-200 to-red-400"
                        badgeColor="bg-red-500"
                        icon={<DocumentIcon className="w-12 h-12 text-white/80" />}
                    />
                    <FileCard
                        name="Walkthrough_ParkGrand.mp4"
                        djId="DJ-2024-0142" size="156 MB" date="1 ม.ค. 68"
                        type="MP4" color="from-purple-200 to-purple-400"
                        badgeColor="bg-purple-500"
                        icon={<VideoCameraIcon className="w-12 h-12 text-white/80" />}
                    />
                    <FileCard
                        name="IG_Story_Template.ai"
                        djId="DJ-2024-0150" size="45 MB" date="3 ม.ค. 68"
                        type="AI" color="from-amber-200 to-amber-400"
                        badgeColor="bg-amber-500"
                        icon={<DocumentIcon className="w-12 h-12 text-white/80" />}
                    />
                    <FileCard
                        name="LINE_Richmenu_v2.png"
                        djId="DJ-2024-0151" size="1.8 MB" date="3 ม.ค. 68"
                        type="PNG" color="from-cyan-200 to-cyan-400"
                        badgeColor="bg-cyan-500"
                        icon={<PhotoIcon className="w-12 h-12 text-white/80" />}
                    />
                </div>

                {/* Pagination Mock */}
                <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-500">แสดง 1-10 จาก 856 ไฟล์</p>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled>ก่อนหน้า</Button>
                        <Button variant="primary" className="!px-3">1</Button>
                        <Button variant="secondary" className="!px-3">2</Button>
                        <Button variant="secondary" className="!px-3">3</Button>
                        <span className="text-gray-400 py-2">...</span>
                        <Button variant="secondary">ถัดไป</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helpers
function StatCard({ icon, color, value, label }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
            </div>
        </div>
    );
}

function CheckCircleIcon({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function ProjectCard({ name, count, color, textCode, tags }) {
    return (
        <a href="#" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition group block">
            <div className={`h-32 bg-gradient-to-br ${color} flex items-center justify-center`}>
                <span className="text-white text-3xl font-bold">{textCode}</span>
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-rose-600 transition">{name}</h3>
                <p className="text-sm text-gray-500 mt-1">{count} ไฟล์</p>
                <div className="flex items-center gap-2 mt-2">
                    {tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tag}</span>
                    ))}
                </div>
            </div>
        </a>
    );
}

function FileCard({ name, djId, size, date, type, color, badgeColor, icon }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group">
            <div className="relative h-36 bg-gray-100">
                <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                    {icon}
                </div>
                <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 ${badgeColor} text-white text-xs rounded font-medium`}>{type}</span>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button className="p-2 bg-white rounded-full hover:bg-gray-100" title="ดูตัวอย่าง">
                        <EyeIcon className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-2 bg-rose-500 rounded-full hover:bg-rose-600" title="ดาวน์โหลด">
                        <ArrowDownTrayIcon className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
            <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate" title={name}>{name}</p>
                <p className="text-xs text-gray-500 mt-1">{djId}</p>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{size}</span>
                    <span className="text-xs text-gray-400">{date}</span>
                </div>
            </div>
        </div>
    );
}
